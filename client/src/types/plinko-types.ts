// Shared types for the Plinko game

export type RiskLevel = 'low' | 'medium' | 'high';

export interface PathStep {
  row: number;
  position: number;
}

export interface PinPosition {
  row: number;
  x: number;
  y: number;
  radius: number;
}

export interface Bucket {
  x: number;
  width: number;
  multiplier: number;
}

export interface BallPosition {
  x: number;
  y: number;
}

export interface PlinkoResult {
  isWin: boolean;
  payout: number;
  multiplier: number;
  path: PathStep[];
  pins: any[][];
  risk: RiskLevel;
  rows: number;
  landingPosition: number;
  amount?: number; // Optional to maintain backward compatibility
  multipliers?: number[]; // The array of multipliers from the server
}

export interface BetData {
  amount: number;
  risk: RiskLevel;
}