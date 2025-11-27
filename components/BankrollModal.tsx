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
    if (isNaN(val) || val <= 0) return;

    let newStartingBankroll = 0;
    const currentBase = currentStartingBankroll || 0;

    if (mode === 'deposit') {
      newStartingBankroll = currentBase + val;
    } else if (mode === 'withdraw') {
      newStartingBankroll = currentBase - val;
    } else {
      newStartingBankroll = val;
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

    // For Reset, we show the effect on the Starting Base
    return {
      label: 'Current Base',
      currentVal: currentStartingBankroll || 0,
      newLabel: 'New Base',
      newVal: val
    };
  };

  const preview = getPreviewValues();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden">
        
        {!isFirstTime && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        )}

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mb-3">
            <Wallet size={24} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white">{isFirstTime ? 'Setup Bankroll' : 'Manage Bankroll'}</h2>
          {!isFirstTime && <p className="text-slate-400 text-sm mt-1">Deposit or Withdraw funds</p>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            
          {!isFirstTime && (
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setMode('deposit')}
                className={`flex items-center justify-center gap-1 py-2 rounded-md text-xs font-bold transition-all ${mode === 'deposit' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                <Plus size={14} /> Deposit
              </button>
              <button
                type="button"
                onClick={() => setMode('withdraw')}
                className={`flex items-center justify-center gap-1 py-2 rounded-md text-xs font-bold transition-all ${mode === 'withdraw' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                <Minus size={14} /> Withdraw
              </button>
              <button
                type="button"
                onClick={() => setMode('reset')}
                className={`flex items-center justify-center gap-1 py-2 rounded-md text-xs font-bold transition-all ${mode === 'reset' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                <RefreshCw size={14} /> Set New
              </button>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {mode === 'deposit' ? 'Deposit Amount' : mode === 'withdraw' ? 'Withdrawal Amount' : 'Starting Bankroll'}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-400 text-lg">$</span>
              <input 
                type="number"
                min="0.01"
                step="0.01"
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-8 pr-4 text-lg text-white font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all placeholder-slate-600"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Preview Section for Adjustments */}
          {!isFirstTime && preview && (
            <div className="bg-slate-800/50 rounded-lg p-3 flex items-center justify-between text-sm border border-slate-700/50">
              <div className="text-slate-400">
                <p className="text-[10px] uppercase font-bold">{preview.label}</p>
                <p>{formatCurrency(preview.currentVal)}</p>
              </div>
              <ArrowRight size={16} className="text-slate-500" />
              <div className="text-right">
                <p className={`text-[10px] uppercase font-bold ${mode === 'withdraw' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {preview.newLabel}
                </p>
                <p className="font-bold text-white">{formatCurrency(preview.newVal)}</p>
              </div>
            </div>
          )}

          <button 
            type="submit"
            disabled={!amount}
            className={`w-full font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg ${
              mode === 'withdraw' 
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/20' 
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:shadow-emerald-500/20'
            }`}
          >
            {mode === 'deposit' ? 'Add Funds' : mode === 'withdraw' ? 'Withdraw Funds' : isFirstTime ? 'Start Tracking' : 'Update Bankroll'}
          </button>
        </form>
      </div>
    </div>
  );
};