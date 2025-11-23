import React, { useState } from 'react';
import { Wallet } from 'lucide-react';

interface BankrollModalProps {
  onSetBankroll: (amount: number) => void;
}

export const BankrollModal: React.FC<BankrollModalProps> = ({ onSetBankroll }) => {
  const [amount, setAmount] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (val > 0) {
      onSetBankroll(val);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
            <Wallet size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Welcome to ProBet</h2>
          <p className="text-slate-400 mt-2">To get started, please enter your starting bankroll amount.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Starting Bankroll</label>
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
                placeholder="1000.00"
              />
            </div>
          </div>
          <button 
            type="submit"
            disabled={!amount}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-emerald-500/20"
          >
            Start Tracking
          </button>
        </form>
      </div>
    </div>
  );
};