import React, { useRef, useEffect } from 'react';
import { BacteriaConfig, AppState, Particle } from '../types';

interface BlobVisualizerProps {
  config: BacteriaConfig;
  appState: AppState;
  analyserData: Uint8Array;
  onInteraction: (intensity: number) => void;
}

const BlobVisualizer: React.FC<BlobVisualizerProps> = ({ config, appState, analyserData, onInteraction }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  
  // Interaction State
  const interactionRef = useRef({
    active: false,
    x: 0,
    y: 0,
    intensity: 0, // 0 to 1 based on drag distance
  });
  
  // Physics parameters for the blob
  const radiusBase = 120;
  const numPoints = 16;
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset particles
    if (appState !== AppState.EXPLODING && appState !== AppState.EXPLODED) {
      particlesRef.current = [];
    }
    
    // Trigger explosion particles
    if (appState === AppState.EXPLODING && particlesRef.current.length === 0) {
      for (let i = 0; i < 50; i++) {
        particlesRef.current.push({
          x: canvas.width / 2,
          y: canvas.height / 2,
          vx: (Math.random() - 0.5) * 20,
          vy: (Math.random() - 0.5) * 20,
          color: Math.random() > 0.5 ? config.color : config.secondaryColor,
          life: 1.0,
          size: Math.random() * 10 + 5
        });
      }
    }

    let animationId: number;

    const render = () => {
      if (!ctx || !canvas) return;
      
      // Update canvas size
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const time = timeRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // --- Volume Calculation ---
      let volume = 0;
      if (analyserData.length > 0) {
        const sum = analyserData.reduce((a, b) => a + b, 0);
        volume = sum / analyserData.length;
      }
      const normalizedVol = volume / 255;
      
      // --- Interaction Physics ---
      // We calculate a pull vector towards the touch point
      let pullX = 0;
      let pullY = 0;
      if (interactionRef.current.active) {
          const dx = interactionRef.current.x - centerX;
          const dy = interactionRef.current.y - centerY;
          // Limit pull range
          pullX = dx * 0.4;
          pullY = dy * 0.4;
      }

      // --- State-based Physics ---
      let jitter = 0;
      let shakeX = 0;
      let shakeY = 0;
      let scale = 1.0;

      if (appState === AppState.RECORDING) {
        scale = 1.0 + (normalizedVol * 0.3); // Grow when hearing
      } else if (appState === AppState.PLAYING) {
        scale = 1.0 + (normalizedVol * 0.5); // Pulse when talking
        jitter = normalizedVol * 10;
      } else if (appState === AppState.VACCINATING) {
        shakeX = (Math.random() - 0.5) * 20;
        shakeY = (Math.random() - 0.5) * 20;
        scale = 1.0 + Math.sin(time * 20) * 0.1; 
      }

      if (appState === AppState.EXPLODING || appState === AppState.EXPLODED) {
         // Render Particles
         particlesRef.current.forEach((p, index) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.5;
            p.life -= 0.02;

            if (p.life > 0) {
              ctx.fillStyle = p.color;
              ctx.globalAlpha = p.life;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
              ctx.fill();
            } else {
              particlesRef.current.splice(index, 1);
            }
         });
         ctx.globalAlpha = 1.0;
         timeRef.current += 0.05;
         animationId = requestAnimationFrame(render);
         return; 
      }

      // --- Draw Blob Body ---
      ctx.fillStyle = config.color;
      ctx.beginPath();

      const currentRadius = radiusBase * scale;

      for (let i = 0; i <= numPoints; i++) {
        const angle = (Math.PI * 2 * i) / numPoints;
        
        // Interaction Deformation
        // If touching, pull points near the touch angle
        let deform = 0;
        if (interactionRef.current.active) {
            const touchAngle = Math.atan2(pullY, pullX);
            // Difference between current point angle and touch angle
            let angleDiff = Math.abs(angle - touchAngle);
            if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
            
            // Only affect points within a certain cone
            if (angleDiff < 1.5) {
                const dist = Math.sqrt(pullX*pullX + pullY*pullY);
                deform = Math.cos(angleDiff) * dist * 0.5; 
            }
        }

        const offset = Math.sin(angle * 5 + time * 2) * 10 + 
                       Math.cos(angle * 3 - time) * 10 +
                       jitter * (Math.random() - 0.5);
        
        const r = currentRadius + offset + deform;
        const x = centerX + shakeX + Math.cos(angle) * r;
        const y = centerY + shakeY + Math.sin(angle) * r;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevAngle = (Math.PI * 2 * (i - 1)) / numPoints;
          // Recalculate prev point for curve (simplified for brevity, ideally stored)
          // Just using a simplified smooth connection here
          // For high fidelity, we'd store points in array first
          
          // Recomputing simplified prev for curve context
           let prevDeform = 0;
            if (interactionRef.current.active) {
                const touchAngle = Math.atan2(pullY, pullX);
                let angleDiff = Math.abs(prevAngle - touchAngle);
                if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
                if (angleDiff < 1.5) {
                    const dist = Math.sqrt(pullX*pullX + pullY*pullY);
                    prevDeform = Math.cos(angleDiff) * dist * 0.5; 
                }
            }
          const prevOffset = Math.sin(prevAngle * 5 + time * 2) * 10 + Math.cos(prevAngle * 3 - time) * 10 + jitter * (Math.random() - 0.5);
          const prevR = currentRadius + prevOffset + prevDeform;
          const prevX = centerX + shakeX + Math.cos(prevAngle) * prevR;
          const prevY = centerY + shakeY + Math.sin(prevAngle) * prevR;

          const cpX = (prevX + x) / 2;
          const cpY = (prevY + y) / 2;
          ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
        }
      }
      ctx.closePath();
      ctx.fill();

      // --- Draw Eyes ---
      // Move eyes with interaction pull
      const eyePullX = pullX * 0.3;
      const eyePullY = pullY * 0.3;
      
      const eyeSize = 15 + (normalizedVol * 5); 
      
      ctx.fillStyle = 'white';
      // Left Eye
      ctx.beginPath();
      let leftEyeY = centerY - 20 + shakeY + eyePullY;
      let rightEyeY = centerY - 20 + shakeY + eyePullY;
      let leftEyeX = centerX - 40 + shakeX + eyePullX;
      let rightEyeX = centerX + 40 + shakeX + eyePullX;
      
      if (config.eyeType === 'squint') {
         ctx.arc(leftEyeX, leftEyeY, eyeSize, Math.PI, 0); 
      } else if (config.eyeType === 'crazy') {
         ctx.arc(leftEyeX, leftEyeY - (Math.sin(time*10)*5), eyeSize * 1.5, 0, Math.PI * 2);
      } else {
         ctx.arc(leftEyeX, leftEyeY, eyeSize, 0, Math.PI * 2);
      }
      ctx.fill();

      // Right Eye
      ctx.beginPath();
      if (config.eyeType === 'squint') {
         ctx.arc(rightEyeX, rightEyeY, eyeSize, Math.PI, 0);
      } else if (config.eyeType === 'crazy') {
         ctx.arc(rightEyeX, rightEyeY + (Math.cos(time*10)*5), eyeSize * 0.8, 0, Math.PI * 2);
      } else {
         ctx.arc(rightEyeX, rightEyeY, eyeSize, 0, Math.PI * 2);
      }
      ctx.fill();

      // Pupils
      ctx.fillStyle = 'black';
      ctx.beginPath();
      // Pupils follow the pull slightly
      ctx.arc(leftEyeX + eyePullX*0.1, leftEyeY + eyePullY*0.1, 5, 0, Math.PI * 2);
      ctx.arc(rightEyeX + eyePullX*0.1, rightEyeY + eyePullY*0.1, 5, 0, Math.PI * 2);
      ctx.fill();


      // --- Draw Mouth ---
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#333';
      ctx.lineCap = 'round';
      ctx.beginPath();

      const mouthY = centerY + 40 + shakeY + eyePullY;
      const mouthX = centerX + shakeX + eyePullX;
      const openAmount = normalizedVol * 40;

      if (config.mouthType === 'o') {
        ctx.fillStyle = '#333';
        ctx.ellipse(mouthX, mouthY, 10 + openAmount/2, 10 + openAmount, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (config.mouthType === 'tooth') {
        ctx.moveTo(mouthX - 30, mouthY);
        ctx.lineTo(mouthX - 10, mouthY + 10 + openAmount);
        ctx.lineTo(mouthX + 10, mouthY);
        ctx.lineTo(mouthX + 30, mouthY + 10 + openAmount);
        ctx.stroke();
      } else {
        ctx.arc(mouthX, mouthY - 10, 30, 0.2 * Math.PI, 0.8 * Math.PI, false);
        ctx.stroke();
        if (openAmount > 5) {
             ctx.fillStyle = '#600';
             ctx.beginPath();
             ctx.arc(mouthX, mouthY - 10, 30, 0.2 * Math.PI, 0.8 * Math.PI, false);
             ctx.lineTo(mouthX, mouthY + openAmount);
             ctx.fill();
        }
      }

      timeRef.current += 0.05;
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [config, appState, analyserData]);

  // --- Handlers ---

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    interactionRef.current.active = true;
    updateInteraction(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (interactionRef.current.active) {
       updateInteraction(e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    interactionRef.current.active = false;
    interactionRef.current.intensity = 0;
    // Reset audio intensity
    onInteraction(0);
  };

  const updateInteraction = (e: React.PointerEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      interactionRef.current.x = x;
      interactionRef.current.y = y;

      // Calculate intensity based on distance from center Y
      // Moving DOWN increases intensity? Or just distance from center?
      // Let's use distance from center for general "distortion" feel
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      const maxDist = Math.min(rect.width, rect.height) / 2;
      
      // Normalize 0 to 1
      let intensity = Math.min(dist / maxDist, 1.0);
      interactionRef.current.intensity = intensity;
      
      onInteraction(intensity);
  };

  return (
    <canvas 
        ref={canvasRef} 
        className="w-full h-full absolute inset-0 z-10 touch-none cursor-pointer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
    />
  );
};

export default BlobVisualizer;