export enum BetStatus {
  PENDING = 'PENDING',
  WON = 'WON',
  LOST = 'LOST',
  PUSH = 'PUSH', // Money back
}

export enum Sportsbook {
  DRAFTKINGS = 'DraftKings',
  FANDUEL = 'FanDuel',
  BETMGM = 'BetMGM',
  CAESARS = 'Caesars',
  BET365 = 'Bet365',
  POINTSBET = 'PointsBet',
  ESPNBET = 'ESPN Bet',
  OTHER = 'Other',
}

export interface Bet {
  id: string;
  date: string; // ISO Date string
  matchup: string; // e.g., "Lakers vs Celtics"
  sportsbook: Sportsbook;
  pick: string; // e.g., "Lakers -5.5"
  odds: number; // American odds, e.g., -110, +200
  wager: number;
  potentialProfit: number; // Calculated potential win amount (excluding wager returned)
  status: BetStatus;
  createdAt: number;
}

export interface BankrollState {
  startingBalance: number;
  currentBalance: number;
  totalWagered: number;
  totalWon: number; // Pure profit
  totalLost: number;
  totalBets: number;
  wins: number;
  losses: number;
  pushes: number;
  roi: number;
}