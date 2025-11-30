
import React from 'react';
import { AdvancedStats } from '../types';
import { formatCurrency } from '../utils/calculations';
import { Trophy, AlertTriangle } from 'lucide-react';

interface AnalyticsDashboardProps {
  stats: AdvancedStats;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ stats }) => {
  // If no data, don't show dashboard
  if (stats.last10.length === 0) return null;

  return (
    <div className="space-y-6">
      
      {/* Hot/Cold Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Hottest Sport */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
               <Trophy size={20} />
            </div>
            <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Best Sport</span>
          </div>
          {stats.hottestSport ? (
            <div>
              <h4 className="text-2xl font-bold text-white">{stats.hottestSport.name}</h4>
              <p className="text-emerald-400 font-mono text-sm font-bold">+{formatCurrency(stats.hottestSport.profit)}</p>
              <p className="text-slate-500 text-xs mt-1">Record: {stats.hottestSport.record}</p>
            </div>
          ) : (
            <div className="h-full flex flex-col justify-center">
              <p className="text-slate-500 text-sm">Not enough data</p>
            </div>
          )}
        </div>

        {/* Coldest Sport */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative">
           <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
               <AlertTriangle size={20} />
            </div>
            <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Worst Sport</span>
          </div>
          {stats.coldestSport ? (
            <div>
              <h4 className="text-2xl font-bold text-white">{stats.coldestSport.name}</h4>
              <p className="text-rose-400 font-mono text-sm font-bold">{formatCurrency(stats.coldestSport.profit)}</p>
              <p className="text-slate-500 text-xs mt-1">Record: {stats.coldestSport.record}</p>
            </div>
          ) : (
             <div className="h-full flex flex-col justify-center">
               <p className="text-slate-500 text-sm">Not enough data</p>
             </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* Performance By Book */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800 bg-slate-950">
             <h3 className="font-bold text-white text-sm">Profit by Sportsbook</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-2">Book</th>
                <th className="px-4 py-2 text-right">Profit</th>
                <th className="px-4 py-2 text-right">Win %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {stats.bookPerformance.map((book) => (
                <tr key={book.name} className="hover:bg-slate-800/50">
                  <td className="px-4 py-2.5 font-medium text-white">{book.name}</td>
                  <td className={`px-4 py-2.5 text-right font-mono ${book.profit > 0 ? 'text-emerald-400' : book.profit < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {book.profit > 0 ? '+' : ''}{formatCurrency(book.profit)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-400">
                    {book.winRate.toFixed(0)}%
                  </td>
                </tr>
              ))}
              {stats.bookPerformance.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500 text-xs">No settled bets yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};
