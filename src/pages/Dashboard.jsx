import React, { useEffect, useState, useMemo } from 'react';
import { useTicketStore } from '../store/ticketStore';
import { useProblemStore } from '../store/problemStore';
import { useAuthStore } from '../store/authStore';
import { useShallow } from 'zustand/react/shallow';
import { X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const { incidents, metrics, isLoading, fetchIncidents, createIncident } = useTicketStore(useShallow(state => ({
    incidents: state.incidents,
    metrics: state.metrics,
    isLoading: state.isLoading,
    fetchIncidents: state.fetchIncidents,
    createIncident: state.createIncident
  })));

  const { problems, fetchProblems, createProblem } = useProblemStore(useShallow(state => ({
    problems: state.problems,
    fetchProblems: state.fetchProblems,
    createProblem: state.createProblem
  })));

  const user = useAuthStore(state => state.user);

  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [isProblemModalOpen, setIsProblemModalOpen] = useState(false);
  // const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [newIncData, setNewIncData] = useState({ short_description: '', priority: '3', description: '' });
  const [newProbData, setNewProbData] = useState({ short_description: '', priority: '3', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) fetchIncidents(user);
  }, [fetchIncidents, user]);


  const chartData = useMemo(() => {
    if (!incidents.length) return [];

    // Group occurrences by "YYYY-MM" to enable exact chronological sorting
    const counts = {};
    incidents.forEach(inc => {
      const d = new Date(inc.sys_created_on);
      // Valid fallback for invalid dates
      if (isNaN(d.getTime())) return;
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      counts[yearMonth] = (counts[yearMonth] || 0) + 1;
    });

    // Sort the keys chronologically
    const sortedKeys = Object.keys(counts).sort();

    // Map the sorted data to a format recharts and the user expects ("Jan 2024")
    return sortedKeys.map(key => {
      const [year, month] = key.split('-');
      const dateObj = new Date(year, month - 1);
      const displayStr = dateObj.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
      return { date: displayStr, count: counts[key] };
    });
  }, [incidents]);

  const handleCreateIncidentSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      ...newIncData,
      ...(user?.sys_id ? { caller_id: user.sys_id } : {})
    };
    const success = await createIncident(payload);
    setIsSubmitting(false);
    if (success) {
      setIsIncidentModalOpen(false);
      setNewIncData({ short_description: '', priority: '3', description: '' });
    }
  };

  const handleCreateProblemSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      ...newProbData,
      ...(user?.sys_id ? { caller_id: user.sys_id } : {})
    };
    const success = await createProblem(payload);
    setIsSubmitting(false);
    if (success) {
      setIsProblemModalOpen(false);
      setNewProbData({ short_description: '', priority: '3', description: '' });
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400">Welcome back, {user?.username || 'User'}. Here's what's happening today.</p>
        </div>
        <button
          onClick={() => fetchIncidents(user)}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors border border-slate-200 dark:border-slate-700 flex items-center"
        >
          {isLoading ? 'Loading...' : 'Refresh Data'}
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm min-h-[400px]">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Incident Volume Trend</h2>
          <div className="h-full flex items-center justify-center text-slate-500 pb-8">
            {isLoading && incidents.length === 0 ? (
              <div className="animate-pulse space-y-4 w-full h-full max-h-[300px]">
                <div className="h-1/2 w-full bg-slate-800 rounded"></div>
                <div className="h-1/4 w-[80%] bg-slate-800 rounded"></div>
              </div>
            ) : chartData.length > 0 ? (
              <div className="h-full w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 8 }} />
                    <CartesianGrid stroke="#334155" strokeDasharray="5 5" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }} itemStyle={{ color: '#bae6fd' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p>No recent incidents recorded.</p>
            )}
          </div>
        </div>
        <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button onClick={() => setIsIncidentModalOpen(true)} className="w-full text-left px-4 py-3 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-500 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-200 transition-colors flex items-center gap-2">
              <span className="text-primary text-lg">+</span> Create New Incident
            </button>
            <button onClick={() => setIsProblemModalOpen(true)} className="w-full text-left px-4 py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-200 transition-colors">
              <span className="text-primary text-lg">+</span> Create New Problem
            </button>
            <button className="w-full text-left px-4 py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-200 transition-colors">
              View My Approvals
            </button>
          </div>
        </div>
      </div>

      {isIncidentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl w-full max-w-lg shadow-2xl relative overflow-hidden transform transition-all">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-800/50">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Create New Incident</h3>
              <button onClick={() => setIsIncidentModalOpen(false)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateIncidentSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Short Description</label>
                <input
                  type="text" required
                  value={newIncData.short_description}
                  onChange={e => setNewIncData({ ...newIncData, short_description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  placeholder="E.g., Unable to access VPN"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  rows={4} required
                  value={newIncData.description}
                  onChange={e => setNewIncData({ ...newIncData, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none transition-colors"
                  placeholder="Provide detailed information..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Priority</label>
                <select
                  value={newIncData.priority}
                  onChange={e => setNewIncData({ ...newIncData, priority: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                >
                  <option value="1">1 - Critical</option>
                  <option value="2">2 - High</option>
                  <option value="3">3 - Moderate</option>
                  <option value="4">4 - Low</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsIncidentModalOpen(false)} className="px-5 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-slate-900 dark:text-white border border-transparent hover:border-slate-200 dark:border-slate-700 transition-colors font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-lg bg-primary hover:bg-blue-600 focus:ring-4 focus:ring-primary/30 text-slate-900 dark:text-white font-medium transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center">
                  {isSubmitting ? 'Creating...' : 'Create Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isProblemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl w-full max-w-lg shadow-2xl relative overflow-hidden transform transition-all">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-800/50">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Create New Problem</h3>
              <button onClick={() => setIsProblemModalOpen(false)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateProblemSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Short Description</label>
                <input
                  type="text" required
                  value={newProbData.short_description}
                  onChange={e => setNewProbData({ ...newProbData, short_description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  placeholder="E.g., Unable to access VPN"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  rows={4} required
                  value={newProbData.description}
                  onChange={e => setNewProbData({ ...newProbData, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none transition-colors"
                  placeholder="Provide detailed information..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Priority</label>
                <select
                  value={newProbData.priority}
                  onChange={e => setNewProbData({ ...newProbData, priority: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                >
                  <option value="1">1 - Critical</option>
                  <option value="2">2 - High</option>
                  <option value="3">3 - Moderate</option>
                  <option value="4">4 - Low</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsProblemModalOpen(false)} className="px-5 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-slate-900 dark:text-white border border-transparent hover:border-slate-200 dark:border-slate-700 transition-colors font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-lg bg-primary hover:bg-blue-600 focus:ring-4 focus:ring-primary/30 text-slate-900 dark:text-white font-medium transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center">
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

export default Dashboard;
