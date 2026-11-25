import React from 'react';
import { BacteriaType, BacteriaConfig, AppState } from '../types';
import { BACTERIA_DATA } from '../constants';

interface ControlsProps {
  currentBacteria: BacteriaType;
  onSelectBacteria: (type: BacteriaType) => void;
  appState: AppState;
  onVaccinate: () => void;
}

export const Controls: React.FC<ControlsProps> = ({ 
  currentBacteria, 
  onSelectBacteria, 
  appState,
  onVaccinate 
}) => {
  const isExploding = appState === AppState.VACCINATING || appState === AppState.EXPLODING;

  return (
    <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-4 z-20 pointer-events-none">
      
      {/* Description Panel */}
      <div className="mx-auto bg-white/90 text-slate-800 p-4 rounded-2xl shadow-lg backdrop-blur-sm max-w-md w-full mb-4 pointer-events-auto transition-all duration-300 transform">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-bold">{BACTERIA_DATA[currentBacteria].name}</h2>
                <p className="text-sm text-slate-600">{BACTERIA_DATA[currentBacteria].description}</p>
            </div>
            <button 
                onClick={onVaccinate}
                disabled={isExploding}
                className={`p-3 rounded-full shadow-md transition-transform active:scale-95 ${isExploding ? 'bg-gray-400' : 'bg-red-500 hover:bg-red-600 animate-pulse'}`}
                title="Injecter le vaccin"
            >
                💉
            </button>
        </div>
      </div>

      {/* Selector Scroll */}
      <div className="flex gap-4 overflow-x-auto pb-4 px-2 snap-x pointer-events-auto no-scrollbar justify-center">
        {Object.values(BACTERIA_DATA).map((b) => (
          <button
            key={b.id}
            onClick={() => onSelectBacteria(b.id)}
            disabled={isExploding}
            className={`
              flex-shrink-0 w-16 h-16 rounded-full border-4 shadow-lg transition-all duration-300 transform
              ${currentBacteria === b.id ? 'border-white scale-110' : 'border-transparent opacity-70 hover:opacity-100 scale-100'}
            `}
            style={{ backgroundColor: b.color }}
          >
            <span className="sr-only">{b.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};