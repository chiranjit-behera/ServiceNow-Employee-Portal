import React, { useState } from 'react';
import { useRequestedItemStore } from '../store/requestedItemStore';
import withListView from '../hoc/withListView';
import ListViewShell from '../components/ListViewShell';
import RecordDetailsModal from '../components/RecordDetailsModal';
import { Loader2, ShoppingBag, Clock, CheckCircle, Package } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

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
  if (val == null) return '';
  if (typeof val === 'object') {
    if ('display_value' in val && val.display_value != null) return val.display_value;
    if ('display' in val && val.display != null) return val.display;
    if ('value' in val && val.value != null) return val.value;
    if ('label' in val && val.label != null) return val.label;
    if ('sys_id' in val && val.sys_id != null) return val.sys_id;
    return JSON.stringify(val);
  }
  return String(val);
};

const isRequestedState = (state) => {
  // ServiceNow may return numeric codes ('1') or display values ('Requested').
  const normalized = safeValue(state);
  return String(normalized) === '1' || normalized === 'Requested' || getStateLabel(normalized) === 'Requested';
};

const RequestListBase = ({
  filteredItems,
  metrics,
  isLoading,
  error,
  approveRequestedItem,
  rejectRequestedItem,
  searchTerm,
  setSearchTerm,
  debouncedSearch,
  isFilterOpen,
  setIsFilterOpen,
  filterRef,
  filters: filterState,
  setFilters: setFilterState,
  fetchRequestDetails,
}) => {
  const [cancellingId, setCancellingId] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const user = useAuthStore((s) => s.user);
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const isAdmin = roles.includes('admin');
  const isItil = roles.includes('itil');
  const isBasicEmployee = user?.sys_class_name === 'sys_user' && !isAdmin && !isItil;

  const activeFilterCount = filterState !== 'All' ? 1 : 0;

  console.log(filteredItems);
  

  const handleApprove = async (sysId) => {
    setCancellingId(sysId);
    await approveRequestedItem(sysId);
    setCancellingId(null);
  };

  const handleRequestClick = async (requestRef) => {
    if (!requestRef) return;
    
    let sysId = null;
    if (typeof requestRef === 'object') {
      if (requestRef.value) sysId = requestRef.value;
      else if (requestRef.sys_id) sysId = requestRef.sys_id;
      else if (requestRef.link) {
        const parts = requestRef.link.split('/');
        sysId = parts[parts.length - 1];
      }
    } else {
      sysId = requestRef;
    }

    if (!sysId) return;
    
    // Fetch and show actual request record
    const requestRecord = await fetchRequestDetails(sysId);
    if (requestRecord) {
      setViewRecord(requestRecord);
    }
  };

  const handleReject = async (sysId) => {
    setCancellingId(sysId);
    await rejectRequestedItem(sysId);
    setCancellingId(null);
  };

  const stats = [
    { label: 'Total Requests', value: metrics?.total || 0, icon: ShoppingBag, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    { label: 'Pending Approval', value: metrics?.pending || 0, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { label: 'In Progress', value: metrics?.inProgress || 0, icon: Package, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Closed', value: metrics?.closed || 0, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10' },
  ];

  const requestFields = [
    { label: 'Number', key: 'number' },
    { label: 'State', key: 'state', render: (val) => getStateBadge(val) },
    { label: 'Approval', key: 'approval', render: (val) => getStateBadge(val) },
    { label: 'Created', key: 'sys_created_on', render: (val) => val ? new Date(val).toLocaleString('en-GB') : '—' },
    { label: 'Request', key: 'request', render: (val) => safeValue(val) || '—' },
    { label: 'Quantity', key: 'quantity', render: (val) => val || 1 },
    { label: 'Updated', key: 'sys_updated_on', render: (val) => val ? new Date(val).toLocaleString('en-GB') : '—' },
    { label: 'Item', key: 'cat_item', render: (val) => safeValue(val) || '—' },
    { label: 'Price', key: 'price', render: (val) => (val && val !== '0') ? val : '—' },
  ];

  return (
    <ListViewShell
      title="My Requests"
      subtitle="Track and manage your requested items"
      stats={stats}

      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      searchPlaceholder="Search requests..."
      debouncedSearch={debouncedSearch}

      isFilterOpen={isFilterOpen}
      setIsFilterOpen={setIsFilterOpen}
      filterRef={filterRef}
      filters={filterState}
      setFilters={setFilterState}
      activeFilterCount={activeFilterCount}
      renderFilterPopover={({ filters: currentFilters, setFilters: setCurrentFilters }) => (
        <div className="w-52 overflow-hidden">
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
              <option value="4">Work In Progress</option>
              <option value="7">Closed Complete</option>
              <option value="8">Closed Incomplete</option>
            </select>
          </div>
        </div>
      )}

      filteredItems={filteredItems}
      isLoading={isLoading}
      error={error}
      renderTableHead={() => (
        <thead>
          <tr className="bg-slate-800/50 text-slate-300 text-xs uppercase tracking-wider">
            <th className="px-6 py-4 font-medium">RITM</th>
            <th className="px-6 py-4 font-medium">Request</th>
            <th className="px-6 py-4 font-medium">Item</th>
            <th className="px-6 py-4 font-medium">Qty</th>
            <th className="px-6 py-4 font-medium">Status</th>
            <th className="px-6 py-4 font-medium">Approval</th>
            <th className="px-6 py-4 font-medium">Requested On</th>
            {!isBasicEmployee ? <th className="px-6 py-4 font-medium">Action</th> : null}
          </tr>
        </thead>
      )}
      renderRow={(item) => (
        <tr key={item.sys_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer" >
          <td className="px-6 py-4 text-sm font-medium text-cyan-400 group-hover:text-cyan-300" onClick={() => setViewRecord(item)}>{item.number}</td>
          <td className="px-6 py-4 text-sm font-medium text-cyan-400 group-hover:text-cyan-300" onClick={() => handleRequestClick(item.request)}>
            {safeValue(item.request) || '—'}
          </td>
          <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300 max-w-xs truncate">
            {safeValue(item.cat_item) || '(Empty)'}
          </td>
          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{item.quantity || 1}</td>
          <td className="px-6 py-4">{getStateBadge(item.state)}</td>
          <td className="px-6 py-4">{getStateBadge(item.approval)}</td>
          <td className="px-6 py-4 text-sm text-slate-500">{new Date(item.sys_created_on).toLocaleDateString('en-GB')}</td>
          {!isBasicEmployee ? (
            <td className="px-6 py-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
              {isRequestedState(item.approval) ? (
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

              {isRequestedState(item.approval) ? (
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
          ) : null}
        </tr>
      )}
      renderEmpty={({ debouncedSearch }) => (
        <tr>
          <td colSpan={isBasicEmployee ? 7 : 8} className="px-6 py-12 text-center">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-slate-600 opacity-50" />
            <p className="text-slate-500">{debouncedSearch ? 'No requests match your search.' : "You haven't submitted any requests yet."}</p>
          </td>
        </tr>
      )}
    >
      <RecordDetailsModal
        isOpen={!!viewRecord}
        onClose={() => setViewRecord(null)}
        title="Request Details"
        record={viewRecord}
        fields={requestFields}
      />
    </ListViewShell>
  );
};

export default withListView({
  useStoreHook: useRequestedItemStore,
  select: (state) => ({
    items: state.requestedItems,
    metrics: state.metrics,
    isLoading: state.isLoading,
    error: state.error,
    fetchList: state.fetchRequestedItems,
    approveRequestedItem: state.approveRequestedItem,
    rejectRequestedItem: state.rejectRequestedItem,
    fetchRequestDetails: state.fetchRequestDetails,
  }),
  initialFilters: 'All',
  getActiveFilterCount: (f) => (f !== 'All' ? 1 : 0),
  filterFn: (item, { debouncedSearch, filters }) => {
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      if (
        !(
          (item.number && item.number.toLowerCase().includes(q)) ||
          (safeValue(item.request) && safeValue(item.request).toLowerCase().includes(q)) ||
          (safeValue(item.cat_item) && safeValue(item.cat_item).toLowerCase().includes(q))
        )
      ) {
        return false;
      }
    }
    if (filters !== 'All' && String(item.state) !== String(filters)) return false;
    return true;
  },
  debounceMs: 500,
})(RequestListBase);
