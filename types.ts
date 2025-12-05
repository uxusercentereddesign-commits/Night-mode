export interface Point {
  x: number;
  y: number;
  oldx: number;
  oldy: number;
  pinned: boolean;
}

export interface Stick {
  p1: Point;
  p2: Point;
  length: number;
}

export interface RopeSystem {
  points: Point[];
  sticks: Stick[];
  iterations: number;
}

export interface Coordinates {
  x: number;
  y: number;
}
