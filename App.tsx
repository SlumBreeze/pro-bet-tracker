import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, TrendingUp, Percent, BarChart3, Activity, Settings, History, Edit2, LayoutList, Calendar } from 'lucide-react';
import { Bet, BetStatus, BankrollState, AdvancedStats, Sportsbook } from './types';
import { calculateBankrollStats, calculateAdvancedStats, calculateBankrollHistory, formatCurrency, inferSportFromBet } from './utils/calculations';
import { StatsCard } from './components/StatsCard';
import { BetForm } from './components/BetForm';
import { BetList } from './components/BetList';
import { ProfitCalendar } from './components/ProfitCalendar';
import { BankrollModal } from './components/BankrollModal';
import { DataManagementModal } from './components/DataManagementModal';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';

const STORAGE_KEY = 'probet_data_v1';

const App: React.FC = () => {
  const [bets, setBets] = useState<Bet[]>([]);
  const [startingBankroll, setStartingBankroll] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isBankrollModalOpen, setIsBankrollModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // 1. Load Local Data on Mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        let loadedBets = parsed.bets || [];
        // Migration: Add sport if missing using inference, and rename ESPN Bet to theScore Bet
        loadedBets = loadedBets.map((b: any) => ({
           ...b,
           sport: (b.sport && b.sport !== 'Other') ? b.sport : inferSportFromBet(b),
           sportsbook: b.sportsbook === 'ESPN Bet' ? Sportsbook.THESCOREBET : b.sportsbook
        }));
        setBets(loadedBets);
        if (parsed.startingBankroll !== undefined && parsed.startingBankroll !== null) {
          setStartingBankroll(Number(parsed.startingBankroll));
        }
      } catch (e) {
        console.error("Failed to parse saved data", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // 2. Initial Setup Modal Trigger
  useEffect(() => {
    if (isLoaded && startingBankroll === null) {
      setIsBankrollModalOpen(true);
    }
  }, [isLoaded, startingBankroll]);

  // 3. Save Changes (Local Storage)
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      bets,
      startingBankroll
    }));
  }, [bets, startingBankroll, isLoaded]);

  const bankrollStats: BankrollState = useMemo(() => {
    return calculateBankrollStats(startingBankroll || 0, bets);
  }, [bets, startingBankroll]);

  const advancedStats: AdvancedStats = useMemo(() => {
    return calculateAdvancedStats(bets);
  }, [bets]);

  const bankrollHistory = useMemo(() => {
    return calculateBankrollHistory(startingBankroll || 0, bets);
  }, [startingBankroll, bets]);

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
    setBets(prev => prev.filter(b => b.id !== id));
  };

  const handleImportData = (data: { bets: Bet[], startingBankroll?: number }) => {
    const isCleanState = bets.length === 0;
    if (isCleanState || confirm(`Found ${data.bets.length} bets. This will replace your current betting log. Continue?`)) {
      const processedBets = data.bets.map((b: any) => ({
        ...b,
        sport: (b.sport && b.sport !== 'Other') ? b.sport : inferSportFromBet(b),
        sportsbook: b.sportsbook === 'ESPN Bet' ? Sportsbook.THESCOREBET : b.sportsbook
      }));
      setBets(processedBets);
      if (data.startingBankroll !== undefined && data.startingBankroll !== null) {
        setStartingBankroll(data.startingBankroll);
      }
    }
  };

  const handleSetBankroll = (amount: number) => {
    setStartingBankroll(amount);
    setIsBankrollModalOpen(false);
  };

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-ink-base pb-20 flex flex-col font-sans">
      <DataManagementModal 
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        onImport={handleImportData}
        currentData={{ bets, startingBankroll }}
      />

      <BankrollModal 
        isOpen={isBankrollModalOpen}
        onClose={() => setIsBankrollModalOpen(false)}
        onSetBankroll={handleSetBankroll}
        currentStartingBankroll={startingBankroll}
        currentBalance={bankrollStats.currentBalance}
      />

      {/* Header */}
      <header className="bg-ink-paper/80 backdrop-blur-md border-b border-ink-gray sticky top-0 z-40 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-ink-accent rounded-lg flex items-center justify-center shadow-sm">
              <TrendingUp size={18} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-ink-text tracking-tight">
              ProBet Tracker
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
             {startingBankroll !== null && (
               <div className="text-right hidden sm:block">
                 <p className="text-[10px] text-ink-text/60 uppercase font-bold tracking-wider mb-0.5">Current Balance</p>
                 <div className="flex items-center justify-end gap-2">
                    <p className={`font-mono font-bold text-lg leading-none ${
                      bankrollStats.currentBalance >= (startingBankroll || 0) ? 'text-status-win' : 'text-status-loss'
                    }`}>
                      {formatCurrency(bankrollStats.currentBalance)}
                    </p>
                    <button 
                      onClick={() => setIsBankrollModalOpen(true)}
                      className="p-1 rounded-md text-ink-text/40 hover:text-ink-accent hover:bg-ink-accent/10 transition-all"
                      title="Manage Bankroll"
                    >
                      <Edit2 size={14} />
                    </button>
                 </div>
               </div>
             )}
             
             {startingBankroll !== null && <div className="w-px h-8 bg-ink-gray hidden sm:block"></div>}

             <div className="flex gap-2">
                <button
                  onClick={() => setIsDataModalOpen(true)}
                  className="p-2 rounded-lg bg-white border border-ink-gray text-ink-text/60 hover:text-ink-accent hover:border-ink-accent transition-all shadow-sm"
                  title="Settings & Backup"
                >
                  <Settings size={20} />
                </button>
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-grow">
        
        {startingBankroll !== null && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatsCard 
                label="Bankroll" 
                value={formatCurrency(bankrollStats.currentBalance)}
                subValue={`${bankrollStats.currentBalance >= startingBankroll ? '+' : ''}${formatCurrency(bankrollStats.currentBalance - startingBankroll)} Net`}
                trend={bankrollStats.currentBalance >= startingBankroll ? 'up' : 'down'}
                icon={<Wallet size={20} />}
                highlight
              />
              <StatsCard 
                label="Actual ROI" 
                value={`${bankrollStats.roi.toFixed(2)}%`}
                subValue="Money Weighted"
                trend={bankrollStats.roi > 0 ? 'up' : bankrollStats.roi < 0 ? 'down' : 'neutral'}
                icon={<Percent size={20} />}
              />
              <StatsCard 
                label="Flat ROI" 
                value={`${bankrollStats.flatROI.toFixed(2)}%`}
                subValue="Unit Weighted (Skill)"
                trend={bankrollStats.flatROI > 0 ? 'up' : bankrollStats.flatROI < 0 ? 'down' : 'neutral'}
                icon={<Activity size={20} />}
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
                icon={<BarChart3 size={20} />}
              />
            </div>

            {/* Streak & Analytics Section */}
            <div className="border-t border-ink-gray pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-ink-text flex items-center gap-2">
                  <Activity size={20} className="text-ink-accent" />
                  Performance Analytics
                </h3>
              </div>
              <AnalyticsDashboard stats={advancedStats} bankrollHistory={bankrollHistory} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Form */}
              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  <BetForm 
                    onAddBet={handleAddBet} 
                    currentBalance={bankrollStats.currentBalance}
                  />
                  
                  {/* Mini Insight / Tip Box */}
                  <div className="mt-6 p-4 rounded-xl border border-ink-gray bg-ink-paper/50 backdrop-blur-sm shadow-sm">
                    <h4 className="text-ink-accent font-bold text-sm mb-2 flex items-center gap-2">
                      <TrendingUp size={14} /> Smart Betting Tip
                    </h4>
                    <p className="text-ink-text/80 text-sm leading-relaxed mb-2">
                      <span className="text-ink-text font-medium">Actual vs. Flat ROI:</span>
                    </p>
                    <ul className="text-xs text-ink-text/60 space-y-1 list-disc pl-4">
                        <li>If <b>Actual {'>'} Flat</b>: Your bet sizing is excellent (you bet more on winning plays).</li>
                        <li>If <b>Flat {'>'} Actual</b>: You are picking well but losing money on big bets. Consider flat betting.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Right Column: List */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-end mb-4">
                    <div className="bg-ink-paper border border-ink-gray rounded-lg p-1 flex gap-1">
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-ink-accent text-white shadow-sm' : 'text-ink-text/60 hover:text-ink-text'}`}
                            title="List View"
                        >
                            <LayoutList size={16} />
                        </button>
                        <button 
                            onClick={() => setViewMode('calendar')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-ink-accent text-white shadow-sm' : 'text-ink-text/40 hover:text-ink-text'}`}
                            title="Calendar View"
                        >
                            <Calendar size={16} />
                        </button>
                    </div>
                </div>

                {viewMode === 'list' ? (
                  <BetList 
                    bets={bets} 
                    onUpdateStatus={handleUpdateStatus} 
                    onDelete={handleDeleteBet}
                    onEdit={handleEditBet}
                  />
                ) : (
                  <ProfitCalendar bets={bets} />
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer / Status Bar */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-text/40">
             <p>© 2024 ProBet Tracker. Data stored locally.</p>
          </div>
      </footer>
    </div>
  );
};

export default App;