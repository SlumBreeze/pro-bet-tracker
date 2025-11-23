import { Bet, BetStatus, BankrollState } from '../types';

/**
 * Calculates the potential profit for a given wager and American odds.
 * Does not include the returned stake.
 */
export const calculatePotentialProfit = (wager: number, odds: number): number => {
  if (odds === 0) return 0;
  
  let profit = 0;
  if (odds > 0) {
    profit = wager * (odds / 100);
  } else {
    profit = wager * (100 / Math.abs(odds));
  }
  
  // Return rounded to 2 decimals
  return Math.round(profit * 100) / 100;
};

export const calculateBankrollStats = (startingBalance: number, bets: Bet[]): BankrollState => {
  let currentBalance = startingBalance;
  let totalWagered = 0;
  let totalWon = 0; // Net profit
  let totalLost = 0;
  let wins = 0;
  let losses = 0;
  let pushes = 0;

  bets.forEach((bet) => {
    // Only count settled bets towards W-L record
    if (bet.status !== BetStatus.PENDING) {
      if (bet.status === BetStatus.WON) {
        currentBalance += bet.potentialProfit;
        totalWon += bet.potentialProfit;
        totalWagered += bet.wager;
        wins++;
      } else if (bet.status === BetStatus.LOST) {
        currentBalance -= bet.wager;
        totalLost += bet.wager;
        totalWagered += bet.wager;
        losses++;
      } else if (bet.status === BetStatus.PUSH) {
        // Money back, no change in balance, but tracked
        totalWagered += bet.wager;
        pushes++;
      }
    } else {
        // Pending bets: Deduct wager from available balance
        currentBalance -= bet.wager;
    }
  });

  const totalSettledBets = wins + losses + pushes;
  const netProfit = totalWon - totalLost;
  
  const settledWagered = bets
    .filter(b => b.status !== BetStatus.PENDING)
    .reduce((acc, b) => acc + b.wager, 0);

  const roi = settledWagered > 0 ? (netProfit / settledWagered) * 100 : 0;

  return {
    startingBalance,
    currentBalance,
    totalWagered,
    totalWon,
    totalLost,
    totalBets: bets.length,
    wins,
    losses,
    pushes,
    roi,
  };
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  // Split the YYYY-MM-DD string and create a date object using local time
  // This prevents the timezone offset issue where "2023-11-22" (UTC) becomes "11/21" (EST)
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};