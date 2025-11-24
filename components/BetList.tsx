import React, { useState, useMemo } from 'react';
import { Trash2, TrendingUp, TrendingDown, MinusCircle, Edit2, Save, X, Check, ChevronDown, ChevronRight, Calendar } from 'lucide-react';
import { Bet, BetStatus, Sportsbook } from '../types';
import { formatCurrency, formatDate, calculatePotentialProfit } from '../utils/calculations';
import { SPORTSBOOKS, SPORTSBOOK_THEME } from '../constants';

interface BetListProps {
  bets: Bet[];
  onUpdateStatus: (id: string, status: BetStatus) => void;
  onDelete: (id: string) => void;
  onEdit: (bet: Bet) => void;
}

interface DateGroup {
  date: string;
  bets: Bet[];
  totalProfit: number;
  wins: number;
  losses: number;
  pushes: number;
}

export const BetList: React.FC<BetListProps> = ({ bets, onUpdateStatus, onDelete, onEdit }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Bet>>({});
  
  // State to track which date groups are expanded
  const [expandedDates, setExpandedDates] = useState<Set<string>>(() => {
    if (bets.length > 0) {
      const uniqueDates = Array.from(new Set(bets.map(b => b.date))) as string[];
      uniqueDates.sort((a, b) => b.localeCompare(a));
      return new Set(uniqueDates.slice(0, 1));
    }
    return new Set();
  });

  const toggleDateGroup = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  // Group bets by date and calculate daily stats
  const groupedBets = useMemo(() => {
    const groups: Record<string, DateGroup> = {};

    bets.forEach(bet => {
      if (!groups[bet.date]) {
        groups[bet.date] = {
          date: bet.date,
          bets: [],
          totalProfit: 0,
          wins: 0,
          losses: 0,
          pushes: 0
        };
      }
      groups[bet.date].bets.push(bet);
      
      // Calculate daily stats
      if (bet.status === BetStatus.WON) {
        groups[bet.date].totalProfit += bet.potentialProfit;
        groups[bet.date].wins++;
      } else if (bet.status === BetStatus.LOST) {
        groups[bet.date].totalProfit -= bet.wager;
        groups[bet.date].losses++;
      } else if (bet.status === BetStatus.PUSH) {
        groups[bet.date].pushes++;
      }
    });

    // Convert to array and sort by date descending (newest first)
    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }, [bets]);


  const handleStartEdit = (bet: Bet) => {
    setDeleteConfirmId(null);
    setEditingId(bet.id);
    setEditForm({ ...bet });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = () => {
    if (editingId && editForm.wager && editForm.odds) {
      const updatedProfit = calculatePotentialProfit(Number(editForm.wager), Number(editForm.odds));
      onEdit({
        ...editForm as Bet,
        potentialProfit: updatedProfit,
        wager: Number(editForm.wager),
        odds: Number(editForm.odds),
      });
      setEditingId(null);
      setEditForm({});
    }
  };

  const handleInputChange = (field: keyof Bet, value: any) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getRowStyle = (book: Sportsbook) => {
    const theme = SPORTSBOOK_THEME[book] || SPORTSBOOK_THEME[Sportsbook.OTHER];
    const hex = theme.bg.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return {
      backgroundColor: `rgba(${r}, ${g}, ${b}, 0.08)`, // Very subtle 8% opacity
      borderLeft: `4px solid ${theme.bg}` // Solid accent bar
    };
  };

  const getBookTextColor = (book: Sportsbook) => {
    const theme = SPORTSBOOK_THEME[book] || SPORTSBOOK_THEME[Sportsbook.OTHER];
    return theme.bg;
  };

  if (bets.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-12 text-center">
        <div className="inline-flex p-4 rounded-full bg-slate-800 text-slate-500 mb-4">
          <Calendar size={32} />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">No Bets Tracked Yet</h3>
        <p className="text-slate-400 max-w-sm mx-auto">
          Start by adding your first wager in the form above to build your bankroll history.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Recent Activity</h3>
        <span className="text-slate-500 text-sm">{bets.length} Total Bets</span>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left border-collapse table-fixed md:table-auto">
          <thead>
            <tr className="bg-slate-950 border-b border-slate-800 text-xs uppercase text-slate-400 font-semibold tracking-wider">
              {/* No Date column needed in body as it's in the group header */}
              <th className="px-4 py-3 w-1/3 md:w-auto">Matchup / Pick</th>
              <th className="px-4 py-3 hidden sm:table-cell w-28">Sportsbook</th>
              <th className="px-4 py-3 text-right w-20">Odds</th>
              <th className="px-4 py-3 text-right w-24">Wager</th>
              <th className="px-4 py-3 text-center w-28">Result</th>
              <th className="px-4 py-3 text-right w-20">Actions</th>
            </tr>
          </thead>
          
          {groupedBets.map((group) => {
            const isExpanded = expandedDates.has(group.date);
            const dateProfitClass = group.totalProfit > 0 ? 'text-emerald-400' : group.totalProfit < 0 ? 'text-rose-400' : 'text-slate-400';

            return (
              <tbody key={group.date} className="border-b border-slate-800 last:border-b-0">
                {/* Group Header */}
                <tr 
                  className="bg-slate-800/30 hover:bg-slate-800/60 cursor-pointer transition-colors"
                  onClick={() => toggleDateGroup(group.date)}
                >
                  <td colSpan={6} className="px-4 py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                        <div className="flex items-center gap-2">
                           <Calendar size={14} className="text-emerald-500" />
                           <span className="text-sm font-bold text-white">{formatDate(group.date)}</span>
                           <span className="text-xs text-slate-500 font-medium ml-2">
                             {group.bets.length} Bet{group.bets.length !== 1 ? 's' : ''}
                           </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-medium">
                        <span className="text-slate-400 hidden sm:inline">
                          {group.wins}W - {group.losses}L - {group.pushes}P
                        </span>
                        <span className={`font-mono ${dateProfitClass}`}>
                          {group.totalProfit > 0 ? '+' : ''}{formatCurrency(group.totalProfit)}
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>

                {/* Bet Rows */}
                {isExpanded && group.bets.map((bet) => {
                   const isEditing = editingId === bet.id;
                   const isDeleting = deleteConfirmId === bet.id;
                   // Apply custom style if not editing
                   const rowStyle = !isEditing ? getRowStyle(bet.sportsbook) : {};

                   return (
                    <tr 
                      key={bet.id} 
                      style={rowStyle}
                      className={`group transition-all border-t border-slate-800/50 ${!isEditing ? 'hover:brightness-110' : 'bg-slate-900'}`}
                    >
                      {isEditing ? (
                        // Edit Mode
                        <>
                          <td className="px-4 py-2 align-top pl-4"> {/* Remove extra padding since border is gone in edit */}
                            <div className="flex flex-col gap-2">
                              {/* Date edit also available here implicitly if we wanted, but sticking to logic */}
                              <input 
                                type="text" 
                                placeholder="Matchup"
                                value={editForm.matchup}
                                onChange={(e) => handleInputChange('matchup', e.target.value)}
                                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs w-full focus:border-emerald-500 outline-none" 
                              />
                              <input 
                                type="text" 
                                placeholder="Pick"
                                value={editForm.pick}
                                onChange={(e) => handleInputChange('pick', e.target.value)}
                                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300 text-xs w-full focus:border-emerald-500 outline-none" 
                              />
                            </div>
                          </td>
                          <td className="px-4 py-2 align-top hidden sm:table-cell">
                            <select 
                              value={editForm.sportsbook} 
                              onChange={(e) => handleInputChange('sportsbook', e.target.value)}
                              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300 text-xs w-full focus:border-emerald-500 outline-none"
                            >
                              {SPORTSBOOKS.map(sb => (
                                <option key={sb} value={sb}>{sb}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2 align-top text-right">
                            <input 
                              type="number" 
                              value={editForm.odds}
                              onChange={(e) => handleInputChange('odds', Number(e.target.value))}
                              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-amber-400 text-xs w-20 ml-auto text-right focus:border-emerald-500 outline-none font-mono" 
                            />
                          </td>
                          <td className="px-4 py-2 align-top text-right">
                             <input 
                               type="number" 
                               min="0"
                               step="0.01"
                               value={editForm.wager}
                               onChange={(e) => handleInputChange('wager', Number(e.target.value))}
                               className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs w-20 ml-auto text-right focus:border-emerald-500 outline-none" 
                             />
                          </td>
                          <td className="px-4 py-2 text-center align-middle">
                            <span className="text-xs text-slate-500 italic">Editing...</span>
                          </td>
                          <td className="px-4 py-2 text-right align-top">
                            <div className="flex justify-end gap-1">
                              <button 
                                onClick={handleSaveEdit}
                                className="p-1.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                title="Save Changes"
                              >
                                <Save size={14} />
                              </button>
                              <button 
                                onClick={handleCancelEdit}
                                className="p-1.5 rounded bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors"
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        // Display Mode
                        <>
                          <td className="px-4 py-2 align-top">
                            <div className="flex flex-col">
                              <span className="text-white font-medium text-sm leading-tight break-words">{bet.matchup}</span>
                              <span className="text-slate-400 text-xs leading-tight break-words mt-0.5">{bet.pick}</span>
                              <div className="sm:hidden mt-1.5">
                                <span 
                                  className="text-[10px] font-bold uppercase tracking-wider"
                                  style={{ color: getBookTextColor(bet.sportsbook) }}
                                >
                                  {bet.sportsbook}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2 align-top hidden sm:table-cell">
                            <span 
                              className="text-[11px] font-bold tracking-wide"
                              style={{ color: getBookTextColor(bet.sportsbook) }}
                            >
                              {bet.sportsbook}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right text-sm font-mono text-amber-400 align-top">
                            {bet.odds > 0 ? `+${bet.odds}` : bet.odds}
                          </td>
                          <td className="px-4 py-2 text-right align-top">
                             <div className="flex flex-col items-end">
                               <span className="text-white font-medium text-sm whitespace-nowrap">{formatCurrency(bet.wager)}</span>
                               <span className="text-emerald-500 text-[10px] whitespace-nowrap">To Win: {formatCurrency(bet.potentialProfit)}</span>
                             </div>
                          </td>
                          <td className="px-4 py-2 text-center align-top">
                            <div className="flex flex-wrap justify-center gap-1">
                              {bet.status === BetStatus.PENDING ? (
                                <>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); onUpdateStatus(bet.id, BetStatus.WON); }}
                                    className="p-1 rounded bg-slate-900/50 text-slate-400 hover:bg-emerald-500 hover:text-white transition-colors border border-slate-700/50"
                                    title="Mark Won"
                                  >
                                    <TrendingUp size={12} />
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); onUpdateStatus(bet.id, BetStatus.LOST); }}
                                    className="p-1 rounded bg-slate-900/50 text-slate-400 hover:bg-rose-500 hover:text-white transition-colors border border-slate-700/50"
                                    title="Mark Lost"
                                  >
                                    <TrendingDown size={12} />
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); onUpdateStatus(bet.id, BetStatus.PUSH); }}
                                    className="p-1 rounded bg-slate-900/50 text-slate-400 hover:bg-slate-600 hover:text-white transition-colors border border-slate-700/50"
                                    title="Mark Push"
                                  >
                                    <MinusCircle size={12} />
                                  </button>
                                </>
                              ) : (
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  bet.status === BetStatus.WON ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                  bet.status === BetStatus.LOST ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                                  'bg-slate-500/20 text-slate-400 border-slate-500/30'
                                }`}>
                                  {bet.status}
                                </span>
                              )}
                            </div>
                            {bet.status !== BetStatus.PENDING && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); onUpdateStatus(bet.id, BetStatus.PENDING); }}
                                className="text-[10px] text-slate-500 hover:text-slate-300 mt-1 block w-full text-center"
                              >
                                Undo
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right align-top">
                            {isDeleting ? (
                              <div className="flex justify-end gap-1.5 items-center">
                                <button 
                                  onClick={() => {
                                    onDelete(bet.id);
                                    setDeleteConfirmId(null);
                                  }}
                                  className="p-1 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors border border-rose-500/30"
                                  title="Confirm Delete"
                                >
                                  <Check size={12} />
                                </button>
                                <button 
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="p-1 rounded bg-slate-900/50 text-slate-400 hover:bg-slate-700 transition-colors"
                                  title="Cancel"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handleStartEdit(bet)}
                                  className="text-slate-500 hover:text-emerald-400 transition-all p-1.5"
                                  title="Edit Bet"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  onClick={() => {
                                    setEditingId(null);
                                    setDeleteConfirmId(bet.id);
                                  }}
                                  className="text-slate-500 hover:text-rose-400 transition-colors p-1.5"
                                  title="Delete Bet"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            );
          })}
        </table>
      </div>
    </div>
  );
};