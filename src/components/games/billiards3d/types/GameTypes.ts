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
    CLOTH_COLOR: 0x0d5d0d,      // Dark green felt
    WOOD_COLOR: 0x7a5230,       // Brown wood
    RAIL_COLOR: 0x2d5a2d,       // Darker green for rails
  }
};

export const BALL_COLORS: { [key: string]: number } = {
  'whiteball': 0xffffff,
  '1ball': 0xffff00,    // Yellow
  '2ball': 0x0000ff,    // Blue  
  '3ball': 0xff0000,    // Red
  '4ball': 0x800080,    // Purple
  '5ball': 0xff8000,    // Orange
  '6ball': 0x008000,    // Green
  '7ball': 0x800000,    // Maroon
  '8ball': 0x000000,    // Black
  '9ball': 0xffff00,    // Yellow stripe
  '10ball': 0x0000ff,   // Blue stripe
  '11ball': 0xff0000,   // Red stripe
  '12ball': 0x800080,   // Purple stripe
  '13ball': 0xff8000,   // Orange stripe
  '14ball': 0x008000,   // Green stripe
  '15ball': 0x800000,   // Maroon stripe
};