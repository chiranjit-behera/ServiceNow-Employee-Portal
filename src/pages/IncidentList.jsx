import React, { useEffect, useState, useRef } from 'react';
import { useTicketStore } from '../store/ticketStore';
import { useAuthStore } from '../store/authStore';
import { useShallow } from 'zustand/react/shallow';
import { Loader2, Search, Filter, X, Activity, AlertCircle, Clock, BarChart3 } from 'lucide-react';

// ServiceNow incident state codes -> human readable labels
const STATE_LABELS = {
  '1': 'New',
  '2': 'In Progress',
  '3': 'On Hold',
  '6': 'Resolved',
  '7': 'Closed',
  '8': 'Canceled',
};

const getStateLabel = (stateCode) => STATE_LABELS[String(stateCode)] || stateCode || '—';

const IncidentList = () => {
  const { incidents, isLoading, metrics, fetchIncidents, error, createIncident } = useTicketStore(useShallow(state => ({
    incidents: state.incidents,
    isLoading: state.isLoading,
    metrics: state.metrics,
    fetchIncidents: state.fetchIncidents,
    error: state.error,
    createIncident: state.createIncident
  })));

  const safeMetrics = metrics || { active: 0, critical: 0, resolved: 0, canceled: 0 };

  const user = useAuthStore(state => state.user);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Filter Popover States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ priority: 'All', state: 'All' });
  const filterRef = useRef(null);
  const activeFilterCount = (filters.priority !== 'All' ? 1 : 0) + (filters.state !== 'All' ? 1 : 0);

  // Close filter popover on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 800);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredIncidents = incidents.filter((inc) => {
    // 1. Text Search
    if (debouncedSearch) {
      const lowerSearch = debouncedSearch.toLowerCase();
      const matchesSearch = (inc.number && inc.number.toLowerCase().includes(lowerSearch)) ||
                            (inc.short_description && inc.short_description.toLowerCase().includes(lowerSearch));
      if (!matchesSearch) return false;
    }

    // 2. Priority Filter
    if (filters.priority !== 'All' && String(inc.priority) !== String(filters.priority)) {
      return false;
    }

    // 3. State Filter
    if (filters.state !== 'All' && inc.state !== filters.state) {
      return false;
    }

    return true;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newIncData, setNewIncData] = useState({ short_description: '', priority: '3', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) fetchIncidents(user);
  }, [fetchIncidents, user]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      ...newIncData,
      ...(user?.sys_id ? { caller_id: user.sys_id } : {})
    };
    const success = await createIncident(payload);
    setIsSubmitting(false);
    if(success) {
      setIsModalOpen(false);
      setNewIncData({ short_description: '', priority: '3', description: '' });
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case '1': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-400/10 text-red-400 border border-red-400/20">Critical</span>;
      case '2': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-400/10 text-orange-400 border border-orange-400/20">High</span>;
      case '3': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-400/10 text-yellow-500 border border-yellow-400/20">Moderate</span>;
      default: return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-400/10 text-blue-400 border border-blue-400/20">Low</span>;
    }
  };

  const stats = [
    { label: 'Total Active', value: safeMetrics.active, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Critical Priority', value: safeMetrics.critical, icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
    { label: 'Resolved', value: safeMetrics.resolved, icon: Clock, color: 'text-green-400', bg: 'bg-green-400/10' },
    { label: 'Canceled', value: safeMetrics.canceled, icon: BarChart3, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">Incidents</h1>
          <p className="text-slate-600 dark:text-slate-400">Manage and resolve active incidents</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-primary/20"
        >
          New Incident
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

      <div className="bg-surface border border-slate-700 rounded-xl shadow-sm">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-500" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200 rounded-lg py-2 pl-9 pr-3 focus:outline-none focus:border-primary transition-colors"
              placeholder="Search by number or short description..."
            />
          </div>
          
          <div className="relative" ref={filterRef}>
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`p-2 rounded-lg border transition-colors flex flex-shrink-0 relative ${
                isFilterOpen || activeFilterCount > 0 
                  ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white' 
                  : 'bg-slate-50 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Filter className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-[6px] -right-[6px] h-[16px] w-[16px] bg-primary text-[9px] font-bold text-white rounded-full flex items-center justify-center shadow-sm border border-slate-50 dark:border-slate-800">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/40 border border-slate-200 dark:border-slate-700 z-20 overflow-hidden transform origin-top-right transition-all animate-fade-in">
                <div className="p-3 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/80 flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Refine Results</span>
                  {activeFilterCount > 0 && (
                    <button 
                      onClick={() => setFilters({ priority: 'All', state: 'All' })}
                      className="text-[11px] font-bold uppercase tracking-wider text-primary hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Priority</label>
                    <select 
                      value={filters.priority}
                      onChange={(e) => setFilters(f => ({ ...f, priority: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors cursor-pointer"
                    >
                      <option value="All">All Priorities</option>
                      <option value="1">1 - Critical</option>
                      <option value="2">2 - High</option>
                      <option value="3">3 - Moderate</option>
                      <option value="4">4 - Low</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">State</label>
                    <select 
                      value={filters.state}
                      onChange={(e) => setFilters(f => ({ ...f, state: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors cursor-pointer"
                    >
                      <option value="All">All States</option>
                      <option value="1">New</option>
                      <option value="2">In Progress</option>
                      <option value="3">On Hold</option>
                      <option value="6">Resolved</option>
                      <option value="7">Closed</option>
                      <option value="8">Canceled</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>


        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
              <p>Loading incidents...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-400">
              <p>Failed to load incidents. {error}</p>
              <p className="text-sm mt-2 text-slate-500">Are you sure the CORS policy and credentials are correct?</p>
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
                {filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                      {searchTerm ? 'No incidents match your search.' : 'No incidents found.'}
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map((inc) => (
                    <tr key={inc.sys_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer">
                      <td className="px-6 py-4 text-sm font-medium text-primary group-hover:text-blue-400">
                        {inc.number}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300 max-w-md truncate">
                        {inc.short_description || '(Empty)'}
                      </td>
                      <td className="px-6 py-4">
                        {getPriorityBadge(inc.priority)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400 dark:text-slate-400">
                        {getStateLabel(inc.state)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(inc.sys_created_on).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl relative overflow-hidden transform transition-all">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
              <h3 className="text-xl font-semibold text-white">Create New Incident</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Short Description</label>
                <input 
                  type="text" required 
                  value={newIncData.short_description}
                  onChange={e => setNewIncData({...newIncData, short_description: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  placeholder="E.g., Unable to access VPN" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea 
                  rows={4} required
                  value={newIncData.description}
                  onChange={e => setNewIncData({...newIncData, description: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none transition-colors"
                  placeholder="Provide detailed information..." 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Priority</label>
                <select 
                  value={newIncData.priority}
                  onChange={e => setNewIncData({...newIncData, priority: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                >
                  <option value="1">1 - Critical</option>
                  <option value="2">2 - High</option>
                  <option value="3">3 - Moderate</option>
                  <option value="4">4 - Low</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent hover:border-slate-700 transition-colors font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-lg bg-primary hover:bg-blue-600 focus:ring-4 focus:ring-primary/30 text-white font-medium transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center">
                  {isSubmitting ? 'Creating...' : 'Create Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentList;
