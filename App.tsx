import React, { useState, useEffect, useRef } from 'react';
import { BacteriaType, AppState, AudioDebugParams, RecordingConfig, AudioSample, Preset, XYMapping } from './types';
import { BACTERIA_DATA } from './constants';
import { AudioEngine } from './services/AudioEngine';
import BlobVisualizer from './components/BlobVisualizer';
import { Controls } from './components/Controls';
import { DebugPanel } from './components/DebugPanel';

const App: React.FC = () => {
  const [currentBacteria, setCurrentBacteria] = useState<BacteriaType>(BacteriaType.HELIUM);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [analyserData, setAnalyserData] = useState<Uint8Array>(new Uint8Array(0));
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [showStart, setShowStart] = useState(true);

  // --- DEBUG / ADVANCED STATE ---
  const [debugParams, setDebugParams] = useState<AudioDebugParams>({
    playbackRate: 1.0,
    detune: 0,
    filterFreq: 1000,
    filterType: 'lowpass',
    delayTime: 0.3,
    feedbackGain: 0.4,
    distortionAmount: 50,
    reverbMix: 0.2
  });

  const [recConfig, setRecConfig] = useState<RecordingConfig>({
      silenceThreshold: 15,
      silenceDelay: 1000,
      maxDuration: 5000
  });

  const [samples, setSamples] = useState<AudioSample[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  
  const [xyMapping, setXYMapping] = useState<XYMapping>({
      xParam: 'none',
      xMin: 0,
      xMax: 1,
      yParam: 'none',
      yMin: 0,
      yMax: 1
  });

  // Track the raw buffer for display/saving
  const [lastRecordedBuffer, setLastRecordedBuffer] = useState<AudioBuffer | null>(null);

  const audioRef = useRef<AudioEngine | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);
  const maxRecTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    audioRef.current = new AudioEngine();
    return () => {};
  }, []);

  // Update Debug Params in Realtime
  useEffect(() => {
    if (currentBacteria === BacteriaType.DEBUG && audioRef.current) {
      audioRef.current.setDebugParams(debugParams);
    }
  }, [debugParams, currentBacteria]);

  const handleStart = async () => {
    try {
      if (!audioRef.current) return;
      await audioRef.current.init();
      startMonitoring();
      setPermissionGranted(true);
      setShowStart(false);
    } catch (e) {
      console.error("Mic permission denied or error", e);
      alert("Microphone access is required for this app to work.");
    }
  };

  const startMonitoring = () => {
    if (!audioRef.current) return;
    
    audioRef.current.startRecording((data) => {
      setAnalyserData(new Uint8Array(data)); 
    });
  };

  const volumeRef = useRef(0);
  useEffect(() => {
    if (analyserData.length > 0) {
      volumeRef.current = analyserData.reduce((a, b) => a + b, 0) / analyserData.length;
    }
  }, [analyserData]);

  // --- RECORDING LOGIC ---
  useEffect(() => {
    if (!permissionGranted || appState === AppState.PLAYING || appState === AppState.VACCINATING || appState === AppState.EXPLODING) return;

    const checkAudioLevels = () => {
      if (appState === AppState.IDLE && volumeRef.current > recConfig.silenceThreshold) {
        setAppState(AppState.RECORDING);
        // Set Max Duration Timeout
        maxRecTimeoutRef.current = window.setTimeout(() => {
            finishRecordingAndPlay();
        }, recConfig.maxDuration);
      } 
      
      if (appState === AppState.RECORDING) {
        if (volumeRef.current < recConfig.silenceThreshold) {
           if (!silenceTimeoutRef.current) {
             silenceTimeoutRef.current = window.setTimeout(() => {
               finishRecordingAndPlay();
               silenceTimeoutRef.current = null;
             }, recConfig.silenceDelay);
           }
        } else {
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
        }
      }
    };

    const interval = setInterval(checkAudioLevels, 100);
    return () => {
        clearInterval(interval);
        if(silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        if(maxRecTimeoutRef.current) clearTimeout(maxRecTimeoutRef.current);
    }
  }, [appState, permissionGranted, recConfig]);


  const finishRecordingAndPlay = async () => {
    if (!audioRef.current) return;
    
    // Clear timeouts
    if(silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    if(maxRecTimeoutRef.current) clearTimeout(maxRecTimeoutRef.current);

    setAppState(AppState.PROCESSING);
    
    const buffer = await audioRef.current.stopRecording();
    setLastRecordedBuffer(buffer);
    
    playBuffer(buffer);
  };

  const playBuffer = (buffer: AudioBuffer | null) => {
      if(!audioRef.current) return;
      setAppState(AppState.PLAYING);

      audioRef.current.play(
        currentBacteria, 
        () => {
            setAppState(AppState.IDLE);
            startMonitoring();
        },
        0.0, // Initial intensity
        currentBacteria === BacteriaType.DEBUG ? debugParams : undefined,
        buffer || undefined
    );
  };

  const handleVaccine = () => {
    if (appState === AppState.VACCINATING || appState === AppState.EXPLODING) return;
    setAppState(AppState.VACCINATING);
    setTimeout(() => {
      setAppState(AppState.EXPLODING);
      if (audioRef.current) {
        audioRef.current.playVaccineExplosion(() => {
           setAppState(AppState.EXPLODED);
           setTimeout(() => {
              setAppState(AppState.IDLE);
              if (audioRef.current) startMonitoring();
           }, 2000);
        });
      }
    }, 2000); 
  };
  
  // Interaction from Blob (Touch/Drag)
  const handleInteraction = (intensity: number) => {
      // Only modulate if playing and NOT using XY pad for same purpose
      if (appState === AppState.PLAYING && audioRef.current && currentBacteria !== BacteriaType.DEBUG) {
          audioRef.current.setEffectIntensity(currentBacteria, intensity);
      }
  };

  // XY Modulation (Global Mouse Move)
  const handleMouseMove = (e: React.MouseEvent) => {
      if (currentBacteria === BacteriaType.DEBUG && appState === AppState.PLAYING && audioRef.current) {
          // Calculate normalized X Y (0 to 1)
          const x = e.clientX / window.innerWidth;
          const y = 1.0 - (e.clientY / window.innerHeight); // Y up is 1
          
          audioRef.current.setXYModulation(x, y, xyMapping, debugParams);
      }
  };

  // --- SAMPLE & PRESET HANDLERS ---
  const handleSaveSample = (name: string) => {
      if (lastRecordedBuffer) {
          setSamples([...samples, {
              id: Date.now().toString(),
              name,
              buffer: lastRecordedBuffer,
              timestamp: Date.now()
          }]);
      }
  };

  const handlePlaySample = async (sample: AudioSample) => {
      // If we are idle, we can trigger play immediately
      if (appState === AppState.IDLE && audioRef.current) {
          // We need to stop monitoring momentarily to play
          // But startRecording was async... handled by play's onEnded callback restarting monitor
          // Actually, we should just stop monitoring current stream to avoid feedback loop if we were
          // routing audio back, but we aren't routing mic to speaker directly.
          
          // However, we want to simulate the "Finish recording" flow
          await audioRef.current.stopRecording(); // Just in case
          playBuffer(sample.buffer);
      }
  };

  const handleSavePreset = (name: string) => {
      setPresets([...presets, { name, params: { ...debugParams } }]);
  };

  const handleLoadPreset = (preset: Preset) => {
      setDebugParams({ ...preset.params });
  };


  return (
    <div 
        className={`relative w-full h-screen bg-gradient-to-br ${BACTERIA_DATA[currentBacteria].bgGradient} blob-transition overflow-hidden`}
        onMouseMove={handleMouseMove}
    >
      
      {showStart && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="text-center p-8 bg-white text-slate-900 rounded-3xl shadow-2xl max-w-sm mx-4">
            <h1 className="text-4xl font-bold mb-4 text-purple-600">Talking Bacteria</h1>
            <p className="mb-6 text-lg">
              Ces créatures mangent le son !<br/>
              Autorise le micro, parle, et écoute leur réaction.
            </p>
            <button 
              onClick={handleStart}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-full text-xl shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              Jouer
            </button>
          </div>
        </div>
      )}

      {/* Debug Panel */}
      {currentBacteria === BacteriaType.DEBUG && !showStart && (
          <DebugPanel 
            params={debugParams} 
            onChangeParams={setDebugParams}
            recConfig={recConfig}
            onChangeRecConfig={setRecConfig}
            samples={samples}
            onSaveSample={handleSaveSample}
            onPlaySample={handlePlaySample}
            presets={presets}
            onSavePreset={handleSavePreset}
            onLoadPreset={handleLoadPreset}
            xyMapping={xyMapping}
            onUpdateXY={setXYMapping}
            lastBuffer={lastRecordedBuffer}
          />
      )}

      <div className="absolute top-4 left-0 right-0 text-center z-20 pointer-events-none">
        <span className={`
          inline-block px-4 py-1 rounded-full text-sm font-bold tracking-wider shadow-sm transition-all duration-300
          ${appState === AppState.RECORDING ? 'bg-red-500 text-white scale-110' : 
            appState === AppState.PLAYING ? 'bg-green-500 text-white scale-110' : 
            'bg-white/20 text-white/70'}
        `}>
          {appState === AppState.IDLE && "Parle pour nourrir la bactérie..."}
          {appState === AppState.RECORDING && "Elle écoute..."}
          {appState === AppState.PLAYING && (currentBacteria === BacteriaType.DEBUG ? "Playing..." : "Touchez pour déformer !")}
          {appState === AppState.VACCINATING && "OH NON ! UN VACCIN !"}
          {appState === AppState.EXPLODING && "BOUM !"}
          {appState === AppState.EXPLODED && "..."}
        </span>
      </div>

      <div className="absolute inset-0 z-10">
        <BlobVisualizer 
          config={BACTERIA_DATA[currentBacteria]} 
          appState={appState}
          analyserData={analyserData}
          onInteraction={handleInteraction}
        />
      </div>

      {!showStart && (
        <Controls 
          currentBacteria={currentBacteria}
          onSelectBacteria={setCurrentBacteria}
          appState={appState}
          onVaccinate={handleVaccine}
        />
      )}
    </div>
  );
};

export default App;