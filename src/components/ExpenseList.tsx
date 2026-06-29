import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Filter, Edit2, Trash2, ChevronDown, ChevronUp, ArrowRightLeft, 
  Utensils, ShoppingCart, Plane, ShoppingBag, Home, Film, Zap, HelpCircle, FileText 
} from 'lucide-react';
import { Group, Expense, Member } from '../types';
import { formatCurrency } from '../utils';

interface ExpenseListProps {
  group: Group;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => Promise<void>;
}

// Map categories to visual icons and colors
export function getCategoryIcon(category: string, isSettlement: boolean) {
  if (isSettlement) return { icon: ArrowRightLeft, bg: 'bg-emerald-100', text: 'text-emerald-700 border-emerald-200' };

  switch (category) {
    case 'Food':
      return { icon: Utensils, bg: 'bg-amber-100', text: 'text-amber-700 border-amber-200' };
    case 'Groceries':
      return { icon: ShoppingCart, bg: 'bg-indigo-100', text: 'text-indigo-700 border-indigo-200' };
    case 'Travel':
      return { icon: Plane, bg: 'bg-sky-100', text: 'text-sky-700 border-sky-200' };
    case 'Shopping':
      return { icon: ShoppingBag, bg: 'bg-pink-100', text: 'text-pink-700 border-pink-200' };
    case 'Lodging':
      return { icon: Home, bg: 'bg-purple-100', text: 'text-purple-700 border-purple-200' };
    case 'Entertainment':
      return { icon: Film, bg: 'bg-violet-100', text: 'text-violet-700 border-violet-200' };
    case 'Utilities':
      return { icon: Zap, bg: 'bg-cyan-100', text: 'text-cyan-700 border-cyan-200' };
    default:
      return { icon: HelpCircle, bg: 'bg-slate-100', text: 'text-slate-700 border-slate-200' };
  }
}

