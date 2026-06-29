import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Sparkles, Plus, Share2, ArrowLeft, ArrowRightLeft, TrendingUp, 
  Wallet, PieChart, Check, UserPlus, FileText, AlertCircle, RefreshCw 
} from 'lucide-react';

import { Group, Expense, Member } from './types';
import GroupSelector from './components/GroupSelector';
import ExpenseList from './components/ExpenseList';
import BalanceView from './components/BalanceView';
import SettleDebtsView from './components/SettleDebtsView';
import AnalyticsView from './components/AnalyticsView';
import SmartParserModal from './components/SmartParserModal';
import ExpenseForm from './components/ExpenseForm';

export default function App() {
  // Core Group state
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  
  // Interface navigation & views
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'debts' | 'analytics'>('expenses');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [isParserOpen, setIsParserOpen] = useState(false);
  const [initialParsedValues, setInitialParsedValues] = useState<any>(null);

  // App statuses
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // New member inline form
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');

  // 1. Check for URL deep-linking on initial mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const groupId = params.get('g');
    if (groupId) {
      loadGroupById(groupId);
    }
  }, []);

  const loadGroupById = async (id: string) => {
    setLoadingGroup(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${id}`);
      if (!res.ok) {
        throw new Error('Group not found on the server. Please check your shared URL.');
      }
      const data: Group = await res.json();
      setCurrentGroup(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingGroup(false);
    }
  };

  // 2. Poll/Refresh active group data
  const refreshGroup = async () => {
    if (!currentGroup) return;
    setSyncing(true);
    try {
      const res = await fetch(`/api/groups/${currentGroup.id}`);
      if (res.ok) {
        const data: Group = await res.json();
        setCurrentGroup(data);
      }
    } catch (err) {
      console.error('Failed to sync group:', err);
    } finally {
      setSyncing(false);
    }
  };

  // 3. Set newly selected group from selector
  const handleGroupSelected = (group: Group) => {
    setCurrentGroup(group);
    setError(null);
    // Update browser URL query param without refreshing the page
    const newUrl = `${window.location.origin}${window.location.pathname}?g=${group.id}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  // 4. Return to selector & wipe query param
  const handleLeaveGroup = () => {
    setCurrentGroup(null);
    // Remove query parameter
    const newUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  // 5. Shared Link Copy Action
  const handleShareLink = () => {
    if (!currentGroup) return;
    const shareUrl = `${window.location.origin}/?g=${currentGroup.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  // 6. Add Expense Form Submission (API handler)
  const handleExpenseSubmit = async (expenseData: any) => {
    if (!currentGroup) return;
    
    const url = expenseToEdit 
      ? `/api/groups/${currentGroup.id}/expenses/${expenseToEdit.id}`
      : `/api/groups/${currentGroup.id}/expenses`;

    const method = expenseToEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to submit transaction.');
      }

      const updatedGroup = await res.json();
      setCurrentGroup(updatedGroup);
      
      // Reset editing states
      setIsFormOpen(false);
      setExpenseToEdit(null);
      setInitialParsedValues(null);
    } catch (err: any) {
      alert(err.message || 'Failed to save transaction');
    }
  };

  // 7. Delete Expense Action (API handler)
  const handleDeleteExpense = async (expenseId: string) => {
    if (!currentGroup) return;
    try {
      const res = await fetch(`/api/groups/${currentGroup.id}/expenses/${expenseId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        throw new Error('Failed to delete expense.');
      }
      const updatedGroup = await res.json();
      setCurrentGroup(updatedGroup);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // 8. Add Inline Group Member (API handler)
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGroup || !newMemberName.trim()) return;

    try {
      const res = await fetch(`/api/groups/${currentGroup.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newMemberName.trim() })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to add member.');
      }

      const updatedGroup = await res.json();
      setCurrentGroup(updatedGroup);
      setNewMemberName('');
      setShowAddMember(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // 9. Quick settle shortcut from suggested debts list
  const handleRecordSettlement = (fromId: string, toId: string, amount: number) => {
    setInitialParsedValues(null);
    setExpenseToEdit(null);
    
    // Pass custom settlement params as initial Values inside the Form
    setInitialParsedValues({
      title: 'Settlement Payment',
      amount,
      category: 'Settlement',
      payerName: currentGroup?.members.find(m => m.id === fromId)?.name
    });

    setIsFormOpen(true);
  };

  // 10. Preload parsed results from Gemini Modal
  const handleParsedResult = (parsedData: any) => {
    setExpenseToEdit(null);
    setInitialParsedValues(parsedData);
    setIsFormOpen(true);
  };

  return (
    <div id="main_app_layout" className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Banner Loader for URL loads */}
      {loadingGroup && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex flex-col items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-xs font-semibold text-slate-700">Connecting Settle Up Group...</p>
          </div>
        </div>
      )}

      {/* Main Container */}
      {!currentGroup ? (
        /* 1. Group Selector / Entrance Screen */
        <div className="flex-1 flex flex-col justify-center py-12">
          {error && (
            <div className="max-w-md mx-auto px-4 w-full mb-4">
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}
          <GroupSelector onGroupSelected={handleGroupSelected} />
        </div>
      ) : (
        /* 2. Primary Group Dashboard */
        <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto px-4 py-6 space-y-6">
          
          {/* Dashboard Header Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Group Meta Info */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleLeaveGroup}
                className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all"
                title="Go Back to Group Selection"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-bold text-slate-900 text-lg sm:text-xl">
                    {currentGroup.name}
                  </h2>
                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                    {currentGroup.currency}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  Group Code: {currentGroup.id}
                </p>
              </div>
            </div>

            {/* Header Right Action CTA controls */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Sync Button */}
              <button
                onClick={refreshGroup}
                disabled={syncing}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all flex items-center justify-center"
                title="Refresh group data"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              </button>

              {/* Share Group link */}
              <button
                onClick={handleShareLink}
                className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-semibold transition-all ${
                  copiedLink 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4" /> Link Copied
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" /> Invite Friends
                  </>
                )}
              </button>

              {/* Inline Member Addition Toggle */}
              <button
                onClick={() => setShowAddMember(!showAddMember)}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 transition-all"
              >
                <UserPlus className="w-4 h-4" /> Add Friend
              </button>
            </div>
          </div>

          {/* Inline Add Member Drawer Form */}
          <AnimatePresence>
            {showAddMember && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <form
                  onSubmit={handleAddMember}
                  className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs flex flex-col sm:flex-row gap-3 items-end sm:items-center"
                >
                  <div className="flex-1 w-full">
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">New Member Name</label>
                    <input
                      type="text"
                      value={newMemberName}
                      onChange={e => setNewMemberName(e.target.value)}
                      placeholder="e.g. Chris, Liam, Sophia"
                      required
                      className="w-full px-4.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs transition-all"
                    />
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowAddMember(false)}
                      className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1 shadow-xs shrink-0"
                    >
                      Add Member
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab Selection Navigation Bar */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex-1 py-3 text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5 border-b-2 ${
                activeTab === 'expenses' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Wallet className="w-4 h-4" /> Transactions
            </button>
            <button
              onClick={() => setActiveTab('balances')}
              className={`flex-1 py-3 text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5 border-b-2 ${
                activeTab === 'balances' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Users className="w-4 h-4" /> Balances
            </button>
            <button
              onClick={() => setActiveTab('debts')}
              className={`flex-1 py-3 text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5 border-b-2 ${
                activeTab === 'debts' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" /> Settle Up
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex-1 py-3 text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5 border-b-2 ${
                activeTab === 'analytics' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <PieChart className="w-4 h-4" /> Insights
            </button>
          </div>

          {/* Interactive Form or Tab Feed Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* Left/Middle: Tab view container */}
            <div className={`col-span-12 ${isFormOpen ? 'lg:col-span-6' : ''} space-y-6`}>
              {activeTab === 'expenses' && (
                <div className="space-y-4">
                  {/* Floating CTA actions for Transactions feed */}
                  <div className="flex justify-between items-center gap-3">
                    <h3 className="font-display font-bold text-slate-900 text-base">Group Ledger</h3>
                    
                    <div className="flex gap-2">
                      {/* Scan Receipt */}
                      <button
                        onClick={() => setIsParserOpen(true)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 font-bold py-2 px-3 rounded-xl transition-all flex items-center gap-1.5 text-xs shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> AI Scan
                      </button>
 
                      {/* Manual Add Expense */}
                      <button
                        onClick={() => {
                          setExpenseToEdit(null);
                          setInitialParsedValues(null);
                          setIsFormOpen(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl transition-all flex items-center gap-1.5 text-xs shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Bill
                      </button>
                    </div>
                  </div>

                  <ExpenseList 
                    group={currentGroup} 
                    onEditExpense={(exp) => {
                      setInitialParsedValues(null);
                      setExpenseToEdit(exp);
                      setIsFormOpen(true);
                    }}
                    onDeleteExpense={handleDeleteExpense}
                  />
                </div>
              )}

              {activeTab === 'balances' && (
                <BalanceView group={currentGroup} />
              )}

              {activeTab === 'debts' && (
                <SettleDebtsView 
                  group={currentGroup} 
                  onRecordSettlement={handleRecordSettlement}
                />
              )}

              {activeTab === 'analytics' && (
                <AnalyticsView group={currentGroup} />
              )}
            </div>

            {/* Split screen: Right side transaction editor */}
            {isFormOpen && (
              <div className="col-span-12 lg:col-span-6">
                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-md space-y-5 sticky top-6">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                    <h3 className="font-display font-bold text-slate-900 text-base">
                      {expenseToEdit ? 'Edit Transaction' : 'Record Transaction'}
                    </h3>
                    <button
                      onClick={() => {
                        setIsFormOpen(false);
                        setExpenseToEdit(null);
                        setInitialParsedValues(null);
                      }}
                      className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                    >
                      Close Form
                    </button>
                  </div>

                  <ExpenseForm
                    group={currentGroup}
                    expenseToEdit={expenseToEdit}
                    initialParsedValues={initialParsedValues}
                    onSubmit={handleExpenseSubmit}
                    onCancel={() => {
                      setIsFormOpen(false);
                      setExpenseToEdit(null);
                      setInitialParsedValues(null);
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Smart Parser Modal overlay */}
      {currentGroup && (
        <SmartParserModal
          group={currentGroup}
          isOpen={isParserOpen}
          onClose={() => setIsParserOpen(false)}
          onParsed={handleParsedResult}
        />
      )}
    </div>
  );
}
