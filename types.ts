export enum BacteriaType {
  HELIUM = 'HELIUM', // Pitch High
  TITAN = 'TITAN',   // Pitch Low
  ECHO = 'ECHO',     // Delay
  FUZZY = 'FUZZY',   // Distortion
  CAVE = 'CAVE',     // Reverb
  DEBUG = 'DEBUG',   // Experimental Mode
}

export interface BacteriaConfig {
  id: BacteriaType;
  name: string;
  description: string;
  color: string; // Hex for canvas
  secondaryColor: string;
  bgGradient: string; // Tailwind class
  eyeType: 'round' | 'squint' | 'crazy';
  mouthType: 'smile' | 'tooth' | 'o';
}

export enum AppState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  PLAYING = 'PLAYING',
  VACCINATING = 'VACCINATING', // The sequence begins
  EXPLODING = 'EXPLODING',
  EXPLODED = 'EXPLODED',
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  size: number;
}

export type BiquadFilterType = 'lowpass' | 'highpass' | 'bandpass' | 'lowshelf' | 'highshelf' | 'peaking' | 'notch' | 'allpass';

export interface AudioDebugParams {
  playbackRate: number;
  detune: number;
  filterFreq: number;
  filterType: BiquadFilterType;
  delayTime: number;
  feedbackGain: number;
  distortionAmount: number;
  reverbMix: number;
}

export interface RecordingConfig {
  silenceThreshold: number; // 0-255
  silenceDelay: number; // ms
  maxDuration: number; // ms
}

export interface AudioSample {
  id: string;
  name: string;
  buffer: AudioBuffer;
  timestamp: number;
}

export interface Preset {
  name: string;
  params: AudioDebugParams;
}

export interface XYMapping {
  xParam: keyof AudioDebugParams | 'none';
  yParam: keyof AudioDebugParams | 'none';
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}