export default function ExpenseList({ group, onEditExpense, onDeleteExpense }: ExpenseListProps) {
  const { expenses, members, currency } = group;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Helper: map member ID to name
  const getMemberName = (id: string) => {
    return members.find(m => m.id === id)?.name || 'Removed Member';
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Filter expenses
  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = 
      exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getMemberName(exp.payerId).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exp.notes && exp.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || exp.category === selectedCategory;

    return matchesSearch && matchesCategory;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first

  return (
    <div className="space-y-4">
      {/* Search and Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search descriptions, payers, notes..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs transition-all shadow-2xs"
          />
        </div>
        <div className="relative w-full sm:w-48">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
            <Filter className="w-4 h-4" />
          </span>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs transition-all shadow-2xs appearance-none"
          >
            <option value="All">All Categories</option>
            <option value="Food">Food</option>
            <option value="Groceries">Groceries</option>
            <option value="Travel">Travel</option>
            <option value="Shopping">Shopping</option>
            <option value="Lodging">Lodging</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Utilities">Utilities</option>
            <option value="Settlement">Settlements Only</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Expense feed list */}
      <div className="space-y-3">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-2xs">
            <p className="text-sm font-semibold text-slate-700">No transactions found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              {expenses.length === 0 
                ? "Start adding expenses to split bills with your group!" 
                : "Try adjusting your search filters."}
            </p>
          </div>
        ) : (
          filteredExpenses.map((exp) => {
            const isExpanded = expandedId === exp.id;
            const meta = getCategoryIcon(exp.category, exp.isSettlement);
            const CategoryIcon = meta.icon;
            
            // Format nice human-readable date
            const dateObj = new Date(exp.date);
            const formattedDate = dateObj.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            return (
              <div
                key={exp.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-2xs hover:shadow-xs transition-all overflow-hidden"
              >
                {/* Main Row */}
                <div
                  onClick={() => toggleExpand(exp.id)}
                  className="p-4 sm:p-5 flex justify-between items-center cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3.5">
                    {/* Category Icon */}
                    <div className={`p-2.5 rounded-xl border ${meta.bg} ${meta.text} flex items-center justify-center shrink-0 shadow-3xs`}>
                      <CategoryIcon className="w-5 h-5 stroke-[2]" />
                    </div>

                    {/* Title and Date info */}
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs sm:text-sm">
                        {exp.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[10px] sm:text-xs text-slate-400">
                        <span>Paid by <strong className="text-slate-600 font-semibold">{getMemberName(exp.payerId)}</strong></span>
                        <span className="hidden sm:inline">•</span>
                        <span>{formattedDate}</span>
                        {exp.isSettlement && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold text-[9px] border border-emerald-100">Settlement</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Price info and expander */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-mono font-bold text-slate-800 text-xs sm:text-sm">
                        {formatCurrency(exp.amount, currency)}
                      </p>
                      {!exp.isSettlement && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {exp.splitType === 'equal' ? 'Split Equally' : exp.splitType === 'unequal' ? 'Exact Split' : 'Weighted Split'}
                        </p>
                      )}
                    </div>
                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Splits Panel */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden bg-slate-50 border-t border-slate-100"
                    >
                      <div className="p-4 sm:p-5 space-y-4 text-xs">
                        {/* Notes, if present */}
                        {exp.notes && (
                          <div className="bg-white p-3 border border-slate-100 rounded-xl text-slate-600 text-[11px] leading-relaxed flex gap-2 items-start">
                            <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <div className="whitespace-pre-wrap">"{exp.notes}"</div>
                          </div>
                        )}

                        {/* Breakdown Splits */}
                        <div className="space-y-2">
                          <h5 className="font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-2">Split Breakdown</h5>
                          
                          {exp.isSettlement ? (
                            /* Settlement view */
                            <div className="bg-white p-3 border border-slate-100 rounded-xl flex items-center justify-between font-medium">
                              <span className="text-slate-600">
                                <strong className="text-slate-800">{getMemberName(exp.payerId)}</strong> transferred directly to <strong className="text-slate-800">{getMemberName(exp.recipientId || '')}</strong>
                              </span>
                              <span className="font-mono font-bold text-emerald-600">
                                {formatCurrency(exp.amount, currency)}
                              </span>
                            </div>
                          ) : (
                            /* Standard splits breakdown view */
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {members.map(m => {
                                const oweVal = exp.shares[m.id] || 0;
                                let isParticipant = false;
                                let calculatedOwedAmount = 0;

                                if (exp.splitType === 'equal') {
                                  const activeKeys = Object.keys(exp.shares).filter(k => exp.shares[k] > 0);
                                  const totalParticipants = activeKeys.length > 0 ? activeKeys.length : members.length;
                                  const participates = activeKeys.length > 0 ? activeKeys.includes(m.id) : true;
                                  
                                  isParticipant = participates;
                                  calculatedOwedAmount = participates ? exp.amount / totalParticipants : 0;
                                } else if (exp.splitType === 'unequal') {
                                  isParticipant = oweVal > 0;
                                  calculatedOwedAmount = oweVal;
                                } else if (exp.splitType === 'shares') {
                                  const activeWeightsSum = Object.values(exp.shares).reduce((sum, w) => sum + w, 0);
                                  isParticipant = oweVal > 0;
                                  calculatedOwedAmount = activeWeightsSum > 0 ? exp.amount * (oweVal / activeWeightsSum) : 0;
                                }

                                return (
                                  <div
                                    key={m.id}
                                    className={`bg-white p-2.5 border border-slate-100 rounded-xl flex items-center justify-between ${
                                      isParticipant ? 'opacity-100 border-slate-200' : 'opacity-50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className={`w-1.5 h-1.5 rounded-full ${isParticipant ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                                      <span className="font-semibold text-slate-700">{m.name}</span>
                                      {m.id === exp.payerId && <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1 rounded">Paid</span>}
                                    </div>
                                    <span className={`font-mono font-bold ${calculatedOwedAmount > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                                      {formatCurrency(calculatedOwedAmount, currency)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditExpense(exp);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-white text-slate-600 hover:text-slate-800 font-semibold rounded-lg transition-all text-xs"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Are you sure you want to delete this transaction?')) {
                                onDeleteExpense(exp.id);
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-150 hover:bg-rose-50 text-rose-600 hover:text-rose-700 font-semibold rounded-lg transition-all text-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
