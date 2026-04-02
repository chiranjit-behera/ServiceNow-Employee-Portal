import React, { useEffect, useState, useRef } from 'react';
import { useApprovalStore } from '../store/approvalStore';
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

function Approvals() {
  const { approvals, metrics, isLoading, error, fetchApprovals } = useApprovalStore(useShallow(state => ({
    approvals: state.approvals,
    metrics: state.metrics,
    isLoading: state.isLoading,
    error: state.error,
    fetchApprovals: state.fetchApprovals,
  })));

  const safeValue = (val) => {
    if (val == null) return '(Empty)';
    if (typeof val === 'object') {
      if ('display_value' in val && val.display_value != null) return val.display_value;
      if ('display' in val && val.display != null) return val.display;
      if ('value' in val && val.value != null) return val.value;
      if ('label' in val && val.label != null) return val.label;
      if ('sys_id' in val && val.sys_id != null) return val.sys_id;
      return JSON.stringify(val);
    }
    return val;
  };

  const user = useAuthStore(state => state.user);

//   const [searchTerm, setSearchTerm] = useState('');
//   const [debouncedSearch, setDebouncedSearch] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
//   const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterState, setFilterState] = useState('All');
  const filterRef = useRef(null);

  useEffect(() => {
    if (user) fetchApprovals(user);
  }, [fetchApprovals, user]);

  const handleApprove = async (sysId) => {
    // setCancellingId(sysId);
    // // NOTE: cancelRequestedItem / approve/reject action is currently not implemented in the store.
    // // Keep UI responsive and clear the loading state after a short delay.
    // setTimeout(() => setCancellingId(null), 400);
    alert('Approve action is not implemented yet. This is a placeholder to show where the approve functionality would be triggered.');
  };
  const handleReject = async (sysId) => {
    // setCancellingId(sysId);
    // // NOTE: cancelRequestedItem / approve/reject action is currently not implemented in the store.
    // // Keep UI responsive and clear the loading state after a short delay.
    // setTimeout(() => setCancellingId(null), 400);
    alert('Reject action is not implemented yet. This is a placeholder to show where the reject functionality would be triggered.');
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">My Approvals</h1>
          <p className="text-slate-600 dark:text-slate-400">Track and manage your approval requests</p>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
        

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-cyan-500" />
              <p>Loading your approvals...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-400">
              <XCircle className="w-10 h-10 mx-auto mb-3 opacity-60" />
              <p>Failed to load approvals. {error}</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50 text-slate-300 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">Approval for</th>
                  <th className="px-6 py-4 font-medium">Group</th>
                  <th className="px-6 py-4 font-medium">Approver</th>
                  <th className="px-6 py-4 font-medium">State</th>
                  <th className="px-6 py-4 font-medium">Created</th>
                  <th className="px-6 py-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {approvals.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-slate-600 opacity-50" />
                      <p className="text-slate-500">{ "No approvals yet."}</p>
                    </td>
                  </tr>
                ) : (
                  approvals.map(item => (
                    <tr key={item.sys_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4 text-sm font-medium text-cyan-400 group-hover:text-cyan-300">{safeValue(item.sysapproval)}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300 max-w-xs truncate">{safeValue(item.group)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{safeValue(item.approver)}</td>
                      <td className="px-6 py-4">{getStateBadge(item.state)}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{item.sys_created_on ? new Date(item.sys_created_on).toLocaleDateString() : '—'}</td>
                      <td className="px-6 py-4">
                        {(item.state == 'requested') ? (
                          <button
                            onClick={() => handleApprove(item.sys_id)}
                            disabled={cancellingId === item.sys_id}
                            className="text-xs text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/60 px-3 py-1 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {cancellingId === item.sys_id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            Approve
                          </button>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                        {(item.state == 'requested') ? (
                          <button
                            onClick={() => handleReject(item.sys_id)}
                            disabled={cancellingId === item.sys_id}
                            className="text-xs text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/60 px-3 py-1 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {cancellingId === item.sys_id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            Reject
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
}

export default Approvals