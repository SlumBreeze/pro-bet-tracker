import React, { useState, useEffect } from 'react';
import { Wallet, Plus, Minus, RefreshCw, X, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

interface BankrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetBankroll: (amount: number) => void;
  currentStartingBankroll: number | null;
  currentBalance?: number;
}

export const BankrollModal: React.FC<BankrollModalProps> = ({ 
  isOpen, 
  onClose, 
  onSetBankroll, 
  currentStartingBankroll,
  currentBalance = 0
}) => {
  const [mode, setMode] = useState<'deposit' | 'withdraw' | 'reset'>('deposit');
  const [amount, setAmount] = useState<string>('');

  const isFirstTime = currentStartingBankroll === null;

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      // Default to reset (setup) if first time, otherwise deposit
      setMode(isFirstTime ? 'reset' : 'deposit');
    }
  }, [isOpen, isFirstTime]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val)) return;

    let newStartingBankroll = 0;
    const currentBase = currentStartingBankroll || 0;

    if (mode === 'deposit') {
      newStartingBankroll = currentBase + val;
    } else if (mode === 'withdraw') {
      newStartingBankroll = currentBase - val;
    } else {
      // Reset / Set New Logic (Target Balance)
      if (isFirstTime) {
         newStartingBankroll = val;
      } else {
         // If user wants the Current Balance to be `val`, we need to adjust the base.
         // CurrentBalance = Base + NetPnL
         // Val = NewBase + NetPnL
         // NewBase = Val - NetPnL
         // NetPnL = CurrentBalance - Base
         const netPnL = currentBalance - currentBase;
         newStartingBankroll = val - netPnL;
      }
    }

    onSetBankroll(newStartingBankroll);
    if (!isFirstTime) onClose();
  };

  const getPreviewValues = () => {
    const val = parseFloat(amount);
    if (isNaN(val)) return null;

    // For Deposit/Withdraw, we show the effect on the Total Balance
    if (mode === 'deposit') {
      return {
        label: 'Current Balance',
        currentVal: currentBalance,
        newLabel: 'New Balance',
        newVal: currentBalance + val
      };
    }
    
    if (mode === 'withdraw') {
       return {
        label: 'Current Balance',
        currentVal: currentBalance,
        newLabel: 'New Balance',
        newVal: currentBalance - val
      };
    }

    // For Reset (Calibrate), we show Current Balance -> Target Balance
    return {
      label: 'Current Balance',
      currentVal: currentBalance,
      newLabel: 'New Target',
      newVal: val
    };
  };

  const preview = getPreviewValues();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-ink-paper border border-ink-gray rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden">
        
        {!isFirstTime && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-ink-text/40 hover:text-ink-text transition-colors"
          >
            <X size={20} />
          </button>
        )}

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 bg-ink-accent/10 rounded-full flex items-center justify-center mb-3 shadow-sm">
            <Wallet size={24} className="text-ink-accent" />
          </div>
          <h2 className="text-xl font-bold text-ink-text">{isFirstTime ? 'Setup Bankroll' : 'Manage Bankroll'}</h2>
          {!isFirstTime && <p className="text-ink-text/60 text-sm mt-1">Adjust your balance</p>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            
          {!isFirstTime && (
            <div className="grid grid-cols-3 gap-2 p-1 bg-ink-base rounded-lg border border-ink-gray">
              <button
                type="button"
                onClick={() => setMode('deposit')}
                className={`flex items-center justify-center gap-1 py-2 rounded-md text-xs font-bold transition-all ${mode === 'deposit' ? 'bg-status-win text-white shadow-sm' : 'text-ink-text/60 hover:text-ink-text'}`}
              >
                <Plus size={14} /> Deposit
              </button>
              <button
                type="button"
                onClick={() => setMode('withdraw')}
                className={`flex items-center justify-center gap-1 py-2 rounded-md text-xs font-bold transition-all ${mode === 'withdraw' ? 'bg-status-loss text-white shadow-sm' : 'text-ink-text/60 hover:text-ink-text'}`}
              >
                <Minus size={14} /> Withdraw
              </button>
              <button
                type="button"
                onClick={() => setMode('reset')}
                className={`flex items-center justify-center gap-1 py-2 rounded-md text-xs font-bold transition-all ${mode === 'reset' ? 'bg-ink-accent text-white shadow-sm' : 'text-ink-text/60 hover:text-ink-text'}`}
              >
                <RefreshCw size={14} /> Set New
              </button>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-ink-text/60 uppercase tracking-wider">
              {mode === 'deposit' ? 'Deposit Amount' : mode === 'withdraw' ? 'Withdrawal Amount' : 'Target Balance'}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-ink-text/40 text-lg">$</span>
              <input 
                type="number"
                min="0.01"
                step="0.01"
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-white border border-ink-gray rounded-xl py-3 pl-8 pr-4 text-lg text-ink-text font-bold focus:ring-2 focus:ring-ink-accent focus:border-transparent outline-none transition-all placeholder-ink-text/30"
                placeholder="0.00"
              />
            </div>
            {mode === 'reset' && !isFirstTime && (
                <p className="text-[10px] text-ink-text/60 italic">This will calibrate your account so your Current Balance equals exactly what you enter.</p>
            )}
          </div>

          {/* Preview Section for Adjustments */}
          {!isFirstTime && preview && (
            <div className="bg-ink-base/50 rounded-lg p-3 flex items-center justify-between text-sm border border-ink-gray">
              <div className="text-ink-text/60">
                <p className="text-[10px] uppercase font-bold">{preview.label}</p>
                <p>{formatCurrency(preview.currentVal)}</p>
              </div>
              <ArrowRight size={16} className="text-ink-text/40" />
              <div className="text-right">
                <p className={`text-[10px] uppercase font-bold ${mode === 'withdraw' ? 'text-status-loss' : 'text-status-win'}`}>
                  {preview.newLabel}
                </p>
                <p className="font-bold text-ink-text">{formatCurrency(preview.newVal)}</p>
              </div>
            </div>
          )}

          <button 
            type="submit"
            disabled={!amount}
            className={`w-full font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg ${
              mode === 'withdraw' 
                ? 'bg-status-loss hover:bg-rose-500 text-white' 
                : 'bg-status-win hover:bg-emerald-500 text-white'
            }`}
          >
            {mode === 'deposit' ? 'Add Funds' : mode === 'withdraw' ? 'Withdraw Funds' : isFirstTime ? 'Start Tracking' : 'Calibrate Balance'}
          </button>
        </form>
      </div>
    </div>
  );
};