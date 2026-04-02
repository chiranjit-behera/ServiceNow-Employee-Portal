import React, { useEffect, useState, useRef } from 'react';
import { useProblemStore } from '../store/problemStore';
import { useAuthStore } from '../store/authStore';
import { useShallow } from 'zustand/react/shallow';
import { Loader2, Search, Filter, X, AlertTriangle, Activity, CheckCircle, XCircle } from 'lucide-react';

const STATE_LABELS = {
  '1': 'Open',
  '2': 'Root Cause Analysis',
  '3': 'Closed',
  '4': 'Resolved',
  '103': 'Risk Accepted',
  '107': 'Fix in Progress',
};

const getStateLabel = (stateCode) => STATE_LABELS[String(stateCode)] || stateCode || '—';

const PRIORITY_MAP = {
  '1': { label: 'Critical', cls: 'bg-red-400/10 text-red-400 border-red-400/20' },
  '2': { label: 'High',     cls: 'bg-orange-400/10 text-orange-400 border-orange-400/20' },
  '3': { label: 'Moderate', cls: 'bg-yellow-400/10 text-yellow-500 border-yellow-400/20' },
  '4': { label: 'Low',      cls: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
};

const getPriorityBadge = (priority) => {
  const p = PRIORITY_MAP[String(priority)] || { label: priority || '—', cls: 'bg-slate-400/10 text-slate-400 border-slate-400/20' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${p.cls}`}>
      {p.label}
    </span>
  );
};

const ProblemList = () => {
  const { problems, metrics, isLoading, error, fetchProblems, createProblem } = useProblemStore(useShallow(state => ({
    problems: state.problems,
    metrics: state.metrics,
    isLoading: state.isLoading,
    error: state.error,
    fetchProblems: state.fetchProblems,
    createProblem: state.createProblem,
  })));

  const user = useAuthStore(state => state.user);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ priority: 'All', state: 'All' });
  const filterRef = useRef(null);
  const activeFilterCount = (filters.priority !== 'All' ? 1 : 0) + (filters.state !== 'All' ? 1 : 0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProbData, setNewProbData] = useState({ short_description: '', priority: '3', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Outside click to close filter
  useEffect(() => {
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setIsFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (user) fetchProblems(user);
  }, [fetchProblems, user]);

  const filteredProblems = problems.filter(p => {
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      if (!((p.number && p.number.toLowerCase().includes(q)) || (p.short_description && p.short_description.toLowerCase().includes(q)))) return false;
    }
    if (filters.priority !== 'All' && String(p.priority) !== String(filters.priority)) return false;
    if (filters.state !== 'All' && String(p.state) !== String(filters.state)) return false;
    return true;
  });

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      ...newProbData,
      ...(user?.sys_id ? { opened_by: user.sys_id } : {}),
    };
    const success = await createProblem(payload);
    setIsSubmitting(false);
    if (success) {
      setIsModalOpen(false);
      setNewProbData({ short_description: '', priority: '3', description: '' });
    }
  };

  const stats = [
    { label: 'Total Problems', value: metrics.total, icon: AlertTriangle, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Open', value: metrics.open, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'In Analysis', value: metrics.inAnalysis, icon: Activity, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { label: 'Resolved', value: metrics.resolved, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">Problems</h1>
          <p className="text-slate-600 dark:text-slate-400">Track and resolve root cause problems</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-purple-600/20"
        >
          New Problem
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl p-5 relative overflow-hidden group hover:-translate-y-0.5 transition-transform duration-200">
            <div className={`absolute top-0 right-0 w-20 h-20 ${s.bg} rounded-bl-full translate-x-3 -translate-y-3 opacity-50 group-hover:scale-110 transition-transform duration-500`} />
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{s.label}</p>
            {isLoading ? <div className="h-7 w-12 bg-slate-700 rounded animate-pulse" /> : <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>}
            <div className={`absolute bottom-3 right-3 ${s.color}`}><s.icon className="w-5 h-5 opacity-60" /></div>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by number or description..."
              className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`p-2 rounded-lg border transition-colors flex-shrink-0 relative ${isFilterOpen || activeFilterCount > 0
                ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white'
                : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
            >
              <Filter className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-primary text-[9px] font-bold text-white rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20">
                <div className="p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex justify-between items-center rounded-t-xl">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Refine Results</span>
                  {activeFilterCount > 0 && (
                    <button onClick={() => setFilters({ priority: 'All', state: 'All' })} className="text-[11px] font-bold uppercase text-primary hover:text-blue-600 transition-colors">Clear All</button>
                  )}
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Priority</label>
                    <select value={filters.priority} onChange={(e) => setFilters(f => ({ ...f, priority: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary cursor-pointer">
                      <option value="All">All Priorities</option>
                      <option value="1">1 - Critical</option>
                      <option value="2">2 - High</option>
                      <option value="3">3 - Moderate</option>
                      <option value="4">4 - Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">State</label>
                    <select value={filters.state} onChange={(e) => setFilters(f => ({ ...f, state: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary cursor-pointer">
                      <option value="All">All States</option>
                      <option value="1">Open</option>
                      <option value="2">Root Cause Analysis</option>
                      <option value="107">Fix in Progress</option>
                      <option value="4">Resolved</option>
                      <option value="3">Closed</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-purple-500" />
              <p>Loading problems...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-400">
              <XCircle className="w-10 h-10 mx-auto mb-3 opacity-60" />
              <p>Failed to load problems. {error}</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50 text-slate-300 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">Number</th>
                  <th className="px-6 py-4 font-medium">Short Description</th>
                  <th className="px-6 py-4 font-medium">Priority</th>
                  <th className="px-6 py-4 font-medium">State</th>
                  <th className="px-6 py-4 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {filteredProblems.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-slate-500">
                      {searchTerm || activeFilterCount > 0 ? 'No problems match your search.' : 'No problems found.'}
                    </td>
                  </tr>
                ) : (
                  filteredProblems.map(prob => (
                    <tr key={prob.sys_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group">
                      <td className="px-6 py-4 text-sm font-medium text-purple-400 group-hover:text-purple-300">{prob.number}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300 max-w-md truncate">{prob.short_description || '(Empty)'}</td>
                      <td className="px-6 py-4">{getPriorityBadge(prob.priority)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{getStateLabel(prob.state)}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{new Date(prob.sys_created_on).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Problem Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Create New Problem</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Short Description</label>
                <input type="text" required value={newProbData.short_description}
                  onChange={e => setNewProbData({ ...newProbData, short_description: e.target.value })}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  placeholder="E.g., Recurring database connection failures" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</label>
                <textarea rows={4} required value={newProbData.description}
                  onChange={e => setNewProbData({ ...newProbData, description: e.target.value })}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none transition-colors"
                  placeholder="Describe the problem in detail..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Priority</label>
                <select value={newProbData.priority} onChange={e => setNewProbData({ ...newProbData, priority: e.target.value })}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors">
                  <option value="1">1 - Critical</option>
                  <option value="2">2 - High</option>
                  <option value="3">3 - Moderate</option>
                  <option value="4">4 - Low</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-300 dark:hover:border-slate-700 transition-colors font-medium">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50 flex items-center gap-2">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? 'Creating...' : 'Create Problem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProblemList;
