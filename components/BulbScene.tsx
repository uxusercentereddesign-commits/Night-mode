import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createRope, updatePhysics } from '../utils/physics';
import { RopeSystem, Point } from '../types';
import { Hammer } from 'lucide-react';

interface BulbSceneProps {
  isHammerMode: boolean;
  onToggleHammer: () => void;
}

// Config
const INITIAL_SEGMENT_COUNT = 40;
const BULB_RADIUS = 30; // Radius for collision

export const BulbScene: React.FC<BulbSceneProps> = ({ isHammerMode, onToggleHammer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Assets
  const backgroundRef = useRef<HTMLImageElement | null>(null);

  // Physics State
  const ropeRef = useRef<RopeSystem | null>(null);
  const [isBulbOn, setIsBulbOn] = useState(false);
  const dragRef = useRef<{ isDragging: boolean; pointIndex: number | null }>({ isDragging: false, pointIndex: null });
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // Mount State (Position of the wall peg)
  const mountRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize Assets
  useEffect(() => {
    const img = new Image();
    // Dark concrete texture to match the #1E1E1E aesthetic
    img.src = "https://images.unsplash.com/photo-1487147264018-f937fba0c817?q=80&w=2000&auto=format&fit=crop";
    img.onload = () => {
        backgroundRef.current = img;
    };
  }, []);

  // Initialize Physics
  useEffect(() => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    
    // Start in the top middle-ish
    const startX = width * 0.7;
    const startY = 0;
    
    const targetLength = height * 0.6; 
    const segmentLen = targetLength / INITIAL_SEGMENT_COUNT;
    
    ropeRef.current = createRope(startX, startY, INITIAL_SEGMENT_COUNT, segmentLen);

    // Initial Swing Impulse
    if (ropeRef.current.points.length > 0) {
        const lastPoint = ropeRef.current.points[ropeRef.current.points.length - 1];
        lastPoint.oldx = lastPoint.x - 50; 
    }
  }, []);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Main Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      if (!ropeRef.current) return;
      const { width, height } = canvas;

      // --- PHYSICS UPDATE START ---

      // 1. Check for Rope-Peg Collision (Snagging)
      if (mountRef.current && dragRef.current.isDragging) {
        const mount = mountRef.current;
        // The rope wraps AROUND the peg.
        const snagX = mount.x; 
        const snagY = mount.y;

        // Check points to see if they cross the snag point
        for (let i = 0; i < ropeRef.current.points.length - 1; i++) {
            const p = ropeRef.current.points[i];
            if (p.pinned) continue; // Already pinned

            const dist = Math.hypot(p.x - snagX, p.y - snagY);
            // Threshold for snagging. 
            if (dist < 25) { 
                p.pinned = true;
                p.x = snagX;
                p.y = snagY;
                p.oldx = snagX;
                p.oldy = snagY;
            }
        }
      }

      // 2. Dynamic Rope Lengthening/Shortening (Winch Logic - NO SPRING)
      if (dragRef.current.isDragging && dragRef.current.pointIndex !== null) {
          const mouse = mouseRef.current;
          
          // Find last pinned point (effective anchor)
          let anchorIndex = 0;
          for (let i = ropeRef.current.points.length - 2; i >= 0; i--) {
              if (ropeRef.current.points[i].pinned) {
                  anchorIndex = i;
                  break;
              }
          }
          const anchor = ropeRef.current.points[anchorIndex];
          
          const dx = mouse.x - anchor.x;
          const dy = mouse.y - anchor.y;
          const distToAnchor = Math.sqrt(dx * dx + dy * dy);
          const activeSegments = (ropeRef.current.points.length - 1) - anchorIndex;

          // Only update if we have segments to work with
          if (activeSegments > 0) {
            const newSegmentLength = distToAnchor / activeSegments;
            
            // Apply new length
            for (let i = anchorIndex; i < ropeRef.current.sticks.length; i++) {
                ropeRef.current.sticks[i].length = newSegmentLength;
            }

            // CRITICAL: Manually redistribute points to avoid "spring" velocity
            // This teleports points to the straight line, resetting energy.
            for (let i = 1; i <= activeSegments; i++) {
                const pointIndex = anchorIndex + i;
                const p = ropeRef.current.points[pointIndex];
                
                // Interpolate position along the straight line
                const t = i / activeSegments;
                const targetX = anchor.x + dx * t;
                const targetY = anchor.y + dy * t;
                
                p.x = targetX;
                p.y = targetY;
                
                // Reset velocity to zero (relative to the resize) to prevent recoil
                p.oldx = targetX; 
                p.oldy = targetY;
                
                // Last point is strictly pinned to mouse
                if (pointIndex === dragRef.current.pointIndex) {
                    p.pinned = true;
                }
            }
          }
      }
      
      // Update Physics Engine
      updatePhysics(ropeRef.current, width, height, BULB_RADIUS);
      
      const lastIndex = ropeRef.current.points.length - 1;
      const lastPoint = ropeRef.current.points[lastIndex];

      // Enforce Pin Constraint if dragging stopped
      if (lastPoint.pinned && mountRef.current && !dragRef.current.isDragging) {
         // This ensures if we dropped it on the nail, it stays exactly there
      }

      // --- RENDERING START ---

      // Clear Canvas
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Background Image
      if (backgroundRef.current) {
          const img = backgroundRef.current;
          const scale = Math.max(width / img.width, height / img.height);
          const x = (width / 2) - (img.width / 2) * scale;
          const y = (height / 2) - (img.height / 2) * scale;
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      } else {
          ctx.fillStyle = '#1E1E1E';
          ctx.fillRect(0, 0, width, height);
      }

      // 2. Draw Wooden Peg Mount
      if (mountRef.current) {
         const { x, y } = mountRef.current;
         drawWoodenPeg(ctx, x, y);
      }

      // 3. Draw Rope (Black Fabric)
      if (ropeRef.current.points.length > 0) {
        const points = ropeRef.current.points;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.strokeStyle = '#050505'; 
        ctx.lineWidth = 4;
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
             ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();

        // Subtle Texture
        ctx.beginPath();
        ctx.strokeStyle = '#1a1a1a'; 
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]); 
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
             ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 4. Draw Tied Loop visual
      if (mountRef.current) {
          const mount = mountRef.current;
          const snagX = mount.x;
          const snagY = mount.y;
          
          // Check if any point is pinned to the snag location
          const isSnagged = ropeRef.current.points.some(p => p.pinned && Math.abs(p.x - snagX) < 1 && Math.abs(p.y - snagY) < 1);
          
          if (isSnagged) {
              ctx.strokeStyle = '#050505';
              ctx.lineWidth = 4;
              ctx.beginPath();
              ctx.arc(snagX, snagY - 4, 10, 0, Math.PI * 2);
              ctx.stroke();
              
              ctx.fillStyle = '#050505';
              ctx.beginPath();
              ctx.arc(snagX, snagY + 6, 5, 0, Math.PI * 2);
              ctx.fill();
          }
      }

      // 5. Draw Bulb Assembly (Modern Cone)
      const endPoint = ropeRef.current.points[lastIndex];
      const prevPoint = ropeRef.current.points[Math.max(0, lastIndex - 1)];
      const angle = Math.atan2(endPoint.y - prevPoint.y, endPoint.x - prevPoint.x) - Math.PI / 2;
      
      drawBulbAssembly(ctx, endPoint.x, endPoint.y, angle, isBulbOn);

      // 6. Draw Shadow / Light Overlay
      // This creates the "Night Mode" effect where the background is hidden unless lit
      const lightRadius = isBulbOn ? Math.max(width, height) * 0.8 : 100;
      
      // Create radial gradient centered on bulb
      // The center is transparent (light), the edges are black (shadow)
      const shadowGrad = ctx.createRadialGradient(endPoint.x, endPoint.y, 10, endPoint.x, endPoint.y, lightRadius);
      
      if (isBulbOn) {
          shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');       // Bright center
          shadowGrad.addColorStop(0.2, 'rgba(0,0,0,0.1)');   // Falloff
          shadowGrad.addColorStop(0.6, 'rgba(0,0,0,0.5)'); 
          shadowGrad.addColorStop(1, 'rgba(0,0,0,0.95)');    // Dark room corners
      } else {
          shadowGrad.addColorStop(0, 'rgba(0,0,0,0.7)');     // Dim glow around OFF bulb
          shadowGrad.addColorStop(1, 'rgba(0,0,0,0.98)');    // Very dark room
      }

      ctx.fillStyle = shadowGrad;
      ctx.fillRect(0, 0, width, height);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [isBulbOn]);

  // Input Handlers
  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!ropeRef.current || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    mouseRef.current = { x, y };

    // PLACE PEG MODE
    if (isHammerMode) {
      mountRef.current = { x, y };
      onToggleHammer(); 
      return;
    }

    // DRAG MODE
    const endPoint = ropeRef.current.points[ropeRef.current.points.length - 1];
    const dist = Math.hypot(x - endPoint.x, y - endPoint.y);

    if (dist < 60) {
      dragRef.current = { isDragging: true, pointIndex: ropeRef.current.points.length - 1 };
      endPoint.pinned = true;
    }
  }, [isHammerMode, onToggleHammer]);

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
     if (!canvasRef.current) return;
     const rect = canvasRef.current.getBoundingClientRect();
     const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
     const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
     const x = clientX - rect.left;
     const y = clientY - rect.top;
     mouseRef.current = { x, y };
  }, []);

  const handlePointerUp = useCallback(() => {
    if (dragRef.current.isDragging && dragRef.current.pointIndex !== null && ropeRef.current) {
         const lastPt = ropeRef.current.points[ropeRef.current.points.length - 1];
         let secured = false;

         if (mountRef.current) {
             const snagX = mountRef.current.x;
             const snagY = mountRef.current.y;
             const dist = Math.hypot(lastPt.x - snagX, lastPt.y - snagY);
             
             if (dist < 40) {
                 lastPt.pinned = true;
                 lastPt.x = snagX;
                 lastPt.y = snagY;
                 secured = true;
             }
         }
         
         if (!secured) {
             lastPt.pinned = false; 
         }
    }
    dragRef.current = { isDragging: false, pointIndex: null };
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
      if (isHammerMode) return; 

      if (!ropeRef.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const endPoint = ropeRef.current.points[ropeRef.current.points.length - 1];
      const dist = Math.hypot(x - endPoint.x, y - endPoint.y);
      
      if (dist < 60) {
          setIsBulbOn(prev => !prev);
      }
  }, [isHammerMode]);

  return (
    <div ref={containerRef} className={`relative w-full h-full ${isHammerMode ? 'cursor-none' : ''}`}>
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onClick={handleCanvasClick}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      />
      <CursorFollower isActive={isHammerMode} />
    </div>
  );
};

