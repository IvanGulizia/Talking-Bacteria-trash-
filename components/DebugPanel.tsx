import React, { useState } from 'react';
import { AudioDebugParams, RecordingConfig, AudioSample, Preset, XYMapping } from '../types';
import { WaveformDisplay } from './WaveformDisplay';

interface DebugPanelProps {
  params: AudioDebugParams;
  onChangeParams: (newParams: AudioDebugParams) => void;
  recConfig: RecordingConfig;
  onChangeRecConfig: (newConfig: RecordingConfig) => void;
  samples: AudioSample[];
  onSaveSample: (name: string) => void;
  onPlaySample: (sample: AudioSample) => void;
  presets: Preset[];
  onSavePreset: (name: string) => void;
  onLoadPreset: (preset: Preset) => void;
  xyMapping: XYMapping;
  onUpdateXY: (mapping: XYMapping) => void;
  lastBuffer: AudioBuffer | null;
}

type Tab = 'PARAMS' | 'LOGIC' | 'SAMPLES' | 'XY' | 'PRESETS';

export const DebugPanel: React.FC<DebugPanelProps> = ({ 
  params, onChangeParams, 
  recConfig, onChangeRecConfig,
  samples, onSaveSample, onPlaySample,
  presets, onSavePreset, onLoadPreset,
  xyMapping, onUpdateXY,
  lastBuffer
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('PARAMS');
  const [newSampleName, setNewSampleName] = useState('My Sample');
  const [newPresetName, setNewPresetName] = useState('New Preset');

  const handleParamChange = (key: keyof AudioDebugParams, value: number | string) => {
    onChangeParams({ ...params, [key]: value });
  };

  const handleRecChange = (key: keyof RecordingConfig, value: number) => {
    onChangeRecConfig({ ...recConfig, [key]: value });
  };

  const handleXYChange = (key: keyof XYMapping, value: string | number) => {
      onUpdateXY({ ...xyMapping, [key]: value });
  }

  return (
    <div className="absolute top-0 right-0 h-full w-96 bg-slate-900/95 backdrop-blur-md border-l border-slate-700 z-50 text-xs shadow-2xl flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-xl font-bold text-purple-400">Audio Lab</h3>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-slate-700 overflow-x-auto no-scrollbar">
        {(['PARAMS', 'LOGIC', 'SAMPLES', 'XY', 'PRESETS'] as Tab[]).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 px-2 text-center font-bold transition-colors ${activeTab === tab ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* --- PARAMS TAB --- */}
        {activeTab === 'PARAMS' && (
          <div className="space-y-4">
             {/* Source Control */}
            <div className="bg-slate-800 p-3 rounded-lg">
              <h4 className="font-semibold mb-2 text-white">Source</h4>
              <label className="block mb-2">
                Playback Rate: {params.playbackRate.toFixed(2)}x
                <input 
                  type="range" min="0.1" max="4.0" step="0.1"
                  value={params.playbackRate}
                  onChange={(e) => handleParamChange('playbackRate', parseFloat(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </label>
              <label className="block">
                Detune (cents): {params.detune}
                <input 
                  type="range" min="-1200" max="1200" step="50"
                  value={params.detune}
                  onChange={(e) => handleParamChange('detune', parseFloat(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </label>
            </div>

            {/* Distortion */}
            <div className="bg-slate-800 p-3 rounded-lg">
              <h4 className="font-semibold mb-2 text-orange-400">Distortion</h4>
              <label className="block">
                Amount: {params.distortionAmount}
                <input 
                  type="range" min="0" max="1000" step="10"
                  value={params.distortionAmount}
                  onChange={(e) => handleParamChange('distortionAmount', parseFloat(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </label>
            </div>

            {/* Filter */}
            <div className="bg-slate-800 p-3 rounded-lg">
              <h4 className="font-semibold mb-2 text-blue-400">Filter</h4>
              <label className="block mb-2">
                Type
                <select 
                  value={params.filterType} 
                  onChange={(e) => handleParamChange('filterType', e.target.value)}
                  className="w-full bg-slate-700 text-white p-1 rounded mt-1"
                >
                  <option value="lowpass">Lowpass</option>
                  <option value="highpass">Highpass</option>
                  <option value="bandpass">Bandpass</option>
                  <option value="notch">Notch</option>
                </select>
              </label>
              <label className="block">
                Freq: {params.filterFreq}Hz
                <input 
                  type="range" min="20" max="10000" step="100"
                  value={params.filterFreq}
                  onChange={(e) => handleParamChange('filterFreq', parseFloat(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </label>
            </div>

            {/* Delay */}
            <div className="bg-slate-800 p-3 rounded-lg">
              <h4 className="font-semibold mb-2 text-green-400">Delay</h4>
              <label className="block mb-2">
                Time: {params.delayTime.toFixed(2)}s
                <input 
                  type="range" min="0" max="2.0" step="0.05"
                  value={params.delayTime}
                  onChange={(e) => handleParamChange('delayTime', parseFloat(e.target.value))}
                  className="w-full accent-green-500"
                />
              </label>
              <label className="block">
                Feedback: {params.feedbackGain.toFixed(2)}
                <input 
                  type="range" min="0" max="0.95" step="0.05"
                  value={params.feedbackGain}
                  onChange={(e) => handleParamChange('feedbackGain', parseFloat(e.target.value))}
                  className="w-full accent-green-500"
                />
              </label>
            </div>

            {/* Reverb */}
            <div className="bg-slate-800 p-3 rounded-lg">
              <h4 className="font-semibold mb-2 text-pink-400">Reverb</h4>
              <label className="block">
                Mix: {(params.reverbMix * 100).toFixed(0)}%
                <input 
                  type="range" min="0" max="1.0" step="0.05"
                  value={params.reverbMix}
                  onChange={(e) => handleParamChange('reverbMix', parseFloat(e.target.value))}
                  className="w-full accent-pink-500"
                />
              </label>
            </div>
          </div>
        )}

        {/* --- LOGIC TAB --- */}
        {activeTab === 'LOGIC' && (
          <div className="space-y-4">
             <div className="bg-slate-800 p-3 rounded-lg">
                <h4 className="font-semibold mb-2 text-white">Recording Logic</h4>
                <p className="text-gray-400 mb-4 italic">Adjust how the bacteria listens and reacts.</p>

                <label className="block mb-4">
                    Silence Threshold: {recConfig.silenceThreshold}
                    <input 
                        type="range" min="5" max="100" step="1"
                        value={recConfig.silenceThreshold}
                        onChange={(e) => handleRecChange('silenceThreshold', parseInt(e.target.value))}
                        className="w-full accent-red-500"
                    />
                    <span className="text-[10px] text-gray-500">Lower = Sensitive, Higher = Needs Loud Voice</span>
                </label>

                <label className="block mb-4">
                    Silence Delay: {recConfig.silenceDelay}ms
                    <input 
                        type="range" min="200" max="3000" step="100"
                        value={recConfig.silenceDelay}
                        onChange={(e) => handleRecChange('silenceDelay', parseInt(e.target.value))}
                        className="w-full accent-yellow-500"
                    />
                    <span className="text-[10px] text-gray-500">Time to wait after you stop talking before replying.</span>
                </label>

                <label className="block mb-4">
                    Max Duration: {recConfig.maxDuration / 1000}s
                    <input 
                        type="range" min="2000" max="10000" step="500"
                        value={recConfig.maxDuration}
                        onChange={(e) => handleRecChange('maxDuration', parseInt(e.target.value))}
                        className="w-full accent-blue-500"
                    />
                </label>
             </div>
          </div>
        )}

        {/* --- SAMPLES TAB --- */}
        {activeTab === 'SAMPLES' && (
           <div className="space-y-4">
              <div className="bg-slate-800 p-3 rounded-lg border border-purple-500/30">
                 <h4 className="font-semibold mb-2 text-white">Current / Last Recording</h4>
                 {lastBuffer ? (
                     <>
                        <WaveformDisplay buffer={lastBuffer} />
                        <div className="flex gap-2 mt-2">
                            <input 
                                type="text" 
                                value={newSampleName} 
                                onChange={(e) => setNewSampleName(e.target.value)}
                                className="bg-slate-900 border border-slate-600 rounded px-2 py-1 flex-1"
                            />
                            <button 
                                onClick={() => onSaveSample(newSampleName)}
                                className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded"
                            >
                                Save
                            </button>
                        </div>
                     </>
                 ) : (
                     <div className="text-gray-400 py-4 text-center">No audio recorded yet. Talk to the bacteria first!</div>
                 )}
              </div>

              <div className="space-y-2">
                 <h4 className="font-semibold text-white">Saved Samples</h4>
                 {samples.length === 0 && <p className="text-gray-500">No saved samples.</p>}
                 {samples.map(sample => (
                     <div key={sample.id} className="bg-slate-800 p-2 rounded flex items-center justify-between group">
                         <div className="truncate flex-1">
                             <div className="font-bold text-slate-300">{sample.name}</div>
                             <div className="text-[10px] text-slate-500">{(sample.buffer.duration).toFixed(1)}s • {new Date(sample.timestamp).toLocaleTimeString()}</div>
                         </div>
                         <button 
                            onClick={() => onPlaySample(sample)}
                            className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded ml-2"
                         >
                            Play
                         </button>
                     </div>
                 ))}
              </div>
           </div>
        )}

        {/* --- XY TAB --- */}
        {activeTab === 'XY' && (
           <div className="space-y-4">
               <div className="bg-slate-800 p-3 rounded-lg">
                   <h4 className="font-semibold mb-2 text-white">Spatial Modulation</h4>
                   <p className="text-gray-400 mb-4">Map cursor position to audio parameters.</p>

                   {/* X Axis */}
                   <div className="mb-4 border-l-2 border-red-500 pl-3">
                       <h5 className="font-bold text-red-400">X Axis (Horizontal)</h5>
                       <select 
                          value={xyMapping.xParam}
                          onChange={(e) => handleXYChange('xParam', e.target.value)}
                          className="w-full bg-slate-900 p-2 rounded mt-1 mb-2"
                       >
                           <option value="none">None</option>
                           <option value="distortionAmount">Distortion Amount</option>
                           <option value="filterFreq">Filter Frequency</option>
                           <option value="feedbackGain">Delay Feedback</option>
                           <option value="delayTime">Delay Time</option>
                           <option value="playbackRate">Playback Rate</option>
                           <option value="reverbMix">Reverb Mix</option>
                       </select>
                       <div className="flex gap-2">
                          <label className="flex-1">Min: <input type="number" value={xyMapping.xMin} onChange={e => handleXYChange('xMin', parseFloat(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></label>
                          <label className="flex-1">Max: <input type="number" value={xyMapping.xMax} onChange={e => handleXYChange('xMax', parseFloat(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></label>
                       </div>
                   </div>

                   {/* Y Axis */}
                   <div className="mb-4 border-l-2 border-green-500 pl-3">
                       <h5 className="font-bold text-green-400">Y Axis (Vertical)</h5>
                       <select 
                          value={xyMapping.yParam}
                          onChange={(e) => handleXYChange('yParam', e.target.value)}
                          className="w-full bg-slate-900 p-2 rounded mt-1 mb-2"
                       >
                           <option value="none">None</option>
                           <option value="distortionAmount">Distortion Amount</option>
                           <option value="filterFreq">Filter Frequency</option>
                           <option value="feedbackGain">Delay Feedback</option>
                           <option value="delayTime">Delay Time</option>
                           <option value="playbackRate">Playback Rate</option>
                           <option value="reverbMix">Reverb Mix</option>
                       </select>
                       <div className="flex gap-2">
                          <label className="flex-1">Min: <input type="number" value={xyMapping.yMin} onChange={e => handleXYChange('yMin', parseFloat(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></label>
                          <label className="flex-1">Max: <input type="number" value={xyMapping.yMax} onChange={e => handleXYChange('yMax', parseFloat(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></label>
                       </div>
                   </div>
               </div>
           </div>
        )}

        {/* --- PRESETS TAB --- */}
        {activeTab === 'PRESETS' && (
           <div className="space-y-4">
              <div className="bg-slate-800 p-3 rounded-lg">
                 <h4 className="font-semibold mb-2 text-white">Save Preset</h4>
                 <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        className="bg-slate-900 border border-slate-600 rounded px-2 py-1 flex-1"
                    />
                    <button 
                        onClick={() => onSavePreset(newPresetName)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded"
                    >
                        Save
                    </button>
                 </div>
              </div>

              <div className="space-y-2">
                 <h4 className="font-semibold text-white">Saved Presets</h4>
                 {presets.length === 0 && <p className="text-gray-500">No saved presets.</p>}
                 {presets.map((preset, idx) => (
                     <div key={idx} className="bg-slate-800 p-2 rounded flex items-center justify-between">
                         <span className="font-bold text-slate-300 pl-2">{preset.name}</span>
                         <button 
                            onClick={() => onLoadPreset(preset)}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded"
                         >
                            Load
                         </button>
                     </div>
                 ))}
              </div>
           </div>
        )}

      </div>
    </div>
  );
};