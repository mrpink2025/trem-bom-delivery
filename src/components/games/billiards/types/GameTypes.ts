export interface Ball {
  id: number;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  type: 'cue' | 'solid' | 'stripe' | '8ball';
  number?: number;
  color: string;
  isPocketed: boolean;
  mass: number;
  radius: number;
}

export interface TableDimensions {
  width: number;
  height: number;
  depth: number;
  cushionHeight: number;
  pocketRadius: number;
  railWidth: number;
}

export interface ShotData {
  power: number;
  angle: number;
  spin: { x: number; y: number };
  aimPoint?: { x: number; y: number };
}

export interface GameState {
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

export interface LogoConfig {
  url: string;
  scale: number;
  opacity: number;
  rotation: number;
}

export interface GameConfig {
  quality: 'LOW' | 'MEDIUM' | 'HIGH';
  soundEnabled: boolean;
  showTrajectory: boolean;
  logoConfig: LogoConfig;
}

export interface GameEvent {
  type: 'gameStart' | 'shot' | 'foul' | 'potted' | 'frameEnd' | 'heartbeat';
  player?: 1 | 2;
  data?: any;
  timestamp: number;
}

export interface PhysicsConfig {
  gravity: number;
  friction: number;
  restitution: number;
  ballMass: number;
  ballRadius: number;
  tableWidth: number;
  tableHeight: number;
  pocketRadius: number;
  railHeight: number;
}

export interface RenderConfig {
  antialias: boolean;
  shadows: boolean;
  anisotropy: number;
  pixelRatio: number;
  gammaFactor: number;
}

export interface TouchInput {
  startPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
  isDragging: boolean;
  isAiming: boolean;
}

export interface SoundConfig {
  enabled: boolean;
  volume: number;
  sounds: {
    hit: string;
    pocket: string;
    rail: string;
    break: string;
  };
}

export interface Integration {
  uid?: string;
  jwt?: string;
  sig?: string;
  returnUrl?: string;
  targetOrigin: string;
}

export const GAME_CONSTANTS = {
  TABLE: {
    WIDTH: 2.54, // meters (9 feet)
    HEIGHT: 1.27, // meters (4.5 feet)
    DEPTH: 0.1,
    CUSHION_HEIGHT: 0.064,
    POCKET_RADIUS: 0.064,
    RAIL_WIDTH: 0.127
  },
  BALL: {
    RADIUS: 0.02859, // Standard pool ball radius
    MASS: 0.17, // kg
    COUNT: 16
  },
  PHYSICS: {
    GRAVITY: -9.81,
    FRICTION: 0.015,
    RESTITUTION: 0.95,
    MAX_VELOCITY: 10,
    MIN_VELOCITY: 0.01
  },
  LOGO: {
    MIN_SCALE: 0.1,
    MAX_SCALE: 1.0,
    MIN_OPACITY: 0.0,
    MAX_OPACITY: 1.0,
    SAFETY_MARGIN: 0.12 // 12% margin from pockets
  }
};

export const BALL_COLORS = {
  0: '#FFFFFF', // Cue ball
  1: '#FFD700', // 1 - Yellow
  2: '#0066CC', // 2 - Blue  
  3: '#FF0000', // 3 - Red
  4: '#800080', // 4 - Purple
  5: '#FF8800', // 5 - Orange
  6: '#008000', // 6 - Green
  7: '#8B0000', // 7 - Maroon
  8: '#000000', // 8 - Black
  9: '#FFD700', // 9 - Yellow stripe
  10: '#0066CC', // 10 - Blue stripe
  11: '#FF0000', // 11 - Red stripe
  12: '#800080', // 12 - Purple stripe
  13: '#FF8800', // 13 - Orange stripe
  14: '#008000', // 14 - Green stripe
  15: '#8B0000'  // 15 - Maroon stripe
};

export const TREM_BAO_THEME = {
  primary: '#F59E0B', // Orange from logo
  secondary: '#059669', // Green for table
  accent: '#DC2626', // Red accent
  background: '#1F2937', // Dark background
  surface: '#374151', // Surface color
  text: '#F9FAFB', // Light text
  textMuted: '#9CA3AF' // Muted text
};