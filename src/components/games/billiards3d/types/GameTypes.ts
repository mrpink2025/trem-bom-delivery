import * as THREE from 'three';
import * as CANNON from 'cannon';

export interface Ball3D {
  id: number;
  name: string;
  type: 'cue' | 'solid' | 'stripe' | '8ball';
  mesh: THREE.Mesh;
  rigidBody: CANNON.Body;
  sphere: THREE.Sphere;
  fallen: boolean;
  number?: number;
}

export interface GameState3D {
  phase: 'MENU' | 'BREAK' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
  currentPlayer: 1 | 2;
  playerGroups: { 1: 'solid' | 'stripe' | null; 2: 'solid' | 'stripe' | null };
  scores: { 1: number; 2: number };
  fouls: { 1: number; 2: number };
  gameMode: '1P' | '2P';
  isPaused: boolean;
  isGameOver: boolean;
  winner: 1 | 2 | null;
}

export interface GameConfig3D {
  soundEnabled: boolean;
  quality: 'LOW' | 'MEDIUM' | 'HIGH';
  physics: {
    gravity: number;
    friction: number;
    restitution: number;
  };
}

export interface LogoConfig {
  url: string;
  scale: number;
  opacity: number;
  rotation: number;
}

export interface ShotData3D {
  power: number;
  direction: THREE.Vector3;
  spin?: THREE.Vector2;
}

export interface GameEvent3D {
  type: 'gameStart' | 'shot' | 'potted' | 'foul' | 'frameEnd' | 'heartbeat';
  player?: 1 | 2;
  data: any;
  timestamp: number;
}

// Game constants
export const GAME_CONSTANTS_3D = {
  TABLE: {
    LEN_X: 254,      // cm (official 9-foot table)
    LEN_Z: 127,      // cm
    HEIGHT: 80,      // cm
    CUSHION_HEIGHT: 6.35, // cm
    POCKET_RADIUS: 11,    // cm
  },
  BALL: {
    RADIUS: 5.715 / 2,  // cm (official ball diameter 57.15mm)
    MASS: 0.170,        // kg
  },
  PHYSICS: {
    GRAVITY: -9.82 * 30,  // m/s² (scaled for game)
    FRICTION: 0.7,
    RESTITUTION: 0.1,
    DAMPING: 0.5,
    FIXED_TIMESTEP: 1.0 / 60.0,
  },
  CAMERA: {
    FOV: 45,
    NEAR: 1,
    FAR: 1000,
    MIN_DISTANCE: 35,
    MAX_DISTANCE: 165,
    MAX_POLAR_ANGLE: 0.49 * Math.PI,
  },
  MATERIALS: {
    CLOTH_COLOR: 0x0a7c0a,      // Vibrant billiards green felt
    WOOD_COLOR: 0x6b4423,       // Rich mahogany wood
    RAIL_COLOR: 0x0d5d0d,       // Darker green for rails
  }
};

export const BALL_COLORS: { [key: string]: number } = {
  'whiteball': 0xffffff,   // Pure white cue ball
  '1ball': 0xffeb3b,      // Bright yellow
  '2ball': 0x2196f3,      // Bright blue  
  '3ball': 0xf44336,      // Bright red
  '4ball': 0x9c27b0,      // Bright purple
  '5ball': 0xff9800,      // Bright orange
  '6ball': 0x4caf50,      // Bright green
  '7ball': 0x795548,      // Maroon/brown
  '8ball': 0x212121,      // Deep black
  '9ball': 0xffeb3b,      // Yellow with stripe (simplified)
  '10ball': 0x2196f3,     // Blue with stripe (simplified)
  '11ball': 0xf44336,     // Red with stripe (simplified)
  '12ball': 0x9c27b0,     // Purple with stripe (simplified)
  '13ball': 0xff9800,     // Orange with stripe (simplified)
  '14ball': 0x4caf50,     // Green with stripe (simplified)
  '15ball': 0x795548,     // Maroon with stripe (simplified)
};