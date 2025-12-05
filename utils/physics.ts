import { Point, Stick, RopeSystem } from '../types';

export const GRAVITY = 0.5;
export const FRICTION = 0.99;
export const GROUND_FRICTION = 0.5; // High friction to make it rest
export const WALL_BOUNCE = 0.5;

export function createRope(startX: number, startY: number, segments: number, segmentLength: number): RopeSystem {
  const points: Point[] = [];
  const sticks: Stick[] = [];

  for (let i = 0; i < segments; i++) {
    points.push({
      x: startX,
      y: startY + i * segmentLength,
      oldx: startX,
      oldy: startY + i * segmentLength,
      pinned: i === 0,
    });
  }

  for (let i = 0; i < segments - 1; i++) {
    sticks.push({
      p1: points[i],
      p2: points[i + 1],
      length: segmentLength,
    });
  }

  // Extreme iterations for absolute rigidity (zero elasticity)
  // 600 iterations makes it behave like a solid steel rod or chain
  return { points, sticks, iterations: 600 };
}

export function updatePhysics(system: RopeSystem, width: number, height: number, bulbRadius: number = 0) {
  const { points, sticks, iterations } = system;

  // Update Points (Verlet Integration)
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (!p.pinned) {
      const vx = (p.x - p.oldx) * FRICTION;
      const vy = (p.y - p.oldy) * FRICTION;

      p.oldx = p.x;
      p.oldy = p.y;
      p.x += vx;
      p.y += vy;
      p.y += GRAVITY;

      // Box Collision Boundaries
      const r = (i === points.length - 1) ? bulbRadius : 0;
      
      // Floor
      const floorY = height - r;
      if (p.y > floorY) {
        p.y = floorY;
        // Apply ground friction
        const currentVx = p.x - p.oldx;
        p.oldx = p.x - currentVx * GROUND_FRICTION; 
        p.oldy = p.y; // Stop vertical motion to prevent jitter
      }

      // Walls
      const leftWall = r;
      const rightWall = width - r;

      if (p.x < leftWall) {
          p.x = leftWall;
          const currentVx = p.x - p.oldx;
          p.oldx = p.x + currentVx * WALL_BOUNCE; 
      } else if (p.x > rightWall) {
          p.x = rightWall;
          const currentVx = p.x - p.oldx;
          p.oldx = p.x + currentVx * WALL_BOUNCE;
      }
    }
  }

  // Constrain Sticks
  // Alternating Forward and Backward passes helps propagate tension instantly 
  for (let j = 0; j < iterations; j++) {
    // Forward pass
    for (let i = 0; i < sticks.length; i++) {
      resolveStick(sticks[i]);
    }
    // Backward pass
    for (let i = sticks.length - 1; i >= 0; i--) {
      resolveStick(sticks[i]);
    }
  }
}

function resolveStick(stick: Stick) {
    const dx = stick.p2.x - stick.p1.x;
    const dy = stick.p2.y - stick.p1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Prevent division by zero
    if (distance === 0) return;

    const difference = stick.length - distance;
    const percent = difference / distance / 2;
    const offsetX = dx * percent;
    const offsetY = dy * percent;

    const p1Pinned = stick.p1.pinned;
    const p2Pinned = stick.p2.pinned;

    // Critical for rigidity: If one point is pinned, the other takes 100% of the correction.
    if (p1Pinned && !p2Pinned) {
        stick.p2.x += offsetX * 2;
        stick.p2.y += offsetY * 2;
    } else if (!p1Pinned && p2Pinned) {
        stick.p1.x -= offsetX * 2;
        stick.p1.y -= offsetY * 2;
    } else if (!p1Pinned && !p2Pinned) {
        // Share the correction
        stick.p1.x -= offsetX;
        stick.p1.y -= offsetY;
        stick.p2.x += offsetX;
        stick.p2.y += offsetY;
    }
}