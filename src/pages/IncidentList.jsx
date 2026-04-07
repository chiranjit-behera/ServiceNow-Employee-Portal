import React, { useState } from 'react';
import { useTicketStore } from '../store/ticketStore';
import withListView from '../hoc/withListView';
import ListViewShell from '../components/ListViewShell';
import RecordDetailsModal from '../components/RecordDetailsModal';
import { X, Activity, AlertCircle, Clock, BarChart3 } from 'lucide-react';
import serviceNowClient from '../api/serviceNowClient';

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

const IncidentListBase = ({
  items: incidents,
  filteredItems: filteredIncidents,
  metrics,
  isLoading,
  error,
  createIncident,
  user,
  searchTerm,
  setSearchTerm,
  isFilterOpen,
  setIsFilterOpen,
  filterRef,
  filters,
  setFilters,
  activeFilterCount,
}) => {
  const safeMetrics = metrics || { active: 0, critical: 0, resolved: 0, canceled: 0 };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);
  const [newIncData, setNewIncData] = useState({ short_description: '', urgency: '3', impact:'3', description: '', caller_id: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [usersList, setUsersList] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [callerSearchTerm, setCallerSearchTerm] = useState('');
  const [debouncedCallerSearch, setDebouncedCallerSearch] = useState('');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const callerDropdownRef = React.useRef(null);
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const isAdmin = roles.includes('admin') || user?.username === 'admin';
  const isItil = roles.includes('itil');
  const canSelectCaller = isAdmin || isItil;

  // Debounce search effect
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCallerSearch(callerSearchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [callerSearchTerm]);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (callerDropdownRef.current && !callerDropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (isModalOpen && canSelectCaller && isUserDropdownOpen) {
      const fetchUsers = async () => {
         setIsLoadingUsers(true);
         try {
           const query = debouncedCallerSearch 
             ? `active=true^nameLIKE${debouncedCallerSearch}` 
             : 'active=true';
           const res = await serviceNowClient.get(`/table/sys_user?sysparm_query=${query}&sysparm_fields=sys_id,name&sysparm_limit=20`);
           setUsersList(res.data.result || []);
         } catch (e) {
           console.error('Failed to fetch users', e);
         } finally {
           setIsLoadingUsers(false);
         }
      };
      fetchUsers();
    }
  }, [isModalOpen, canSelectCaller, isUserDropdownOpen, debouncedCallerSearch]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      ...newIncData,
    };
    
    if (!canSelectCaller) {
      payload.caller_id = user?.sys_id;
    } else if (!payload.caller_id) {
      payload.caller_id = user?.sys_id; // Default fallback to caller if not selected
    }
    const success = await createIncident(payload);
    setIsSubmitting(false);
    if(success) {
      setIsModalOpen(false);
      setNewIncData({ short_description: '', impact: '3', urgency: '3', description: '' });
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

  const incidentFields = [
    { label: 'Number', key: 'number' },
    { label: 'State', key: 'state', render: (val) => getStateLabel(val) },
    { label: 'Priority', key: 'priority', render: (val) => getPriorityBadge(val) },
    { label: 'Created', key: 'sys_created_on', render: (val) => val ? new Date(val).toLocaleString('en-GB') : '—' },
    { label: 'Caller', key: 'caller_id', render: (val) => (val && typeof val === 'object') ? val.display_value : (val || '—') },
    { label: 'Updated', key: 'sys_updated_on', render: (val) => val ? new Date(val).toLocaleString('en-GB') : '—' },
    { label: 'Short Description', key: 'short_description' },
    { label: 'Description', key: 'description' },
  ];

  return (
    <ListViewShell
      title="Incidents"
      subtitle="Manage and resolve active incidents"
      primaryAction={{
        label: 'New Incident',
        onClick: () => setIsModalOpen(true),
        className:
          'bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-primary/20',
      }}
      stats={stats}

      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      searchPlaceholder="Search by number or short description..."

      isFilterOpen={isFilterOpen}
      setIsFilterOpen={setIsFilterOpen}
      filterRef={filterRef}
      filters={filters}
      setFilters={setFilters}
      activeFilterCount={activeFilterCount}
      renderFilterPopover={({ filters: currentFilters, setFilters: setCurrentFilters }) => (
        <div className="w-64 overflow-hidden">
          <div className="p-3 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/80 flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Refine Results</span>
            {activeFilterCount > 0 ? (
              <button
                onClick={() => setCurrentFilters({ priority: 'All', state: 'All' })}
                className="text-[11px] font-bold uppercase tracking-wider text-primary hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Clear All
              </button>
            ) : null}
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Priority</label>
              <select
                value={currentFilters.priority}
                onChange={(e) => setCurrentFilters((f) => ({ ...f, priority: e.target.value }))}
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
                value={currentFilters.state}
                onChange={(e) => setCurrentFilters((f) => ({ ...f, state: e.target.value }))}
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

      filteredItems={filteredIncidents}
      isLoading={isLoading}
      error={error}
      renderTableHead={() => (
        <thead>
          <tr className="bg-slate-800/50 text-slate-300 text-xs uppercase tracking-wider">
            <th className="px-6 py-4 font-medium">Number</th>
            <th className="px-6 py-4 font-medium">Short Description</th>
            <th className="px-6 py-4 font-medium">Priority</th>
            <th className="px-6 py-4 font-medium">State</th>
            <th className="px-6 py-4 font-medium">Created</th>
          </tr>
        </thead>
      )}
      renderRow={(inc) => (
        <tr
          key={inc.sys_id}
          className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer"

        >
          <td className="px-6 py-4 text-sm font-medium text-primary group-hover:text-blue-400" onClick={() => setViewRecord(inc)}>{inc.number}</td>
          <td className="px-6 py-4 text-sm text-slate-300 max-w-md truncate">
            {inc.short_description || '(Empty)'}
          </td>
          <td className="px-6 py-4">{getPriorityBadge(inc.priority)}</td>
          <td className="px-6 py-4 text-sm text-slate-400 dark:text-slate-400">{getStateLabel(inc.state)}</td>
          <td className="px-6 py-4 text-sm text-slate-500">{new Date(inc.sys_created_on).toLocaleDateString('en-GB')}</td>
        </tr>
      )}
      renderEmpty={({ searchTerm }) => (
        <tr>
          <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
            {searchTerm ? 'No incidents match your search.' : 'No incidents found.'}
          </td>
        </tr>
      )}
    >
      <RecordDetailsModal
        isOpen={!!viewRecord}
        onClose={() => setViewRecord(null)}
        title="Incident Details"
        record={viewRecord}
        fields={incidentFields}
      />

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl relative overflow-hidden transform transition-all">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
              <h3 className="text-xl font-semibold text-white">Create New Incident</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-5">
              {canSelectCaller ? (
                <div ref={callerDropdownRef} className="relative">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Caller</label>
                  <input
                    type="text"
                    value={callerSearchTerm}
                    onChange={(e) => {
                      setCallerSearchTerm(e.target.value);
                      setIsUserDropdownOpen(true);
                      if(newIncData.caller_id) setNewIncData({ ...newIncData, caller_id: '' });
                    }}
                    onFocus={() => setIsUserDropdownOpen(true)}
                    placeholder="Search caller..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  />
                  {isUserDropdownOpen ? (
                    <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {isLoadingUsers ? (
                         <div className="px-4 py-3 text-sm text-slate-400">Loading users...</div>
                      ) : usersList.length > 0 ? (
                        <ul>
                          {usersList.map((u) => (
                            <li
                              key={u.sys_id}
                              onMouseDown={(e) => {
                                e.preventDefault(); // prevents blur event on input
                                setNewIncData({ ...newIncData, caller_id: u.sys_id });
                                setCallerSearchTerm(u.name);
                                setIsUserDropdownOpen(false);
                              }}
                              className="px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 cursor-pointer transition-colors"
                            >
                              {u.name}
                            </li>
                          ))}
                        </ul>
                      ) : (
                         <div className="px-4 py-3 text-sm text-slate-400">No users found</div>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Short Description</label>
                <input
                  type="text"
                  required
                  value={newIncData.short_description}
                  onChange={(e) =>
                    setNewIncData({ ...newIncData, short_description: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  placeholder="E.g., Unable to access VPN"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  rows={4}
                  required
                  value={newIncData.description}
                  onChange={(e) =>
                    setNewIncData({ ...newIncData, description: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none transition-colors"
                  placeholder="Provide detailed information..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Urgency</label>
                <select
                  value={newIncData.urgency}
                  onChange={(e) => setNewIncData({ ...newIncData, urgency: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                >
                  <option value="1">1 - High</option>
                  <option value="2">2 - Moderate</option>
                  <option value="3">3 - Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Impact</label>
                <select
                  value={newIncData.impact}
                  onChange={(e) => setNewIncData({ ...newIncData, impact: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                >
                  <option value="1">1 - High</option>
                  <option value="2">2 - Moderate</option>
                  <option value="3">3 - Low</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent hover:border-slate-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-lg bg-primary hover:bg-blue-600 focus:ring-4 focus:ring-primary/30 text-white font-medium transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </ListViewShell>
  );
};

export default withListView({
  useStoreHook: useTicketStore,
  select: (state) => ({
    items: state.incidents,
    metrics: state.metrics,
    isLoading: state.isLoading,
    error: state.error,
    fetchList: state.fetchIncidents,
    createIncident: state.createIncident,
  }),
  initialFilters: { priority: 'All', state: 'All' },
  getActiveFilterCount: (f) =>
    (f.priority !== 'All' ? 1 : 0) + (f.state !== 'All' ? 1 : 0),
  filterFn: (inc, { debouncedSearch, filters }) => {
    // 1. Text Search
    if (debouncedSearch) {
      const lowerSearch = debouncedSearch.toLowerCase();
      const matchesSearch =
        (inc.number && inc.number.toLowerCase().includes(lowerSearch)) ||
        (inc.short_description && inc.short_description.toLowerCase().includes(lowerSearch));
      if (!matchesSearch) return false;
    }

    // 2. Priority Filter
    if (filters.priority !== 'All' && String(inc.priority) !== String(filters.priority)) {
      return false;
    }

    // 3. State Filter
    if (filters.state !== 'All' && String(inc.state) !== String(filters.state)) {
      return false;
    }

    return true;
  },
  debounceMs: 800,
})(IncidentListBase);
