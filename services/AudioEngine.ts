import { BacteriaType, AudioDebugParams, XYMapping } from '../types';

interface ActiveNodes {
  source?: AudioBufferSourceNode;
  masterGain?: GainNode;
  filter?: BiquadFilterNode;
  delay?: DelayNode;
  feedback?: GainNode;
  distortion?: WaveShaperNode;
  dryGain?: GainNode;
  wetGain?: GainNode;
}

export class AudioEngine {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private currentSource: AudioBufferSourceNode | null = null;
  public audioBuffer: AudioBuffer | null = null; // Made public for sampling
  
  // Reverb Impulse Response Cache
  private impulseBuffer: AudioBuffer | null = null;

  // Track active nodes for realtime manipulation
  private activeNodes: ActiveNodes = {};

  constructor() {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      this.context = new AudioContext();
    }
  }

  async init(): Promise<void> {
    if (this.context?.state === 'suspended') {
      await this.context.resume();
    }
    // Pre-generate reverb impulse
    if (this.context && !this.impulseBuffer) {
      this.impulseBuffer = this.buildImpulseResponse(2, 2, false);
    }
  }

  async startRecording(onVisualData: (dataArray: Uint8Array) => void): Promise<void> {
    if (!this.context) return;
    
    if (this.context.state === 'suspended') await this.context.resume();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Create Analyser for visuals
    const source = this.context.createMediaStreamSource(stream);
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);

    // Setup visual loop
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    const updateVisuals = () => {
      if (this.analyser) {
        this.analyser.getByteFrequencyData(dataArray);
        onVisualData(dataArray);
        requestAnimationFrame(updateVisuals);
      }
    };
    updateVisuals();

    // Setup Recorder
    this.audioChunks = [];
    this.mediaRecorder = new MediaRecorder(stream);
    
    this.mediaRecorder.ondataavailable = (event) => {
      this.audioChunks.push(event.data);
    };

    this.mediaRecorder.start();
  }

  async stopRecording(): Promise<AudioBuffer | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const arrayBuffer = await audioBlob.arrayBuffer();
        if (this.context) {
          try {
             this.audioBuffer = await this.context.decodeAudioData(arrayBuffer);
          } catch(e) {
             console.warn("Buffer decode failed, likely empty");
          }
        }
        
        if (this.analyser) {
          this.analyser.disconnect();
          this.analyser = null;
        }
        
        this.mediaRecorder?.stream.getTracks().forEach(track => track.stop());
        resolve(this.audioBuffer);
      };

      this.mediaRecorder.stop();
    });
  }

  play(
      type: BacteriaType, 
      onEnded: () => void, 
      intensity: number = 0.5,
      debugParams?: AudioDebugParams,
      overrideBuffer?: AudioBuffer
  ): void {
    const bufferToPlay = overrideBuffer || this.audioBuffer;

    if (!this.context || !bufferToPlay) {
        onEnded();
        return;
    }

    // Stop previous if exists
    if (this.currentSource) {
        try { this.currentSource.stop(); } catch(e) {}
    }

    // Clean active nodes ref
    this.activeNodes = {};

    const source = this.context.createBufferSource();
    source.buffer = bufferToPlay;
    this.currentSource = source;
    this.activeNodes.source = source;

    const masterGain = this.context.createGain();
    this.activeNodes.masterGain = masterGain;

    let chainStart: AudioNode = source;
    
    // -- FX CHAINS --

    if (type === BacteriaType.DEBUG && debugParams) {
        // FULL CUSTOM CHAIN
        // Source -> Distortion -> Filter -> Delay -> Reverb -> Master
        
        // 1. Distortion
        const dist = this.context.createWaveShaper();
        dist.curve = this.makeDistortionCurve(debugParams.distortionAmount);
        dist.oversample = '4x';
        this.activeNodes.distortion = dist;
        
        // 2. Filter
        const filter = this.context.createBiquadFilter();
        filter.type = debugParams.filterType;
        filter.frequency.value = debugParams.filterFreq;
        this.activeNodes.filter = filter;

        // 3. Delay
        const delay = this.context.createDelay();
        delay.delayTime.value = debugParams.delayTime;
        const feedback = this.context.createGain();
        feedback.gain.value = debugParams.feedbackGain;
        this.activeNodes.delay = delay;
        this.activeNodes.feedback = feedback;

        // 4. Reverb
        const convolver = this.context.createConvolver();
        if (this.impulseBuffer) convolver.buffer = this.impulseBuffer;
        const wetGain = this.context.createGain();
        wetGain.gain.value = debugParams.reverbMix;
        const dryGain = this.context.createGain();
        dryGain.gain.value = 1.0 - debugParams.reverbMix;
        this.activeNodes.wetGain = wetGain;
        this.activeNodes.dryGain = dryGain;

        // Connection Graph
        // Pitch
        source.playbackRate.value = debugParams.playbackRate;
        source.detune.value = debugParams.detune;

        // Dist -> Filter
        chainStart.connect(dist);
        dist.connect(filter);
        
        // Filter -> Delay input
        const delayInput = filter;
        
        // Delay Logic
        delayInput.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        
        // Mix point for Reverb
        const reverbInput = this.context.createGain(); // Merge delay and dry signal
        delayInput.connect(reverbInput);
        delay.connect(reverbInput);
        
        // Reverb Logic
        reverbInput.connect(dryGain);
        dryGain.connect(masterGain);
        
        reverbInput.connect(convolver);
        convolver.connect(wetGain);
        wetGain.connect(masterGain);

    } else {
        // STANDARD PRESETS
        switch (type) {
        case BacteriaType.HELIUM:
            source.playbackRate.value = 1.5 + (intensity * 0.5);
            chainStart.connect(masterGain);
            break;

        case BacteriaType.TITAN:
            source.playbackRate.value = 0.7 - (intensity * 0.2);
            const lowpass = this.context.createBiquadFilter();
            lowpass.type = 'lowpass';
            lowpass.frequency.value = 800;
            this.activeNodes.filter = lowpass;
            chainStart.connect(lowpass);
            lowpass.connect(masterGain);
            break;

        case BacteriaType.ECHO:
            const delay = this.context.createDelay();
            delay.delayTime.value = 0.3;
            const feedback = this.context.createGain();
            feedback.gain.value = 0.4 + (intensity * 0.4);
            
            this.activeNodes.delay = delay;
            this.activeNodes.feedback = feedback;
            
            chainStart.connect(masterGain);
            chainStart.connect(delay);
            delay.connect(feedback);
            feedback.connect(delay);
            delay.connect(masterGain);
            break;

        case BacteriaType.FUZZY:
            const dist = this.context.createWaveShaper();
            dist.curve = this.makeDistortionCurve(400 * intensity);
            dist.oversample = '4x';
            this.activeNodes.distortion = dist;
            
            const bandpass = this.context.createBiquadFilter();
            bandpass.type = 'bandpass';
            bandpass.frequency.value = 1000;
            this.activeNodes.filter = bandpass;

            chainStart.connect(dist);
            dist.connect(bandpass);
            bandpass.connect(masterGain);
            break;

        case BacteriaType.CAVE:
            const convolver = this.context.createConvolver();
            if (this.impulseBuffer) convolver.buffer = this.impulseBuffer;
            const dryGain = this.context.createGain();
            const wetGain = this.context.createGain();
            dryGain.gain.value = 0.5;
            wetGain.gain.value = 1.0;
            
            this.activeNodes.dryGain = dryGain;
            this.activeNodes.wetGain = wetGain;

            chainStart.connect(dryGain);
            dryGain.connect(masterGain);

            chainStart.connect(convolver);
            convolver.connect(wetGain);
            wetGain.connect(masterGain);
            break;
            
        default:
            chainStart.connect(masterGain);
            break;
        }
    }

    masterGain.connect(this.context.destination);

    // Visuals
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 256;
    masterGain.connect(this.analyser);

    source.onended = () => {
      onEnded();
    };

    source.start();
  }

  // Called when dragging the bacteria
  setEffectIntensity(type: BacteriaType, intensity: number): void {
      if (!this.context) return;
      const t = this.context.currentTime;
      const smooth = 0.1;

      switch(type) {
          case BacteriaType.HELIUM:
              if (this.activeNodes.source) {
                  this.activeNodes.source.playbackRate.setTargetAtTime(1.5 + intensity, t, smooth);
              }
              break;
          case BacteriaType.TITAN:
              if (this.activeNodes.source) {
                  this.activeNodes.source.playbackRate.setTargetAtTime(0.7 - (intensity * 0.3), t, smooth);
              }
              if (this.activeNodes.filter) {
                  this.activeNodes.filter.frequency.setTargetAtTime(800 - (intensity * 400), t, smooth);
              }
              break;
          case BacteriaType.ECHO:
               if (this.activeNodes.feedback) {
                   this.activeNodes.feedback.gain.setTargetAtTime(0.4 + (intensity * 0.5), t, smooth);
               }
               if (this.activeNodes.delay) {
                   this.activeNodes.delay.delayTime.setTargetAtTime(0.3 - (intensity * 0.2), t, smooth);
               }
               break;
           case BacteriaType.FUZZY:
               if (this.activeNodes.distortion) {
                   this.activeNodes.distortion.curve = this.makeDistortionCurve(400 + (intensity * 1000));
               }
               if (this.activeNodes.filter) {
                   this.activeNodes.filter.frequency.setTargetAtTime(1000 + (intensity * 2000), t, smooth);
               }
               break;
            case BacteriaType.CAVE:
                if (this.activeNodes.wetGain) {
                    this.activeNodes.wetGain.gain.setTargetAtTime(1.0 + intensity, t, smooth);
                }
                break;
      }
  }

  setXYModulation(x: number, y: number, mapping: XYMapping, baseParams: AudioDebugParams): void {
      if (!this.context) return;
      const t = this.context.currentTime;
      const smooth = 0.05;

      const lerp = (min: number, max: number, val: number) => min + (val * (max - min));

      const applyToParam = (paramKey: keyof AudioDebugParams | 'none', inputVal: number, min: number, max: number) => {
        if (paramKey === 'none') return;
        
        const calculatedVal = lerp(min, max, inputVal);

        switch (paramKey) {
          case 'playbackRate':
             if (this.activeNodes.source) this.activeNodes.source.playbackRate.setTargetAtTime(calculatedVal, t, smooth);
             break;
          case 'detune':
             if (this.activeNodes.source) this.activeNodes.source.detune.setTargetAtTime(calculatedVal, t, smooth);
             break;
          case 'filterFreq':
             if (this.activeNodes.filter) this.activeNodes.filter.frequency.setTargetAtTime(calculatedVal, t, smooth);
             break;
          case 'delayTime':
             if (this.activeNodes.delay) this.activeNodes.delay.delayTime.setTargetAtTime(calculatedVal, t, smooth);
             break;
          case 'feedbackGain':
             if (this.activeNodes.feedback) this.activeNodes.feedback.gain.setTargetAtTime(calculatedVal, t, smooth);
             break;
          case 'distortionAmount':
             if (this.activeNodes.distortion) this.activeNodes.distortion.curve = this.makeDistortionCurve(calculatedVal);
             break;
          case 'reverbMix':
             if (this.activeNodes.wetGain) this.activeNodes.wetGain.gain.setTargetAtTime(calculatedVal, t, smooth);
             if (this.activeNodes.dryGain) this.activeNodes.dryGain.gain.setTargetAtTime(1.0 - calculatedVal, t, smooth);
             break;
        }
      };

      applyToParam(mapping.xParam, x, mapping.xMin, mapping.xMax);
      applyToParam(mapping.yParam, y, mapping.yMin, mapping.yMax);
  }

  // Called from Debug Panel - Direct Update
  setDebugParams(params: AudioDebugParams): void {
      if (!this.context) return;
      const t = this.context.currentTime;
      const smooth = 0.05;

      if (this.activeNodes.source) {
          this.activeNodes.source.playbackRate.setTargetAtTime(params.playbackRate, t, smooth);
          this.activeNodes.source.detune.setTargetAtTime(params.detune, t, smooth);
      }
      if (this.activeNodes.filter) {
          this.activeNodes.filter.type = params.filterType;
          this.activeNodes.filter.frequency.setTargetAtTime(params.filterFreq, t, smooth);
      }
      if (this.activeNodes.delay) {
          this.activeNodes.delay.delayTime.setTargetAtTime(params.delayTime, t, smooth);
      }
      if (this.activeNodes.feedback) {
          this.activeNodes.feedback.gain.setTargetAtTime(params.feedbackGain, t, smooth);
      }
      if (this.activeNodes.distortion) {
          this.activeNodes.distortion.curve = this.makeDistortionCurve(params.distortionAmount);
      }
      if (this.activeNodes.wetGain) {
          this.activeNodes.wetGain.gain.setTargetAtTime(params.reverbMix, t, smooth);
      }
      if (this.activeNodes.dryGain) {
          this.activeNodes.dryGain.gain.setTargetAtTime(1.0 - params.reverbMix, t, smooth);
      }
  }

  playVaccineExplosion(onEnded: () => void): void {
    if (!this.context || !this.audioBuffer) {
      onEnded();
      return;
    }

    const t = this.context.currentTime;
    
    // 1. POP
    const osc = this.context.createOscillator();
    const oscGain = this.context.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.1);
    
    oscGain.gain.setValueAtTime(1, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    osc.connect(oscGain);
    oscGain.connect(this.context.destination);
    osc.start(t);
    osc.stop(t + 0.3);

    // 2. Chipmunk Loop
    const duration = 0.2; 
    const source = this.context.createBufferSource();
    source.buffer = this.audioBuffer;
    source.playbackRate.value = 3.0; 
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = duration;
    
    const remixGain = this.context.createGain();
    remixGain.gain.setValueAtTime(0.8, t);
    remixGain.gain.linearRampToValueAtTime(0, t + 1.5); 

    source.connect(remixGain);
    remixGain.connect(this.context.destination);
    source.start(t);
    source.stop(t + 1.5);
    
    setTimeout(onEnded, 1500);
  }

  private makeDistortionCurve(amount: number): Float32Array {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    let x;
    for (let i = 0; i < n_samples; ++i) {
      x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  private buildImpulseResponse(duration: number, decay: number, reverse: boolean): AudioBuffer {
    const sampleRate = this.context!.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.context!.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = reverse ? length - i : i;
      left[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
      right[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
    }
    return impulse;
  }
}