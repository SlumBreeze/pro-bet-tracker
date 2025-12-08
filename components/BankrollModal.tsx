import React, { useState } from 'react';
import { Wallet, Plus, Minus, X, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';
import { BookBalanceDisplay } from '../types';
import { SPORTSBOOK_THEME, SPORTSBOOKS } from '../constants';

interface BankrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookBalances: BookBalanceDisplay[];
  onUpdateBookDeposit: (sportsbook: string, newDepositAmount: number) => void;
  totalBankroll: number;
}

export const BankrollModal: React.FC<BankrollModalProps> = ({ 
  isOpen, 
  onClose, 
  bookBalances,
  onUpdateBookDeposit,
  totalBankroll
}) => {
  const [editingBook, setEditingBook] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');

  if (!isOpen) return null;

  const handleStartEdit = (book: string) => {
    setEditingBook(book);
    setAmount('');
    setMode('deposit');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook) return;

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    const currentBook = bookBalances.find(b => b.sportsbook === editingBook);
    if (!currentBook) return;

    let newDeposit = currentBook.deposited;
    if (mode === 'deposit') {
        newDeposit += val;
    } else {
        newDeposit -= val;
        if (newDeposit < 0) newDeposit = 0; // Prevent negative deposit record, though practically balance can be neg
    }

    onUpdateBookDeposit(editingBook, newDeposit);
    setEditingBook(null);
  };

  const getBookTheme = (bookName: string) => {
      // Find theme or partial match
      const key = SPORTSBOOKS.find(s => s === bookName) || 'Other';
      return SPORTSBOOK_THEME[key] || SPORTSBOOK_THEME['Other'];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-ink-paper border border-ink-gray rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative flex flex-col max-h-[90vh]">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-text/40 hover:text-ink-text transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 bg-ink-accent/10 rounded-full flex items-center justify-center mb-3 shadow-sm">
            <Wallet size={24} className="text-ink-accent" />
          </div>
          <h2 className="text-xl font-bold text-ink-text">Manage Sportsbooks</h2>
          <p className="text-ink-text/60 text-sm mt-1">
             Total Bankroll: <span className="text-ink-text font-bold">{formatCurrency(totalBankroll)}</span>
          </p>
        </div>

        {/* Editing Overlay/Modal */}
        {editingBook && (
            <div className="absolute inset-0 z-10 bg-white/95 backdrop-blur-sm rounded-2xl flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-full max-w-sm">
                     <h3 className="text-lg font-bold text-center mb-4 text-ink-text">Update {editingBook}</h3>
                     <div className="flex p-1 bg-ink-base rounded-lg border border-ink-gray mb-4">
                        <button
                            type="button"
                            onClick={() => setMode('deposit')}
                            className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${mode === 'deposit' ? 'bg-status-win text-white shadow-sm' : 'text-ink-text/60 hover:text-ink-text'}`}
                        >
                            Deposit
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('withdraw')}
                            className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${mode === 'withdraw' ? 'bg-status-loss text-white shadow-sm' : 'text-ink-text/60 hover:text-ink-text'}`}
                        >
                            Withdraw
                        </button>
                    </div>
                     <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-ink-text/60 uppercase tracking-wider block mb-2">Amount</label>
                            <input 
                                type="number" 
                                min="0.01" 
                                step="0.01" 
                                autoFocus
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-white border border-ink-gray rounded-xl py-3 px-4 text-lg font-bold outline-none focus:ring-2 focus:ring-ink-accent"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="flex gap-2">
                             <button 
                                type="button"
                                onClick={() => setEditingBook(null)}
                                className="flex-1 py-3 bg-white border border-ink-gray text-ink-text font-bold rounded-xl"
                             >
                                Cancel
                             </button>
                             <button 
                                type="submit"
                                className={`flex-1 py-3 text-white font-bold rounded-xl ${mode === 'deposit' ? 'bg-status-win' : 'bg-status-loss'}`}
                             >
                                Confirm
                             </button>
                        </div>
                     </form>
                </div>
            </div>
        )}

        <div className="overflow-y-auto pr-2 -mr-2 space-y-3 flex-1">
             {bookBalances.map(book => {
                 const theme = getBookTheme(book.sportsbook);
                 const hasFunds = book.currentBalance > 0.01;
                 const isPositivePnL = book.currentBalance >= book.deposited;
                 
                 return (
                     <div key={book.sportsbook} className="flex items-center justify-between p-4 bg-ink-base/50 rounded-xl border border-ink-gray hover:border-ink-accent/30 transition-all">
                         <div className="flex items-center gap-3">
                             <div 
                                className="w-2 h-10 rounded-full" 
                                style={{ backgroundColor: theme.bg }}
                             ></div>
                             <div>
                                 <h4 className="font-bold text-ink-text text-sm">{book.sportsbook}</h4>
                                 <p className="text-[10px] text-ink-text/60 font-medium">Deposited: {formatCurrency(book.deposited)}</p>
                             </div>
                         </div>

                         <div className="flex items-center gap-6">
                            <div className="text-right">
                                <p className={`font-mono font-bold ${hasFunds ? 'text-ink-text' : 'text-ink-text/40'}`}>
                                    {formatCurrency(book.currentBalance)}
                                </p>
                                <p className={`text-[10px] font-medium ${isPositivePnL ? 'text-status-win' : 'text-status-loss'}`}>
                                    {isPositivePnL ? '+' : ''}{formatCurrency(book.currentBalance - book.deposited)}
                                </p>
                            </div>

                            <div className="flex gap-1">
                                <button 
                                    onClick={() => handleStartEdit(book.sportsbook)}
                                    className="p-2 rounded-lg bg-white border border-ink-gray hover:bg-ink-gray/20 text-ink-text/60 hover:text-ink-accent transition-colors"
                                    title="Add/Remove Funds"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                         </div>
                     </div>
                 );
             })}
        </div>
        
        <div className="mt-6 pt-4 border-t border-ink-gray flex justify-between items-center">
            <p className="text-xs text-ink-text/40 flex items-center gap-1">
                <AlertCircle size={12}/>
                Funds shown include deposits and settled profit.
            </p>
            <button 
                onClick={onClose}
                className="px-6 py-2 bg-ink-text text-white text-sm font-bold rounded-lg hover:bg-ink-text/80 transition-colors"
            >
                Done
            </button>
        </div>
      </div>
    </div>
  );
};
