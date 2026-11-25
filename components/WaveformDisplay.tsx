import React, { useEffect, useRef } from 'react';

interface WaveformDisplayProps {
  buffer: AudioBuffer;
  height?: number;
  color?: string;
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({ 
  buffer, 
  height = 50,
  color = '#a78bfa' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.height = `${height}px`;

    ctx.clearRect(0, 0, rect.width, height);
    ctx.fillStyle = color;
    
    // Draw logic
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / rect.width);
    const amp = height / 2;

    ctx.beginPath();
    for (let i = 0; i < rect.width; i++) {
      let min = 1.0;
      let max = -1.0;
      
      for (let j = 0; j < step; j++) {
        const datum = data[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      
      ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
    }
  }, [buffer, height, color]);

  return <canvas ref={canvasRef} className="w-full bg-slate-800 rounded mb-2" />;
};