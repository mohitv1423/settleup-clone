import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ArrowRightLeft, Sparkles, CheckCircle2, DollarSign, RefreshCw, Send } from 'lucide-react';
import { Group, Debt } from '../types';
import { formatCurrency, getInitials, getAvatarColor, simplifyDebts } from '../utils';

interface SettleDebtsViewProps {
  group: Group;
  onRecordSettlement: (fromId: string, toId: string, amount: number) => void;
}

export default function SettleDebtsView({ group, onRecordSettlement }: SettleDebtsViewProps) {
  const { members, currency } = group;

  // Calculate simplified debts
  const debts = simplifyDebts(group);

  const getMemberName = (id: string) => {
    return members.find(m => m.id === id)?.name || 'Removed Member';
  };

  return (
    <div className="space-y-6">
      {/* Debt Simplification Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl border border-slate-800 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-y-1/4 translate-x-1/6 opacity-10">
          <ArrowRightLeft className="w-56 h-56 text-indigo-500" />
        </div>
        
        <div className="relative z-10 max-w-lg space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 rounded-md text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" /> Debt Simplification Engine
          </div>
          <h3 className="font-display font-bold text-lg sm:text-xl">Optimal Settlement Flows</h3>
          <p className="text-slate-300 text-xs leading-relaxed">
            Settle Up automatically calculates and aggregates all expenses to compute the absolute minimum number of direct transactions required to balance the group's accounts.
          </p>
        </div>
      </div>

      {/* Main Debts Grid */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs p-5 sm:p-6">
        {debts.length === 0 ? (
          /* Settle Up complete celebratory state */
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center border-4 border-emerald-100 shadow-sm">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5] animate-bounce" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
            </div>
            <div className="space-y-1">
              <p className="font-display font-bold text-slate-800 text-lg">Everyone is Settled Up!</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                No debts remaining in this group. You are all balanced and ready for your next adventure together!
              </p>
            </div>
          </div>
        ) : (
          /* Active Debts Feed */
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-slate-400">
                Suggested Transfers ({debts.length})
              </h4>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin-slow" /> Real-time calculations
              </span>
            </div>

            <div className="space-y-3">
              {debts.map((debt, idx) => {
                const fromName = getMemberName(debt.from);
                const toName = getMemberName(debt.to);
                const fromColor = getAvatarColor(fromName);
                const toColor = getAvatarColor(toName);

                return (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 hover:border-slate-200 hover:bg-slate-50/50 transition-all"
                  >
                    {/* Transfer Details */}
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-center sm:text-left">
                      {/* Debtor */}
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg ${fromColor} text-white font-bold flex items-center justify-center text-xs shadow-3xs shrink-0`}>
                          {getInitials(fromName)}
                        </div>
                        <span className="font-bold text-slate-700 text-xs sm:text-sm">{fromName}</span>
                      </div>

                      {/* Direction Arrow */}
                      <div className="flex flex-col items-center px-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">owes</span>
                        <ArrowRight className="w-4 h-4 text-slate-400 mt-0.5" />
                      </div>

                      {/* Creditor */}
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg ${toColor} text-white font-bold flex items-center justify-center text-xs shadow-3xs shrink-0`}>
                          {getInitials(toName)}
                        </div>
                        <span className="font-bold text-slate-700 text-xs sm:text-sm">{toName}</span>
                      </div>
                    </div>

                    {/* Transfer Price & CTA Settle */}
                    <div className="flex items-center justify-between w-full sm:w-auto gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200">
                      <div className="text-left sm:text-right">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Transfer Amount</span>
                        <span className="font-mono font-bold text-slate-800 text-sm sm:text-base">
                          {formatCurrency(debt.amount, currency)}
                        </span>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => onRecordSettlement(debt.from, debt.to, debt.amount)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-xl shadow-xs transition-all flex items-center gap-1.5 text-xs shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" /> Settle
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
