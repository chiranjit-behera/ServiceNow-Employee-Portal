import React from 'react';
import { Filter, Loader2, Search, XCircle } from 'lucide-react';

const DefaultMetricsCard = ({ stat, isLoading }) => {
  const safeValue = stat?.value ?? 0;
  return (
    <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl p-5 relative overflow-hidden group hover:-translate-y-0.5 transition-transform duration-200">
      <div
        className={`absolute top-0 right-0 w-20 h-20 ${stat.bg || ''} rounded-bl-full translate-x-3 -translate-y-3 opacity-50 group-hover:scale-110 transition-transform duration-500`}
      />
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
      {isLoading ? (
        <div className="h-7 w-12 bg-slate-700 rounded animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{safeValue}</p>
      )}
      <div className={`absolute bottom-3 right-3 ${stat.color || ''}`}>
        {stat.icon ? <stat.icon className="w-5 h-5 opacity-60" /> : null}
      </div>
    </div>
  );
};

export default function ListViewShell({
  title,
  subtitle,
  primaryAction,
  stats,

  searchTerm,
  setSearchTerm,
  searchPlaceholder,
  debouncedSearch,

  isFilterOpen,
  setIsFilterOpen,
  filterRef,
  filters,
  setFilters,
  activeFilterCount,
  renderFilterPopover,

  filteredItems,
  isLoading,
  error,
  renderTableHead,
  renderRow,
  renderEmpty,

  children,
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{title}</h1>
          {subtitle ? <p className="text-slate-600 dark:text-slate-400">{subtitle}</p> : null}
        </div>
        {primaryAction ? (
          <button
            onClick={primaryAction.onClick}
            className={primaryAction.className || 'bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-primary/20'}
          >
            {primaryAction.label}
          </button>
        ) : null}
      </div>

      {stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <DefaultMetricsCard key={i} stat={s} isLoading={isLoading} />
          ))}
        </div>
      ) : null}

      <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder || 'Search...'}
              className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {renderFilterPopover ? (
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`p-2 rounded-lg border transition-colors flex-shrink-0 relative ${
                  isFilterOpen || activeFilterCount > 0
                    ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 ? (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-primary text-[9px] font-bold text-white rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>

              {isFilterOpen ? (
                <div className="absolute right-0 mt-2 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-20">
                  {renderFilterPopover({ filters, setFilters })}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
              <p>Loading...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-400">
              <XCircle className="w-10 h-10 mx-auto mb-3 opacity-60" />
              <p>Failed to load. {error}</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              {renderTableHead()}
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {filteredItems.length === 0 ? (
                  renderEmpty({ searchTerm, debouncedSearch, activeFilterCount })
                ) : (
                  filteredItems.map((item) => renderRow(item))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}

