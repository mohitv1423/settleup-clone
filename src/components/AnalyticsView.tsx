import React from 'react';
import { motion } from 'motion/react';
import { PieChart, Tag, Users, Wallet, Calendar, AlertCircle } from 'lucide-react';
import { Group, CategorySummary } from '../types';
import { formatCurrency, calculateBalances } from '../utils';
import { getCategoryIcon } from './ExpenseList';

interface AnalyticsViewProps {
  group: Group;
}

export default function AnalyticsView({ group }: AnalyticsViewProps) {
  const { expenses, members, currency } = group;

  // Filter out settlement transactions for raw spending analytics
  const spendingExpenses = expenses.filter(e => !e.isSettlement);
  const totalSpent = spendingExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 1. Calculate spending by Category
  const categoryTotals: Record<string, number> = {};
  for (const exp of spendingExpenses) {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
  }

  const categoriesSummary: CategorySummary[] = Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount); // Most spent first

  // 2. Calculate actual payments by individual member
  const balances = calculateBalances(group);
  const totalMemberPayments = balances.reduce((sum, b) => sum + b.paid, 0);
  const memberContributions = balances
    .map(b => ({
      memberId: b.memberId,
      name: members.find(m => m.id === b.memberId)?.name || 'Removed',
      amount: b.paid,
      percentage: totalSpent > 0 ? (b.paid / totalSpent) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Category Breakdown Card */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-6">
          <div>
            <h3 className="font-display font-bold text-slate-900 text-base flex items-center gap-2">
              <Tag className="w-5 h-5 text-indigo-600" />
              Category Breakdown
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Where is the group money being allocated?</p>
          </div>

          {categoriesSummary.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-500">No expense records found</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Add regular bills (food, lodging, etc.) to view categories.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {categoriesSummary.map(c => {
                const meta = getCategoryIcon(c.category, false);
                const Icon = meta.icon;

                return (
                  <div key={c.category} className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg border ${meta.bg} ${meta.text}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-700">{c.category}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-800">{formatCurrency(c.amount, currency)}</span>
                        <span className="text-slate-400 text-[10px] ml-1.5 font-semibold">({c.percentage.toFixed(0)}%)</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${c.percentage}%` }}
                        transition={{ duration: 0.5 }}
                        className={`h-full rounded-full ${
                          c.category === 'Food' ? 'bg-amber-500' :
                          c.category === 'Groceries' ? 'bg-indigo-500' :
                          c.category === 'Travel' ? 'bg-indigo-400' :
                          c.category === 'Shopping' ? 'bg-pink-500' :
                          c.category === 'Lodging' ? 'bg-purple-500' :
                          c.category === 'Entertainment' ? 'bg-violet-500' :
                          c.category === 'Utilities' ? 'bg-cyan-500' :
                          'bg-slate-500'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Individual Funding Contributions */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-6">
          <div>
            <h3 className="font-display font-bold text-slate-900 text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-500" />
              Member Spending Ratio
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Who is funding the group's expenditures?</p>
          </div>

          {totalSpent === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-500">No contribution records found</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Add regular bills to see spending distributions.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {memberContributions.map(member => {
                return (
                  <div key={member.memberId} className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-violet-500" />
                        <span className="font-bold text-slate-700">{member.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-800">{formatCurrency(member.amount, currency)}</span>
                        <span className="text-slate-400 text-[10px] ml-1.5 font-semibold">({member.percentage.toFixed(0)}%)</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${member.percentage}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full rounded-full bg-gradient-to-r from-violet-400 to-violet-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
