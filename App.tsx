import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, TrendingUp, Percent, BarChart3, Activity, Settings, History, Edit2, LayoutList, Calendar, Loader2 } from 'lucide-react';
import { supabase } from './lib/supabase';
import { Bet, BetStatus, BankrollState, AdvancedStats, Sportsbook, BookDeposit } from './types';
import { calculateBankrollStats, calculateAdvancedStats, calculateBankrollHistory, calculateBookBalances, formatCurrency, inferSportFromBet } from './utils/calculations';
import { StatsCard } from './components/StatsCard';
import { BetForm } from './components/BetForm';
import { BetList } from './components/BetList';
import { ProfitCalendar } from './components/ProfitCalendar';
import { BankrollModal } from './components/BankrollModal';
import { DataManagementModal } from './components/DataManagementModal';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';

const App: React.FC = () => {
  const [bets, setBets] = useState<Bet[]>([]);
  // Use bookDeposits array instead of single number
  const [bookDeposits, setBookDeposits] = useState<BookDeposit[]>([]);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isBankrollModalOpen, setIsBankrollModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // 1. Load Data on Mount (Supabase for Bets AND Book Balances)
  useEffect(() => {
    const loadData = async () => {
      setIsSyncing(true);
      
      // Fetch Book Balances from Cloud
      try {
        const { data: books, error } = await supabase
          .from('book_balances')
          .select('sportsbook, deposited');
        
        if (error) throw error;

        if (books) {
          setBookDeposits(books as BookDeposit[]);
        }
      } catch (err: any) {
        // Gracefully handle missing table error
        const msg = err.message || JSON.stringify(err);
        if (msg.includes('Could not find the table') || msg.includes('relation "public.book_balances" does not exist')) {
            console.warn('Database table "book_balances" is missing. Please run the SQL migration.');
        } else {
            console.error('Error loading book balances from Supabase:', msg);
        }
      }

      // Load Bets from Supabase
      try {
        const { data, error } = await supabase
          .from('bets')
          .select('*')
          .order('createdAt', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        if (data) {
          // Sanitize data: ensure numerical values are numbers
          const safeData = data.map((b: any) => ({
            ...b,
            createdAt: Number(b.createdAt), 
            tags: b.tags || []
          }));
          setBets(safeData as Bet[]);
        }
      } catch (err: any) {
        console.error('Error loading bets from Supabase:', err.message || err);
      } finally {
        setIsLoaded(true);
        setIsSyncing(false);
      }
    };

    loadData();
  }, []);

  // 2. Initial Setup Modal Trigger
  useEffect(() => {
    // Smart Modal Logic: Only open it if isLoaded is true AND no deposits exist (new user)
    // Checking bets.length is a fallback, but deposits check is more accurate for "setup"
    if (isLoaded && bookDeposits.length === 0 && bets.length === 0) {
      setIsBankrollModalOpen(true);
    }
  }, [isLoaded, bookDeposits.length, bets.length]);

  // 3. Update Individual Book Deposit (Cloud Sync)
  const handleUpdateBookDeposit = async (sportsbook: string, amount: number) => {
    // Optimistic Update
    setBookDeposits(prev => {
        const exists = prev.find(b => b.sportsbook === sportsbook);
        if (exists) {
            return prev.map(b => b.sportsbook === sportsbook ? { ...b, deposited: amount } : b);
        }
        return [...prev, { sportsbook, deposited: amount }];
    });

    try {
      // Using upsert based on unique sportsbook constraint
      const { error } = await supabase
        .from('book_balances')
        .upsert({ sportsbook, deposited: amount }, { onConflict: 'sportsbook' });
      
      if (error) throw error;
    } catch (err: any) {
      const msg = err.message || JSON.stringify(err);
      console.error('Error syncing book balance to cloud:', msg);
      
      if (msg.includes('Could not find the table') || msg.includes('relation "public.book_balances" does not exist')) {
        alert("Setup Required: The 'book_balances' table is missing in Supabase.\n\nPlease run the SQL script provided in the instructions to create it.");
      } else {
        // Silent fail or optional alert for other errors
        // alert('Failed to sync book balance to the cloud.');
      }
    }
  };

  const bankrollStats: BankrollState = useMemo(() => {
    return calculateBankrollStats(bookDeposits, bets);
  }, [bets, bookDeposits]);

  const bookBalances = useMemo(() => {
      return calculateBookBalances(bets, bookDeposits);
  }, [bets, bookDeposits]);

  const advancedStats: AdvancedStats = useMemo(() => {
    return calculateAdvancedStats(bets);
  }, [bets]);

  const bankrollHistory = useMemo(() => {
    return calculateBankrollHistory(bankrollStats.startingBalance, bets);
  }, [bankrollStats.startingBalance, bets]);

  const handleAddBet = async (betData: Omit<Bet, 'id' | 'createdAt'>) => {
    const newBet: Bet = {
      ...betData,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      tags: betData.tags || [], // Ensure tags is defined for SQL
    };

    // Optimistic Update
    setBets(prev => [newBet, ...prev]);

    try {
      const { error } = await supabase.from('bets').insert([newBet]);
      if (error) {
        console.error('Supabase insert error:', error.message);
        // Revert on error
        setBets(prev => prev.filter(b => b.id !== newBet.id));
        alert(`Failed to save bet: ${error.message}`);
      }
    } catch (err: any) {
      console.error('Insert exception:', err);
      setBets(prev => prev.filter(b => b.id !== newBet.id));
      alert('Error saving bet. See console.');
    }
  };

  const handleUpdateStatus = async (id: string, status: BetStatus) => {
    // Optimistic Update
    setBets(prev => prev.map(bet => {
      if (bet.id !== id) return bet;
      return { ...bet, status };
    }));

    try {
      const { error } = await supabase
        .from('bets')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    } catch (err: any) {
      console.error('Supabase update status error:', err.message);
      alert('Failed to update status in cloud. Refreshing...');
    }
  };

  const handleEditBet = async (updatedBet: Bet) => {
    // Optimistic Update
    setBets(prev => prev.map(b => b.id === updatedBet.id ? updatedBet : b));

    try {
      const { error } = await supabase
        .from('bets')
        .update({
          matchup: updatedBet.matchup,
          pick: updatedBet.pick,
          odds: updatedBet.odds,
          wager: updatedBet.wager,
          potentialProfit: updatedBet.potentialProfit,
          sportsbook: updatedBet.sportsbook,
          tags: updatedBet.tags
        })
        .eq('id', updatedBet.id);

      if (error) throw error;
    } catch (err: any) {
      console.error('Supabase edit error:', err.message);
      alert('Failed to update bet in cloud.');
    }
  };

  const handleDeleteBet = async (id: string) => {
    // Optimistic Update
    const previousBets = [...bets];
    setBets(prev => prev.filter(b => b.id !== id));

    try {
      const { error } = await supabase
        .from('bets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err: any) {
      console.error('Supabase delete error:', err.message);
      // Revert
      setBets(previousBets);
      alert('Failed to delete bet from cloud.');
    }
  };

  const handleImportData = async (data: { bets: Bet[], startingBankroll?: number }) => {
     // NOTE: Import logic for bankroll is tricky with multi-book. 
     // For now, we just import bets. Bankroll management should be done via new modal.
    const isCleanState = bets.length === 0;
    if (isCleanState || confirm(`This will import ${data.bets.length} bets. Continue?`)) {
      setIsSyncing(true);
      const processedBets = data.bets.map((b: any) => ({
        ...b,
        sport: (b.sport && b.sport !== 'Other') ? b.sport : inferSportFromBet(b),
        sportsbook: b.sportsbook === 'ESPN Bet' ? Sportsbook.THESCOREBET : b.sportsbook,
        tags: b.tags || []
      }));

      // Update Local State
      setBets(prev => [...processedBets, ...prev]); 

      // Bulk Insert to Supabase
      try {
        const { error } = await supabase.from('bets').insert(processedBets);
        if (error) throw error;
        alert('Import successful and synced to cloud!');
      } catch (err: any) {
        console.error('Supabase import error:', err.message);
        alert(`Imported locally, but failed to sync to cloud: ${err.message}`);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  if (!isLoaded) return (
    <div className="min-h-screen bg-ink-base flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-ink-accent" size={32} />
        <p className="text-ink-text/60 font-medium">Loading your betting history...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-base pb-20 flex flex-col font-sans">
      <DataManagementModal 
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        onImport={handleImportData}
        currentData={{ bets, startingBankroll: bankrollStats.startingBalance }}
      />

      <BankrollModal 
        isOpen={isBankrollModalOpen}
        onClose={() => setIsBankrollModalOpen(false)}
        onUpdateBookDeposit={handleUpdateBookDeposit}
        bookBalances={bookBalances}
        totalBankroll={bankrollStats.currentBalance}
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
            {isSyncing && <Loader2 size={14} className="animate-spin text-ink-text/40 ml-2" />}
          </div>
          
          <div className="flex items-center gap-4">
               <div className="text-right hidden sm:block">
                 <p className="text-[10px] text-ink-text/60 uppercase font-bold tracking-wider mb-0.5">Total Balance</p>
                 <div className="flex items-center justify-end gap-2">
                    <p className={`font-mono font-bold text-lg leading-none ${
                      bankrollStats.currentBalance >= bankrollStats.startingBalance ? 'text-status-win' : 'text-status-loss'
                    }`}>
                      {formatCurrency(bankrollStats.currentBalance)}
                    </p>
                    <button 
                      onClick={() => setIsBankrollModalOpen(true)}
                      className="p-1 rounded-md text-ink-text/40 hover:text-ink-accent hover:bg-ink-accent/10 transition-all flex items-center gap-1"
                      title="Manage Books"
                    >
                      <span className="text-xs font-bold px-1">Manage Books</span>
                      <Edit2 size={14} />
                    </button>
                 </div>
               </div>
             
             <div className="w-px h-8 bg-ink-gray hidden sm:block"></div>

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
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatsCard 
                label="Total Bankroll" 
                value={formatCurrency(bankrollStats.currentBalance)}
                subValue={`${bankrollStats.currentBalance >= bankrollStats.startingBalance ? '+' : ''}${formatCurrency(bankrollStats.currentBalance - bankrollStats.startingBalance)} Net`}
                trend={bankrollStats.currentBalance >= bankrollStats.startingBalance ? 'up' : 'down'}
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
                    bookBalances={bookBalances}
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
      </main>

      {/* Footer / Status Bar */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-text/40">
             <p>© 2024 ProBet Tracker. Cloud Sync Active.</p>
          </div>
      </footer>
    </div>
  );
};

export default App;