// --- DRAWING HELPERS ---

function drawWoodenPeg(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.save();
    
    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    // The Peg (Simple Minimal Cylinder Button)
    const radius = 16;
    
    // Wood Gradient
    const grad = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, radius);
    grad.addColorStop(0, '#f0dec0'); // Light wood highlight
    grad.addColorStop(1, '#d4b483'); // Natural wood

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    
    // Ring detail (End grain)
    ctx.beginPath();
    ctx.arc(x, y, radius - 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(160, 120, 80, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
}

function drawBulbAssembly(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, isOn: boolean) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      // --- Modern Cone Shade & Socket ---
      
      // 1. The Cord Entry
      ctx.fillStyle = '#080808';
      ctx.beginPath();
      ctx.roundRect(-4, -55, 8, 15, 2);
      ctx.fill();

      // 2. The Socket Cylinder
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.roundRect(-10, -40, 20, 25, 2); 
      ctx.fill();
      
      // 3. The Cone Shade
      const shadeColor = '#080808'; // Matte Black
      ctx.beginPath();
      ctx.moveTo(-10, -20); // Top left
      ctx.lineTo(10, -20);  // Top right
      ctx.lineTo(35, 40);   // Bottom right flared
      ctx.lineTo(-35, 40);  // Bottom left flared
      ctx.closePath();
      
      ctx.fillStyle = shadeColor;
      ctx.fill();
      
      // Shade interior (visible at bottom)
      ctx.beginPath();
      ctx.ellipse(0, 40, 35, 6, 0, 0, Math.PI * 2);
      ctx.fillStyle = isOn ? '#fff' : '#222'; 
      ctx.fill();

      // --- The Bulb ---
      const glassColor = isOn ? 'rgba(255, 250, 240, 0.95)' : 'rgba(255, 255, 255, 0.3)';
      
      ctx.beginPath();
      ctx.arc(0, 45, 12, 0, Math.PI * 2);
      ctx.fillStyle = glassColor;
      
      // Only add blur if ON, otherwise it looks foggy in the dark
      if (isOn) {
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 20;
      }
      
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();
}

const CursorFollower: React.FC<{ isActive: boolean }> = ({ isActive }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!isActive) return;
        const onMove = (e: MouseEvent) => {
            if (ref.current) ref.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-10%, -90%) rotate(-45deg)`;
        };
        window.addEventListener('mousemove', onMove);
        return () => window.removeEventListener('mousemove', onMove);
    }, [isActive]);
    if (!isActive) return null;
    return (
        <div ref={ref} className="pointer-events-none fixed top-0 left-0 z-50 text-stone-300 drop-shadow-2xl" style={{ willChange: 'transform' }}>
             <Hammer size={48} strokeWidth={1.5} fill="currentColor" className="opacity-90" />
        </div>
    );
};