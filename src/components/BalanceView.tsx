import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Award, DollarSign, Wallet, Users, Info } from 'lucide-react';
import { Group, MemberBalance, Member } from '../types';
import { formatCurrency, getInitials, getAvatarColor, calculateBalances } from '../utils';

interface BalanceViewProps {
  group: Group;
}

export default function BalanceView({ group }: BalanceViewProps) {
  const { members, expenses, currency } = group;

  // Calculate balances using utility
  const balances = calculateBalances(group);

  // Group Stats
  const normalExpenses = expenses.filter(e => !e.isSettlement);
  const totalGroupSpent = normalExpenses.reduce((sum, e) => sum + e.amount, 0);
  const averageSpent = members.length > 0 ? totalGroupSpent / members.length : 0;

  // Max paid for scaling progress bars
  const maxPaid = Math.max(...balances.map(b => b.paid), 1);
  const maxNet = Math.max(...balances.map(b => Math.abs(b.net)), 1);

  const getMemberName = (id: string) => {
    return members.find(m => m.id === id)?.name || 'Removed';
  };

  return (
    <div className="space-y-6">
      {/* Visual Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* Total Spent Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Group Spent</p>
            <p className="font-mono font-bold text-slate-800 text-lg mt-0.5">
              {formatCurrency(totalGroupSpent, currency)}
            </p>
          </div>
        </div>

        {/* Average Spend Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-violet-50 text-violet-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Average Per Member</p>
            <p className="font-mono font-bold text-slate-800 text-lg mt-0.5">
              {formatCurrency(averageSpent, currency)}
            </p>
          </div>
        </div>

        {/* Expenses Count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex items-center gap-4 sm:col-span-2 md:col-span-1">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Transactions</p>
            <p className="font-bold text-slate-800 text-lg mt-0.5">
              {expenses.length} <span className="text-xs text-slate-400 font-medium">bills/payments</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Balances List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs p-5 sm:p-6 space-y-6">
        <div>
          <h3 className="font-display font-bold text-slate-900 text-base">Individual Standings</h3>
          <p className="text-xs text-slate-400 mt-0.5">Check who paid how much, who consumed, and their net balances</p>
        </div>

        <div className="divide-y divide-slate-100 space-y-5">
          {balances.map((bal, idx) => {
            const mName = getMemberName(bal.memberId);
            const avatarBg = getAvatarColor(mName);
            const initials = getInitials(mName);
            
            // Percentage of maximum paid for visual bar representation
            const paidPct = (bal.paid / maxPaid) * 100;
            
            // Standing category
            const isCreditor = bal.net > 0.01;
            const isDebtor = bal.net < -0.01;
            const isSettled = !isCreditor && !isDebtor;

            return (
              <div key={bal.memberId} className={`pt-5 ${idx === 0 ? 'pt-0' : ''} space-y-3`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Member Identity */}
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${avatarBg} text-white font-bold flex items-center justify-center shadow-3xs`}>
                      {initials}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{mName}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Paid: <strong className="text-slate-600 font-semibold">{formatCurrency(bal.paid, currency)}</strong> 
                        <span className="mx-1">•</span> 
                        Owes: <strong className="text-slate-600 font-semibold">{formatCurrency(bal.owes, currency)}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Right: Net Balance Status */}
                  <div className="sm:text-right flex items-center sm:block justify-between">
                    <span className="sm:hidden text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Standings</span>
                    <div>
                      {isCreditor && (
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-bold">
                            Is owed <strong className="font-mono">{formatCurrency(bal.net, currency)}</strong>
                          </span>
                        </div>
                      )}
                      {isDebtor && (
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-100 rounded-lg text-xs font-bold">
                            Owes <strong className="font-mono">{formatCurrency(Math.abs(bal.net), currency)}</strong>
                          </span>
                        </div>
                      )}
                      {isSettled && (
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-500 border border-slate-150 rounded-lg text-xs font-bold">
                            All Settled Up
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Standing Bar: visual indicator of payment ratio compared to highest spender */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] text-slate-400 font-semibold">
                    <span>Payment Share Indicator</span>
                    <span>{paidPct.toFixed(0)}% of max spender</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner flex">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${paidPct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        isCreditor 
                          ? 'bg-gradient-to-r from-indigo-400 to-indigo-500' 
                          : isDebtor 
                          ? 'bg-gradient-to-r from-slate-400 to-slate-500'
                          : 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                      }`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Information Helper */}
      <div className="bg-slate-50 rounded-2xl border border-slate-150 p-4 text-slate-500 flex gap-2.5 items-start text-[11px]">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>How are balances calculated?</strong> For each bill, the payer is credited for paying, and participants are debited for what they owe. Direct "Settle Up" payments are recorded as transfers that reduce debts. If someone owes you, look at the <strong>Settle Up</strong> tab to find the quickest payment transfers!
        </p>
      </div>
    </div>
  );
}
