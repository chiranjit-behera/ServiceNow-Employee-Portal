import React, { useEffect, useState, useRef } from 'react';
import { useRequestedItemStore } from '../store/requestedItemStore';
import { useAuthStore } from '../store/authStore';
import { useShallow } from 'zustand/react/shallow';
import { Loader2, Search, Filter, ShoppingBag, Clock, CheckCircle, XCircle, Package } from 'lucide-react';

const STAGE_LABELS = {
  'request_approved': 'Approved',
  'waiting_for_approval': 'Pending Approval',
  'delivery': 'In Delivery',
  'cancelled': 'Cancelled',
  'complete': 'Complete',
  'waiting': 'Waiting',
  'request_denied': 'Denied',
};

const STATE_LABELS = {
  '1': 'Pending Approval',
  '2': 'Approved',
  '3': 'Rejected',
  '-5': 'Awaiting',
  '4': 'Work In Progress',
  '7': 'Closed Complete',
  '8': 'Closed Incomplete',
};

const getStateLabel = (stateCode) => STATE_LABELS[String(stateCode)] || stateCode || '—';

const getStateBadge = (stateCode) => {
  const label = getStateLabel(stateCode);
  const s = String(stateCode);
  const cls =
    s === '7' ? 'bg-green-400/10 text-green-400 border-green-400/20' :
    s === '8' || s === '3' ? 'bg-red-400/10 text-red-400 border-red-400/20' :
    s === '1' ? 'bg-yellow-400/10 text-yellow-500 border-yellow-400/20' :
    s === '2' ? 'bg-blue-400/10 text-blue-400 border-blue-400/20' :
    'bg-slate-400/10 text-slate-400 border-slate-400/20';
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{label}</span>;
};

const RequestList = () => {
  const { requestedItems, metrics, isLoading, error, fetchRequestedItems, cancelRequestedItem } = useRequestedItemStore(useShallow(state => ({
    requestedItems: state.requestedItems,
    metrics: state.metrics,
    isLoading: state.isLoading,
    error: state.error,
    fetchRequestedItems: state.fetchRequestedItems,
    cancelRequestedItem: state.cancelRequestedItem,
  })));

  const user = useAuthStore(state => state.user);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterState, setFilterState] = useState('All');
  const filterRef = useRef(null);
  const activeFilterCount = filterState !== 'All' ? 1 : 0;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setIsFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (user) fetchRequestedItems(user);
  }, [fetchRequestedItems, user]);

  const filteredItems = requestedItems.filter(item => {
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      if (!((item.number && item.number.toLowerCase().includes(q)) || (item.short_description && item.short_description.toLowerCase().includes(q)))) return false;
    }
    if (filterState !== 'All' && String(item.state) !== String(filterState)) return false;
    return true;
  });

  const handleCancel = async (sysId) => {
    setCancellingId(sysId);
    await cancelRequestedItem(sysId);
    setCancellingId(null);
  };

  const stats = [
    { label: 'Total Requests', value: metrics.total, icon: ShoppingBag, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    { label: 'Pending Approval', value: metrics.pending, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { label: 'In Progress', value: metrics.inProgress, icon: Package, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Closed', value: metrics.closed, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">My Requests</h1>
          <p className="text-slate-600 dark:text-slate-400">Track and manage your requested items</p>
        </div>
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
              placeholder="Search requests..."
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
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20">
                <div className="p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex justify-between items-center rounded-t-xl">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Filter by Status</span>
                  {filterState !== 'All' && (
                    <button onClick={() => setFilterState('All')} className="text-[11px] font-bold uppercase text-primary hover:text-blue-600 transition-colors">Clear</button>
                  )}
                </div>
                <div className="p-4">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Status</label>
                  <select value={filterState} onChange={(e) => setFilterState(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary cursor-pointer">
                    <option value="All">All Statuses</option>
                    <option value="1">Pending Approval</option>
                    <option value="2">Approved</option>
                    <option value="3">Rejected</option>
                    <option value="4">Work In Progress</option>
                    <option value="7">Closed Complete</option>
                    <option value="8">Closed Incomplete</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-cyan-500" />
              <p>Loading your requests...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-400">
              <XCircle className="w-10 h-10 mx-auto mb-3 opacity-60" />
              <p>Failed to load requests. {error}</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50 text-slate-300 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">RITM</th>
                  <th className="px-6 py-4 font-medium">Item</th>
                  <th className="px-6 py-4 font-medium">Qty</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Requested On</th>
                  <th className="px-6 py-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-slate-600 opacity-50" />
                      <p className="text-slate-500">{debouncedSearch ? 'No requests match your search.' : "You haven't submitted any requests yet."}</p>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => (
                    <tr key={item.sys_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4 text-sm font-medium text-cyan-400 group-hover:text-cyan-300">{item.number}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300 max-w-xs truncate">{item.short_description || '(Empty)'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{item.quantity || 1}</td>
                      <td className="px-6 py-4">{getStateBadge(item.state)}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{new Date(item.sys_created_on).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        {(item.state === '1' || item.state === '2') ? (
                          <button
                            onClick={() => handleCancel(item.sys_id)}
                            disabled={cancellingId === item.sys_id}
                            className="text-xs text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/60 px-3 py-1 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {cancellingId === item.sys_id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            Cancel
                          </button>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestList;
