import React from 'react';

interface StatsCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  highlight?: boolean;
}

export const StatsCard: React.FC<StatsCardProps> = ({ label, value, subValue, trend, icon, highlight }) => {
  return (
    <div className={`p-5 rounded-xl border transition-all duration-200 ${highlight 
      ? 'bg-gradient-to-br from-emerald-900/40 to-slate-900 border-emerald-500/30' 
      : 'bg-slate-900/50 border-slate-800'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">{label}</p>
          <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
          {subValue && (
            <p className={`text-sm mt-1 font-medium ${
              trend === 'up' ? 'text-emerald-400' : 
              trend === 'down' ? 'text-rose-400' : 'text-slate-400'
            }`}>
              {subValue}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${highlight ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};