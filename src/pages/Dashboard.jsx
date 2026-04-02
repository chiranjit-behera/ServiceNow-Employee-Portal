import React, { useEffect, useState, useMemo } from 'react';
import { useTicketStore } from '../store/ticketStore';
import { useProblemStore } from '../store/problemStore';
import { useRequestedItemStore } from '../store/requestedItemStore';
import { useApprovalStore } from '../store/approvalStore';
import { useAuthStore } from '../store/authStore';
import { useShallow } from 'zustand/react/shallow';
import { X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const { incidents, metrics, isLoading: incidentsLoading, fetchIncidents, createIncident } = useTicketStore(useShallow(state => ({
    incidents: state.incidents,
    metrics: state.metrics,
    isLoading: state.isLoading,
    fetchIncidents: state.fetchIncidents,
    createIncident: state.createIncident
  })));

  const { problems, isLoading: problemsLoading, fetchProblems, createProblem } = useProblemStore(useShallow(state => ({
    problems: state.problems,
    isLoading: state.isLoading,
    fetchProblems: state.fetchProblems,
    createProblem: state.createProblem
  })));

  const { requestedItems, isLoading: requestsLoading, fetchRequestedItems } = useRequestedItemStore(useShallow(state => ({
    requestedItems: state.requestedItems,
    isLoading: state.isLoading,
    fetchRequestedItems: state.fetchRequestedItems,
  })));

  const { approvals, isLoading: approvalsLoading, fetchApprovals } = useApprovalStore(useShallow(state => ({
    approvals: state.approvals,
    isLoading: state.isLoading,
    fetchApprovals: state.fetchApprovals,
  })));

  const user = useAuthStore(state => state.user);

  // Backward-compatible aggregate loading flag.
  // (Some JSX sections may still reference `isLoading`; keeping it prevents runtime crashes.)
  const isLoading = incidentsLoading || problemsLoading || requestsLoading || approvalsLoading;

  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [isProblemModalOpen, setIsProblemModalOpen] = useState(false);
  // const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [newIncData, setNewIncData] = useState({ short_description: '', priority: '3', description: '' });
  const [newProbData, setNewProbData] = useState({ short_description: '', priority: '3', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chartsRefreshSeed, setChartsRefreshSeed] = useState(0);

  useEffect(() => {
    if (user) fetchIncidents(user);
  }, [fetchIncidents, user]);

  useEffect(() => {
    if (user) fetchProblems(user);
  }, [fetchProblems, user]);

  useEffect(() => {
    if (user) fetchRequestedItems(user);
  }, [fetchRequestedItems, user]);

  useEffect(() => {
    if (user) fetchApprovals(user);
  }, [fetchApprovals, user]);


  const buildMonthlyCounts = (items) => {
    if (!Array.isArray(items) || items.length === 0) return [];

    // Group occurrences by "YYYY-MM" to enable exact chronological sorting
    const counts = {};
    items.forEach((row) => {
      const d = new Date(row?.sys_created_on);
      if (isNaN(d.getTime())) return;
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      counts[yearMonth] = (counts[yearMonth] || 0) + 1;
    });

    // Sort the keys chronologically
    const sortedKeys = Object.keys(counts).sort();

    // Map the sorted data to a format recharts expects ("Jan 2024")
    return sortedKeys.map((key) => {
      const [year, month] = key.split('-');
      const dateObj = new Date(year, month - 1);
      const displayStr = dateObj.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
      return { date: displayStr, count: counts[key] };
    });
  };

  const chartData = useMemo(() => buildMonthlyCounts(incidents), [incidents, chartsRefreshSeed]);
  const problemChartData = useMemo(() => buildMonthlyCounts(problems), [problems, chartsRefreshSeed]);
  const requestChartData = useMemo(() => buildMonthlyCounts(requestedItems), [requestedItems, chartsRefreshSeed]);
  const approvalChartData = useMemo(() => buildMonthlyCounts(approvals), [approvals, chartsRefreshSeed]);

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
          onClick={() => {
            if (!user) return;
            fetchIncidents(user);
            fetchProblems(user);
            fetchRequestedItems(user);
            fetchApprovals(user);
            setChartsRefreshSeed((s) => s + 1);
          }}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors border border-slate-200 dark:border-slate-700 flex items-center"
        >
          {incidentsLoading || problemsLoading || requestsLoading || approvalsLoading ? 'Loading...' : 'Refresh Data'}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm min-h-[520px]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Incident Volume Trend</h2>
              <div className="h-[360px] flex items-center justify-center text-slate-500 pb-8">
                {incidentsLoading && incidents.length === 0 ? (
                  <div className="animate-pulse space-y-4 w-full h-full max-h-[300px]">
                    <div className="h-1/2 w-full bg-slate-800 rounded"></div>
                    <div className="h-1/4 w-[80%] bg-slate-800 rounded"></div>
                  </div>
                ) : chartData.length > 0 ? (
                  <div className="h-full w-full min-h-[320px]">
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
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Problem Volume Trend</h2>
              <div className="h-[360px] flex items-center justify-center text-slate-500 pb-8">
                {problemsLoading && problems.length === 0 ? (
                  <div className="animate-pulse space-y-4 w-full h-full max-h-[300px]">
                    <div className="h-1/2 w-full bg-slate-800 rounded"></div>
                    <div className="h-1/4 w-[80%] bg-slate-800 rounded"></div>
                  </div>
                ) : problemChartData.length > 0 ? (
                  <div className="h-full w-full min-h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={problemChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 8 }} />
                        <CartesianGrid stroke="#334155" strokeDasharray="5 5" vertical={false} />
                        <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }} itemStyle={{ color: '#c4b5fd' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p>No recent problems recorded.</p>
                )}
              </div>
            </div>

            <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Request Volume Trend</h2>
              <div className="h-[360px] flex items-center justify-center text-slate-500 pb-8">
                {requestsLoading && requestedItems.length === 0 ? (
                  <div className="animate-pulse space-y-4 w-full h-full max-h-[300px]">
                    <div className="h-1/2 w-full bg-slate-800 rounded"></div>
                    <div className="h-1/4 w-[80%] bg-slate-800 rounded"></div>
                  </div>
                ) : requestChartData.length > 0 ? (
                  <div className="h-full w-full min-h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={requestChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <Line type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 8 }} />
                        <CartesianGrid stroke="#334155" strokeDasharray="5 5" vertical={false} />
                        <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }} itemStyle={{ color: '#67e8f9' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p>No recent requests recorded.</p>
                )}
              </div>
            </div>

            <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Approval Volume Trend</h2>
              <div className="h-[360px] flex items-center justify-center text-slate-500 pb-8">
                {approvalsLoading && approvals.length === 0 ? (
                  <div className="animate-pulse space-y-4 w-full h-full max-h-[300px]">
                    <div className="h-1/2 w-full bg-slate-800 rounded"></div>
                    <div className="h-1/4 w-[80%] bg-slate-800 rounded"></div>
                  </div>
                ) : approvalChartData.length > 0 ? (
                  <div className="h-full w-full min-h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={approvalChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 8 }} />
                        <CartesianGrid stroke="#334155" strokeDasharray="5 5" vertical={false} />
                        <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }} itemStyle={{ color: '#86efac' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p>No recent approvals recorded.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="space-y-3">
          <button
            onClick={() => setIsIncidentModalOpen(true)}
            className="w-full text-left px-4 py-3 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-500 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-200 transition-colors flex items-center gap-2"
          >
            <span className="text-primary text-lg">+</span> Create New Incident
          </button>
          <button
            onClick={() => setIsProblemModalOpen(true)}
            className="w-full text-left px-4 py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-200 transition-colors"
          >
            <span className="text-primary text-lg">+</span> Create New Problem
          </button>
          <button className="w-full text-left px-4 py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-200 transition-colors">
            View My Approvals
          </button>
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
