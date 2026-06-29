import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, User, DollarSign, Calendar, Tag, FileText, HelpCircle, ArrowRightLeft, Users, Percent } from 'lucide-react';
import { Group, Member, Expense } from '../types';
import { formatCurrency } from '../utils';

interface ExpenseFormProps {
  group: Group;
  expenseToEdit?: Expense | null;
  initialParsedValues?: {
    title: string;
    amount: number;
    category: string;
    payerName?: string;
    splitParticipants?: string[];
  } | null;
  onSubmit: (expenseData: any) => Promise<void>;
  onCancel: () => void;
}

const CATEGORIES = ['Food', 'Groceries', 'Travel', 'Shopping', 'Lodging', 'Entertainment', 'Utilities', 'Other'];

export default function ExpenseForm({
  group,
  expenseToEdit,
  initialParsedValues,
  onSubmit,
  onCancel
}: ExpenseFormProps) {
  const { members, currency } = group;

  // Form Fields
  const [isSettlement, setIsSettlement] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState('Other');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [payerId, setPayerId] = useState(members[0]?.id || '');
  const [recipientId, setRecipientId] = useState(members[1]?.id || '');
  const [splitType, setSplitType] = useState<'equal' | 'unequal' | 'shares'>('equal');
  const [notes, setNotes] = useState('');
  
  // Custom split state
  // memberId -> value (either boolean checked, exact amount, or shares ratio)
  const [splitSelections, setSplitSelections] = useState<Record<string, number>>({});
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load editing or parsed values
  useEffect(() => {
    if (expenseToEdit) {
      setIsSettlement(expenseToEdit.isSettlement);
      setTitle(expenseToEdit.title);
      setAmount(expenseToEdit.amount.toString());
      setCategory(expenseToEdit.category);
      setDate(expenseToEdit.date.split('T')[0]);
      setPayerId(expenseToEdit.payerId);
      if (expenseToEdit.recipientId) setRecipientId(expenseToEdit.recipientId);
      setSplitType(expenseToEdit.splitType);
      setNotes(expenseToEdit.notes || '');
      setSplitSelections(expenseToEdit.shares);
    } else if (initialParsedValues) {
      // Pre-filled from Gemini parser
      setIsSettlement(false);
      setTitle(initialParsedValues.title);
      setAmount(initialParsedValues.amount.toString());
      setCategory(CATEGORIES.includes(initialParsedValues.category) ? initialParsedValues.category : 'Other');
      
      // Match payer name fuzzy
      if (initialParsedValues.payerName) {
        const fuzzyPayer = members.find(m => 
          m.name.toLowerCase().includes(initialParsedValues.payerName!.toLowerCase()) ||
          initialParsedValues.payerName!.toLowerCase().includes(m.name.toLowerCase())
        );
        if (fuzzyPayer) setPayerId(fuzzyPayer.id);
      }

      // Match split participants fuzzy
      if (initialParsedValues.splitParticipants && initialParsedValues.splitParticipants.length > 0) {
        const initialSelections: Record<string, number> = {};
        let matchedAny = false;

        for (const m of members) {
          const isParticipant = initialParsedValues.splitParticipants.some(pName => 
            m.name.toLowerCase().includes(pName.toLowerCase()) ||
            pName.toLowerCase().includes(m.name.toLowerCase())
          );
          if (isParticipant) {
            initialSelections[m.id] = 1;
            matchedAny = true;
          } else {
            initialSelections[m.id] = 0;
          }
        }

        // If matched any members, load them, otherwise default to all
        if (matchedAny) {
          setSplitSelections(initialSelections);
        } else {
          const defaultSelections: Record<string, number> = {};
          members.forEach(m => { defaultSelections[m.id] = 1; });
          setSplitSelections(defaultSelections);
        }
      } else {
        // Equal split among all by default
        const defaultSelections: Record<string, number> = {};
        members.forEach(m => { defaultSelections[m.id] = 1; });
        setSplitSelections(defaultSelections);
      }
    } else {
      // Default new expense
      setIsSettlement(false);
      setTitle('');
      setAmount('');
      setCategory('Other');
      setDate(new Date().toISOString().split('T')[0]);
      setPayerId(members[0]?.id || '');
      setRecipientId(members[1]?.id || '');
      setSplitType('equal');
      setNotes('');
      
      // Default to equal split among everyone
      const defaultSelections: Record<string, number> = {};
      members.forEach(m => { defaultSelections[m.id] = 1; });
      setSplitSelections(defaultSelections);
    }
  }, [expenseToEdit, initialParsedValues, members]);

  // Adjust defaults when toggling isSettlement
  useEffect(() => {
    if (isSettlement && payerId === recipientId) {
      // Payer and recipient cannot be equal in settlement
      const other = members.find(m => m.id !== payerId);
      if (other) setRecipientId(other.id);
    }
  }, [isSettlement, payerId]);

  const handleSelectAll = () => {
    const updated: Record<string, number> = {};
    members.forEach(m => { updated[m.id] = 1; });
    setSplitSelections(updated);
  };

  const handleSelectNone = () => {
    const updated: Record<string, number> = {};
    members.forEach(m => { updated[m.id] = 0; });
    setSplitSelections(updated);
  };

  const handleEqualToggle = (memberId: string) => {
    setSplitSelections(prev => ({
      ...prev,
      [memberId]: prev[memberId] ? 0 : 1
    }));
  };

  const handleCustomValueChange = (memberId: string, val: string) => {
    const numeric = parseFloat(val);
    setSplitSelections(prev => ({
      ...prev,
      [memberId]: isNaN(numeric) ? 0 : numeric
    }));
  };

  // Calculations for split statistics
  const numParticipantsEqual = Object.values(splitSelections).filter(v => (v as number) > 0).length;
  const numAmount = parseFloat(amount) || 0;
  
  // Unequal sum validation
  const unequalTotal = splitType === 'unequal' 
    ? Object.entries(splitSelections).reduce((sum, [mId, val]) => sum + ((val as number) || 0), 0)
    : 0;
  const unequalRemaining = Number((numAmount - unequalTotal).toFixed(2));

  // Shares ratio sum
  const sharesTotalWeights = splitType === 'shares'
    ? Object.entries(splitSelections).reduce((sum, [mId, val]) => sum + ((val as number) || 0), 0)
    : 0;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid expense amount.');
      return;
    }

    if (isSettlement) {
      if (payerId === recipientId) {
        setError('Payer and Recipient must be different members to settle a debt.');
        return;
      }
    } else {
      if (!title.trim()) {
        setError('Please enter a description title.');
        return;
      }

      // Validate splits
      if (splitType === 'equal') {
        if (numParticipantsEqual === 0) {
          setError('Please select at least one member to split this expense with.');
          return;
        }
      } else if (splitType === 'unequal') {
        if (Math.abs(unequalRemaining) > 0.02) {
          setError(`The sum of split amounts (${formatCurrency(unequalTotal, currency)}) must equal the total amount (${formatCurrency(parsedAmount, currency)}). Remaining offset is ${formatCurrency(unequalRemaining, currency)}.`);
          return;
        }
      } else if (splitType === 'shares') {
        if (sharesTotalWeights <= 0) {
          setError('Please specify a positive share weight for at least one member.');
          return;
        }
      }
    }

    setLoading(true);
    try {
      const payload: any = {
        title: isSettlement ? 'Settlement Payment' : title,
        amount: parsedAmount,
        date: new Date(date).toISOString(),
        payerId,
        isSettlement,
        notes,
        splitType
      };

      if (isSettlement) {
        payload.recipientId = recipientId;
        payload.category = 'Settlement';
        payload.splitType = 'equal';
        payload.shares = {};
      } else {
        payload.category = category;
        // Clean shares payload (filter out zero weights for equal/shares)
        const cleanedShares: Record<string, number> = {};
        for (const [mId, val] of Object.entries(splitSelections)) {
          const numVal = val as number;
          if (splitType === 'equal' && numVal > 0) {
            cleanedShares[mId] = 1;
          } else if (splitType === 'unequal' && numVal > 0) {
            cleanedShares[mId] = numVal;
          } else if (splitType === 'shares' && numVal > 0) {
            cleanedShares[mId] = numVal;
          }
        }
        payload.shares = cleanedShares;
      }

      await onSubmit(payload);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-rose-50 border-l-4 border-rose-500 rounded-r-xl text-rose-700 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Transaction Type Toggler */}
      {!expenseToEdit && (
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setIsSettlement(false)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              !isSettlement ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" /> Expense Split
          </button>
          <button
            type="button"
            onClick={() => setIsSettlement(true)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              isSettlement ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" /> Record Settlement
          </button>
        </div>
      )}

      {/* Main Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Title */}
        {!isSettlement && (
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Expense Title / Merchant
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Tag className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Pizza, Fuel, Airbnb lodging"
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm transition-all"
              />
            </div>
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Amount ({currency})
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-sm">
              <DollarSign className="w-4 h-4" />
            </span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm font-semibold transition-all"
            />
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Date
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Calendar className="w-4 h-4" />
            </span>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm transition-all"
            />
          </div>
        </div>

        {/* Category (only for non-settlements) */}
        {!isSettlement && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Category
            </label>
            <div className="relative">
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm transition-all appearance-none"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                <Tag className="w-4 h-4" />
              </div>
            </div>
          </div>
        )}

        {/* Payer Field */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            {isSettlement ? 'Who paid / transferred?' : 'Who Paid?'}
          </label>
          <div className="relative">
            <select
              value={payerId}
              onChange={e => setPayerId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm transition-all appearance-none"
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
              <User className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Recipient Field (only for settlements) */}
        {isSettlement && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Who received?
            </label>
            <div className="relative">
              <select
                value={recipientId}
                onChange={e => setRecipientId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm transition-all appearance-none"
              >
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                <User className="w-4 h-4" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Split Allocation Pane (Only for standard expenses) */}
      {!isSettlement && (
        <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50/50 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Split details</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Determine how this expense is shared</p>
            </div>
            
            {/* Split Type Toggler */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setSplitType('equal')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                  splitType === 'equal' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Equally
              </button>
              <button
                type="button"
                onClick={() => setSplitType('unequal')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                  splitType === 'unequal' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Exact Amounts
              </button>
              <button
                type="button"
                onClick={() => setSplitType('shares')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                  splitType === 'shares' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                By Shares
              </button>
            </div>
          </div>

          {/* Allocation rows */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {/* Select Shortcuts for Equal */}
            {splitType === 'equal' && (
              <div className="flex justify-end gap-2 pb-1 border-b border-slate-100 mb-3">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[10px] text-indigo-600 hover:text-indigo-700 font-semibold hover:underline"
                >
                  Select All
                </button>
                <span className="text-[10px] text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleSelectNone}
                  className="text-[10px] text-indigo-600 hover:text-indigo-700 font-semibold hover:underline"
                >
                  Select None
                </button>
              </div>
            )}

            {members.map(m => {
              const participates = !!splitSelections[m.id];
              const customVal = splitSelections[m.id] || 0;
              
              // Equal split calculation live preview
              const calculatedEqualShare = splitType === 'equal' && participates && numParticipantsEqual > 0
                ? numAmount / numParticipantsEqual
                : 0;

              // Weighted split calculation live preview
              const calculatedWeightShare = splitType === 'shares' && sharesTotalWeights > 0
                ? numAmount * (customVal / sharesTotalWeights)
                : 0;

              return (
                <div key={m.id} className="flex justify-between items-center bg-white p-3 border border-slate-100 rounded-xl">
                  {/* Member Profile */}
                  <div className="flex items-center gap-3">
                    {splitType === 'equal' ? (
                      <button
                        type="button"
                        onClick={() => handleEqualToggle(m.id)}
                        className={`w-5 h-5 border rounded-md flex items-center justify-center transition-all ${
                          participates 
                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                            : 'border-slate-300 bg-white hover:border-slate-400'
                        }`}
                      >
                        {participates && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                    ) : (
                      <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 font-mono uppercase">
                        {m.name.slice(0, 2)}
                      </div>
                    )}
                    <span className="text-xs font-semibold text-slate-700">{m.name}</span>
                  </div>

                  {/* Input Split Values */}
                  <div>
                    {splitType === 'equal' && (
                      <span className="text-xs font-mono font-bold text-slate-500">
                        {participates ? formatCurrency(calculatedEqualShare, currency) : formatCurrency(0, currency)}
                      </span>
                    )}

                    {splitType === 'unequal' && (
                      <div className="relative w-28">
                        <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 font-bold text-[10px]">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={splitSelections[m.id] === undefined ? '' : splitSelections[m.id]}
                          onChange={e => handleCustomValueChange(m.id, e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-xs text-right font-mono font-bold transition-all"
                        />
                      </div>
                    )}

                    {splitType === 'shares' && (
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono font-semibold text-slate-400">
                          ({sharesTotalWeights > 0 ? ((customVal / sharesTotalWeights) * 100).toFixed(0) : '0'}%)
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={splitSelections[m.id] === undefined ? '' : splitSelections[m.id]}
                          onChange={e => handleCustomValueChange(m.id, e.target.value)}
                          placeholder="0"
                          className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-xs text-center font-mono font-bold transition-all"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Validation Helpers */}
          {splitType === 'unequal' && (
            <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-3 mt-3">
              <span className="text-slate-400 font-medium">Distributed: {formatCurrency(unequalTotal, currency)}</span>
              {Math.abs(unequalRemaining) < 0.02 ? (
                <span className="text-emerald-500 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Balanced
                </span>
              ) : (
                <span className={`font-semibold ${unequalRemaining > 0 ? 'text-amber-500' : 'text-rose-500'}`}>
                  {unequalRemaining > 0 ? `Remaining: ${formatCurrency(unequalRemaining, currency)}` : `Over-allocated: ${formatCurrency(Math.abs(unequalRemaining), currency)}`}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Notes Field */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          Notes / Comments (Optional)
        </label>
        <div className="relative">
          <span className="absolute top-3 left-3.5 text-slate-400">
            <FileText className="w-4 h-4" />
          </span>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add extra descriptions or attachments..."
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs h-20 resize-none transition-all"
          />
        </div>
      </div>

      {/* Submission Buttons */}
      <div className="flex justify-end gap-3 pt-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 transition-all border border-slate-200 hover:bg-slate-50 rounded-xl"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-xl shadow-xs transition-all flex items-center gap-1.5 text-xs disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Transaction'}
        </button>
      </div>
    </form>
  );
}
