import React, { useState } from 'react';
import { useApprovalStore } from '../store/approvalStore';
import withListView from '../hoc/withListView';
import ListViewShell from '../components/ListViewShell';
import RecordDetailsModal from '../components/RecordDetailsModal';
import { Loader2, ShoppingBag } from 'lucide-react';



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

const isRequestedState = (state) => {
  // ServiceNow may return numeric codes ('1') or display values ('Requested').
  const normalized = safeValue(state);
  return String(normalized) === '1' || normalized === 'Requested' || getStateLabel(normalized) === 'Pending Approval';
};

const ApprovalsBase = ({
  filteredItems: approvals,
  isLoading,
  error,
  approveApproval,
  rejectApproval,
  searchTerm,
  setSearchTerm,
  debouncedSearch,
  isFilterOpen,
  setIsFilterOpen,
  filterRef,
  filters: filterState,
  setFilters: setFilterState,
  activeFilterCount,
}) => {
  const [cancellingId, setCancellingId] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);

  const handleApprove = async (sysId) => {
    setCancellingId(sysId);
    try {
      await approveApproval(sysId);
    } catch (error) {
      console.error('Error approving:', error);
    } finally {
      setCancellingId(null);
    }
  };

  const handleReject = async (sysId) => {
    setCancellingId(sysId);
    try {
      await rejectApproval(sysId);
    } catch (error) {
      console.error('Error rejecting:', error);
    } finally {
      setCancellingId(null);
    }
  };

  const approvalFields = [
    { label: 'Approval For', key: 'document_id', render: (val) => safeValue(val) },
    { label: 'State', key: 'state', render: (val) => getStateBadge(val) },
    { label: 'Approver', key: 'approver', render: (val) => safeValue(val) },
    { label: 'Created', key: 'sys_created_on', render: (val) => val ? new Date(val).toLocaleString('en-GB') : '—' },
    { label: 'Group', key: 'group', render: (val) => safeValue(val) },
    { label: 'Updated', key: 'sys_updated_on', render: (val) => val ? new Date(val).toLocaleString('en-GB') : '—' },
    { label: 'Comments', key: 'comments', render: (val) => val || '—' },
  ];

  return (
    <ListViewShell
      title="My Approvals"
      subtitle="Track and manage your approval requests"

      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      searchPlaceholder="Search approvals..."
      debouncedSearch={debouncedSearch}

      isFilterOpen={isFilterOpen}
      setIsFilterOpen={setIsFilterOpen}
      filterRef={filterRef}
      filters={filterState}
      setFilters={setFilterState}
      activeFilterCount={activeFilterCount}
      renderFilterPopover={({ filters: currentFilters, setFilters: setCurrentFilters }) => (
        <div className="w-60 overflow-hidden">
          <div className="p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex justify-between items-center rounded-t-xl">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Filter by Status</span>
            {currentFilters !== 'All' ? (
              <button
                onClick={() => setCurrentFilters('All')}
                className="text-[11px] font-bold uppercase text-primary hover:text-blue-600 transition-colors"
              >
                Clear
              </button>
            ) : null}
          </div>

          <div className="p-4">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Status</label>
            <select
              value={currentFilters}
              onChange={(e) => setCurrentFilters(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="1">Pending Approval</option>
              <option value="2">Approved</option>
              <option value="3">Rejected</option>
              <option value="-5">Awaiting</option>
              <option value="4">Work In Progress</option>
              <option value="7">Closed Complete</option>
              <option value="8">Closed Incomplete</option>
            </select>
          </div>
        </div>
      )}

      filteredItems={approvals}
      isLoading={isLoading}
      error={error}
      renderTableHead={() => (
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
      )}
      renderRow={(item) => (
        <tr
          key={item.sys_id}
          className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer"
        >
          <td className="px-6 py-4 text-sm font-medium text-cyan-400 group-hover:text-cyan-300" onClick={() => setViewRecord(item)}>
            {safeValue(item.document_id)}
          </td>
          <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300 max-w-xs truncate">
            {safeValue(item.group)}
          </td>
          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
            {safeValue(item.approver)}
          </td>
          <td className="px-6 py-4">{getStateBadge(item.state)}</td>
          <td className="px-6 py-4 text-sm text-slate-500">
            {item.sys_created_on ? new Date(item.sys_created_on).toLocaleDateString('en-GB') : '—'}
          </td>
          <td className="px-6 py-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
            {isRequestedState(item.state) ? (
              <button
                onClick={() => handleApprove(item.sys_id)}
                disabled={cancellingId === item.sys_id}
                className="text-xs text-green-400 hover:text-green-300 border border-green-400/30 hover:border-green-400/60 px-3 py-1 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {cancellingId === item.sys_id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Approve
              </button>
            ) : (
              <span className="text-xs text-slate-600">—</span>
            )}

            {isRequestedState(item.state) ? (
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
      )}
      renderEmpty={({ debouncedSearch: ds, activeFilterCount: afc }) => (
        <tr>
          <td colSpan="6" className="px-6 py-12 text-center">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-slate-600 opacity-50" />
            <p className="text-slate-500">
              {ds || afc > 0 ? 'No approvals match your search/filter.' : 'No approvals yet.'}
            </p>
          </td>
        </tr>
      )}
    >
      <RecordDetailsModal
        isOpen={!!viewRecord}
        onClose={() => setViewRecord(null)}
        title="Approval Details"
        record={viewRecord}
        fields={approvalFields}
      />
    </ListViewShell>
  );
};

export default withListView({
  useStoreHook: useApprovalStore,
  select: (state) => ({
    items: state.approvals,
    metrics: state.metrics,
    isLoading: state.isLoading,
    error: state.error,
    fetchList: state.fetchApprovals,
    approveApproval: state.approveApproval,
    rejectApproval: state.rejectApproval,
  }),
  initialFilters: 'All',
  getActiveFilterCount: (f) => (f !== 'All' ? 1 : 0),
  filterFn: (item, { debouncedSearch, filters }) => {
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      const doc = safeValue(item.document_id);
      const grp = safeValue(item.group);
      const appr = safeValue(item.approver);
      const matchesSearch =
        (doc && String(doc).toLowerCase().includes(q)) ||
        (grp && String(grp).toLowerCase().includes(q)) ||
        (appr && String(appr).toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }

    if (filters !== 'All' && String(item.state) !== String(filters)) return false;
    return true;
  },
  debounceMs: 500,
})(ApprovalsBase);