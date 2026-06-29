import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, Trash2, ArrowRight, History, Sparkles, AlertCircle } from 'lucide-react';
import { Group } from '../types';

interface GroupSelectorProps {
  onGroupSelected: (group: Group) => void;
}

export default function GroupSelector({ onGroupSelected }: GroupSelectorProps) {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [members, setMembers] = useState<string[]>(['', '']);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentGroups, setRecentGroups] = useState<{ id: string; name: string; currency: string }[]>([]);

  // Load recently visited groups from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('settle_up_recent_groups');
      if (stored) {
        setRecentGroups(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleAddMemberField = () => {
    setMembers([...members, '']);
  };

  const handleRemoveMemberField = (index: number) => {
    if (members.length <= 1) return;
    const updated = [...members];
    updated.splice(index, 1);
    setMembers(updated);
  };

  const handleMemberNameChange = (index: number, val: string) => {
    const updated = [...members];
    updated[index] = val;
    setMembers(updated);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter a group name.');
      return;
    }

    const filteredMembers = members.map(m => m.trim()).filter(m => m !== '');
    if (filteredMembers.length < 2) {
      setError('Please add at least 2 members to split expenses.');
      return;
    }

    // Check for duplicate member names
    const duplicates = filteredMembers.filter((item, index) => filteredMembers.indexOf(item) !== index);
    if (duplicates.length > 0) {
      setError(`Duplicate member names are not allowed: ${duplicates.join(', ')}`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          currency,
          members: filteredMembers
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create group.');
      }

      const createdGroup: Group = await res.json();
      
      // Save to recent groups
      const updatedRecent = [
        { id: createdGroup.id, name: createdGroup.name, currency: createdGroup.currency },
        ...recentGroups.filter(g => g.id !== createdGroup.id)
      ].slice(0, 5); // Keep last 5

      localStorage.setItem('settle_up_recent_groups', JSON.stringify(updatedRecent));
      onGroupSelected(createdGroup);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const code = joinCode.trim();
    if (!code) {
      setError('Please enter a group code.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${code}`);
      if (!res.ok) {
        throw new Error('Group not found. Check the code and try again.');
      }

      const group: Group = await res.json();
      
      // Save to recent groups
      const updatedRecent = [
        { id: group.id, name: group.name, currency: group.currency },
        ...recentGroups.filter(g => g.id !== group.id)
      ].slice(0, 5);

      localStorage.setItem('settle_up_recent_groups', JSON.stringify(updatedRecent));
      onGroupSelected(group);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRecent = async (id: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${id}`);
      if (!res.ok) {
        // If group no longer exists on server, remove from recent
        const updatedRecent = recentGroups.filter(g => g.id !== id);
        setRecentGroups(updatedRecent);
        localStorage.setItem('settle_up_recent_groups', JSON.stringify(updatedRecent));
        throw new Error('This group could not be found on the server.');
      }
      const group = await res.json();
      onGroupSelected(group);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="group_selector_container" className="max-w-4xl mx-auto px-4 py-8">
      {/* Brand Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold mb-4 border border-indigo-100 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
          The Ultimate Bill Splitter
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 mb-3">
          Settle <span className="text-indigo-600">Up</span>
        </h1>
        <p className="text-slate-600 max-w-md mx-auto text-sm sm:text-base">
          Collaboratively track shared expenses, split bills, and calculate the easiest way to settle debts with friends.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-rose-50 border-l-4 border-rose-500 rounded-r-xl flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-800">Something went wrong</p>
              <p className="text-xs text-rose-600 mt-0.5">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Create Group Box */}
        <div className="md:col-span-7 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-indigo-600" />
            Create a New Group
          </h2>

          <form onSubmit={handleCreateGroup} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Group Title</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Roommates, Tokyo Trip, Weekend Cabin"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Primary Currency</label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm transition-all"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Group Members</label>
                <button
                  type="button"
                  onClick={handleAddMemberField}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline transition-all"
                >
                  <Plus className="w-3 h-3" /> Add Member
                </button>
              </div>
              
              <div className="space-y-3 max-h-52 overflow-y-auto pr-2">
                {members.map((member, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <span className="text-xs font-medium text-slate-400 w-5">{idx + 1}.</span>
                    <input
                      type="text"
                      value={member}
                      onChange={e => handleMemberNameChange(idx, e.target.value)}
                      placeholder={`e.g. ${idx === 0 ? 'Alex' : idx === 1 ? 'Jordan' : 'Member ' + (idx + 1)}`}
                      className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm transition-all"
                    />
                    {members.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMemberField(idx)}
                        className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Group...' : 'Create Group'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Join Group & History Box */}
        <div className="md:col-span-5 space-y-8">
          {/* Join Group */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Join Existing Group
            </h2>
            <form onSubmit={handleJoinGroup} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value)}
                  placeholder="Enter unique Group ID (e.g. g_3x8a9j)"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
              >
                Join Group
              </button>
            </form>
          </div>

          {/* Recently Visited */}
          {recentGroups.length > 0 && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                <History className="w-4 h-4 text-slate-500" />
                Recently Visited
              </h2>
              <div className="space-y-3">
                {recentGroups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => handleSelectRecent(g.id)}
                    disabled={loading}
                    className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 flex justify-between items-center transition-all group disabled:opacity-50"
                  >
                    <div>
                      <p className="font-semibold text-sm text-slate-800 group-hover:text-indigo-950 transition-colors">
                        {g.name}
                      </p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">Code: {g.id}</p>
                    </div>
                    <span className="text-xs font-bold bg-slate-100 group-hover:bg-indigo-100 text-slate-600 group-hover:text-indigo-800 px-2 py-1 rounded-md transition-colors">
                      {g.currency}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
