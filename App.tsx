import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Wallet, TrendingUp, Percent, ArrowUpRight, ArrowDownRight, History, Settings, CloudCheck } from 'lucide-react';
import { Bet, BetStatus, BankrollState } from './types';
import { calculateBankrollStats, formatCurrency } from './utils/calculations';
import { StatsCard } from './components/StatsCard';
import { BetForm } from './components/BetForm';
import { BetList } from './components/BetList';
import { BankrollModal } from './components/BankrollModal';
import { DataManagementModal } from './components/DataManagementModal';

const STORAGE_KEY = 'probet_data_v1';

const App: React.FC = () => {
  const [bets, setBets] = useState<Bet[]>([]);
  const [startingBankroll, setStartingBankroll] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load data from local storage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setBets(parsed.bets || []);
        if (parsed.startingBankroll !== undefined && parsed.startingBankroll !== null) {
          setStartingBankroll(Number(parsed.startingBankroll));
        }
      } catch (e) {
        console.error("Failed to parse saved data", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save data whenever state changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        bets,
        startingBankroll
      }));
    }
  }, [bets, startingBankroll, isLoaded]);

  const bankrollStats: BankrollState = useMemo(() => {
    return calculateBankrollStats(startingBankroll || 0, bets);
  }, [bets, startingBankroll]);

  const handleAddBet = (betData: Omit<Bet, 'id' | 'createdAt'>) => {
    const newBet: Bet = {
      ...betData,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    setBets(prev => [newBet, ...prev]);
  };

  const handleUpdateStatus = (id: string, status: BetStatus) => {
    setBets(prev => prev.map(bet => {
      if (bet.id !== id) return bet;
      return { ...bet, status };
    }));
  };

  const handleEditBet = (updatedBet: Bet) => {
    setBets(prev => prev.map(b => b.id === updatedBet.id ? updatedBet : b));
  };

  const handleDeleteBet = (id: string) => {
    // Confirmation is now handled in the BetList UI component
    setBets(prev => prev.filter(b => b.id !== id));
  };

  const handleImportData = (data: { bets: Bet[], startingBankroll?: number }) => {
    // If the app is currently "empty" (no bets, or just starting bankroll set but no action), 
    // allow import without confirmation to make it smoother for the user.
    const isCleanState = bets.length === 0;

    if (isCleanState || confirm(`Found ${data.bets.length} bets. This will replace your current betting log. Continue?`)) {
      setBets(data.bets);
      if (data.startingBankroll !== undefined && data.startingBankroll !== null) {
        setStartingBankroll(data.startingBankroll);
      }
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-slate-950 pb-20 flex flex-col">
      <DataManagementModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onImport={handleImportData}
        currentData={{ bets, startingBankroll }}
      />

      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-lg flex items-center justify-center">
              <TrendingUp size={18} className="text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              ProBet Tracker
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
               <p className="text-xs text-slate-500 uppercase font-bold">Current Balance</p>
               <p className={`font-mono font-bold text-lg ${
                 bankrollStats.currentBalance >= (startingBankroll || 0) ? 'text-emerald-400' : 'text-rose-400'
               }`}>
                 {formatCurrency(bankrollStats.currentBalance)}
               </p>
             </div>
             
             <div className="w-px h-8 bg-slate-800 hidden sm:block"></div>

             <button
               onClick={() => setIsSettingsOpen(true)}
               className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all border border-transparent hover:border-slate-600"
               title="Data Settings (Backup/Restore)"
             >
               <Settings size={20} />
             </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-grow">
        
        {startingBankroll === null ? (
          <BankrollModal onSetBankroll={setStartingBankroll} />
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard 
                label="Bankroll" 
                value={formatCurrency(bankrollStats.currentBalance)}
                subValue={`${bankrollStats.currentBalance >= startingBankroll ? '+' : ''}${formatCurrency(bankrollStats.currentBalance - startingBankroll)} Net`}
                trend={bankrollStats.currentBalance >= startingBankroll ? 'up' : 'down'}
                icon={<Wallet size={20} />}
                highlight
              />
              <StatsCard 
                label="ROI" 
                value={`${bankrollStats.roi.toFixed(2)}%`}
                subValue="Return on Investment"
                trend={bankrollStats.roi > 0 ? 'up' : bankrollStats.roi < 0 ? 'down' : 'neutral'}
                icon={<Percent size={20} />}
              />
              <StatsCard 
                label="Record" 
                value={`${bankrollStats.wins}-${bankrollStats.losses}-${bankrollStats.pushes}`}
                subValue={`${((bankrollStats.wins / (bankrollStats.wins + bankrollStats.losses || 1)) * 100).toFixed(1)}% Win Rate`}
                trend="neutral"
                icon={<History size={20} />}
              />
              <StatsCard 
                label="Total Handle" 
                value={formatCurrency(bankrollStats.totalWagered)}
                subValue={`${bets.filter(b => b.status === BetStatus.PENDING).length} Pending Bets`}
                trend="neutral"
                icon={<LayoutDashboard size={20} />}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Form */}
              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  <BetForm onAddBet={handleAddBet} />
                  
                  {/* Mini Insight / Tip Box */}
                  <div className="mt-6 p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                    <h4 className="text-emerald-400 font-bold text-sm mb-2 flex items-center gap-2">
                      <TrendingUp size={14} /> Smart Betting Tip
                    </h4>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Always shop for the best lines. A difference of half a point or +5 on the odds can significantly impact your long-term ROI.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: List */}
              <div className="lg:col-span-2">
                <BetList 
                  bets={bets} 
                  onUpdateStatus={handleUpdateStatus} 
                  onDelete={handleDeleteBet}
                  onEdit={handleEditBet}
                />
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer / Status Bar */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
             <p>© 2024 ProBet Tracker. All data stored locally.</p>
             <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full border border-slate-800">
                <CloudCheck size={14} className="text-emerald-500" />
                <span>Auto-saved to device</span>
             </div>
          </div>
      </footer>
    </div>
  );
};

export default App;