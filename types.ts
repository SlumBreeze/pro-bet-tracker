
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
  THESCOREBET = 'theScore Bet',
  FLIFF = 'Fliff',
  FANATICS = 'Fanatics',
  PRIZEPICKS = 'PrizePicks',
  UNDERDOG = 'Underdog Fantasy',
  DRAFTERS = 'Drafters',
  BETR = 'Betr',
  OTHER = 'Other',
}

export interface Bet {
  id: string;
  date: string; // ISO Date string
  matchup: string; // e.g., "Lakers vs Celtics"
  sport: string; // e.g. "NBA", "NFL"
  sportsbook: Sportsbook;
  pick: string; // e.g., "Lakers -5.5"
  odds: number; // American odds, e.g., -110, +200
  wager: number;
  potentialProfit: number; // Calculated potential win amount (excluding wager returned)
  status: BetStatus;
  createdAt: number;
  tags?: string[];
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
  roi: number;     // Actual ROI based on money wagered
  flatROI: number; // Theoretical ROI if every bet size was equal (1 unit)
}

export interface AdvancedStats {
  currentStreak: number; // Positive for Win streak, Negative for Loss streak
  last10: BetStatus[];
  hottestSport: { name: string; profit: number; record: string } | null;
  coldestSport: { name: string; profit: number; record: string } | null;
  bookPerformance: { name: string; profit: number; wins: number; losses: number; winRate: number }[];
  teamPerformance: { name: string; profit: number; wins: number; losses: number }[]; // Inferred from Pick
}

export interface BankrollHistoryPoint {
  date: string;
  balance: number;
  formattedDate: string;
}