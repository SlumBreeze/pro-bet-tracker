
import { Sportsbook } from './types';

export const SPORTSBOOKS = Object.values(Sportsbook);

export const SPORTS = [
  'NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'UFC', 'Tennis', 'Soccer', 'Golf', 'F1', 'Esports', 'Other'
];

export const CHART_COLORS = {
  emerald: '#10b981',
  rose: '#f43f5e',
  amber: '#f59e0b',
  slate: '#64748b',
};

export const SPORTSBOOK_THEME: Record<string, { bg: string, text: string, border: string }> = {
  [Sportsbook.DRAFTKINGS]: { 
    bg: '#53D337', 
    text: '#000000', 
    border: '#45b02d' 
  },
  [Sportsbook.FANDUEL]: { 
    bg: '#004DA3', 
    text: '#ffffff', 
    border: '#003d82' 
  },
  [Sportsbook.BETMGM]: { 
    bg: '#D4B962', 
    text: '#000000', 
    border: '#b89f4d' 
  },
  [Sportsbook.CAESARS]: { 
    bg: '#C5A459', 
    text: '#000000', 
    border: '#a88b45' 
  },
  [Sportsbook.BET365]: { 
    bg: '#005440', 
    text: '#ffffff', 
    border: '#003d2e' 
  },
  [Sportsbook.THESCOREBET]: { 
    bg: '#1C3F75', 
    text: '#ffffff', 
    border: '#142d55' 
  },
  [Sportsbook.POINTSBET]: { 
    bg: '#F53B3B', 
    text: '#ffffff', 
    border: '#d42b2b' 
  },
  [Sportsbook.FLIFF]: { 
    bg: '#02D682', 
    text: '#000000', 
    border: '#029c5e' 
  },
  [Sportsbook.FANATICS]: { 
    bg: '#F1F5F9', 
    text: '#000000', 
    border: '#CBD5E1' 
  },
  [Sportsbook.PRIZEPICKS]: { 
    bg: '#702AF5', 
    text: '#ffffff', 
    border: '#5319bf' 
  },
  [Sportsbook.UNDERDOG]: { 
    bg: '#FEC324', 
    text: '#000000', 
    border: '#d9a30f' 
  },
  [Sportsbook.DRAFTERS]: { 
    bg: '#00B5E2', 
    text: '#ffffff', 
    border: '#008fb3' 
  },
  [Sportsbook.BETR]: { 
    bg: '#8A2BE2', 
    text: '#ffffff', 
    border: '#6b1cb0' 
  },
  [Sportsbook.OTHER]: { 
    bg: '#1e293b', 
    text: '#94a3b8', 
    border: '#334155' 
  },
};
