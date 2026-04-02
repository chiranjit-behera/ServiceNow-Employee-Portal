import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
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
  const PAGE_SIZE = 5;
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const storageKey = useMemo(() => `lv_page:${location.pathname}`, [location.pathname]);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState('');
  const prevSearchRef = useRef(debouncedSearch);
  const prevFiltersRef = useRef(filters);

  const parsePageParam = (value) => {
    const n = Number.parseInt(String(value || '1'), 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  };

  // Hydrate page from URL first, then sessionStorage.
  useEffect(() => {
    const fromUrl = parsePageParam(searchParams.get('page') || '1');
    if (fromUrl > 1) {
      setPage(fromUrl);
      return;
    }

    const fromSession = parsePageParam(sessionStorage.getItem(storageKey) || '1');
    if (fromSession > 1) {
      setPage(fromSession);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('page', String(fromSession));
      setSearchParams(nextParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const pageCount = useMemo(() => {
    const len = Array.isArray(filteredItems) ? filteredItems.length : 0;
    return Math.max(1, Math.ceil(len / PAGE_SIZE));
  }, [filteredItems]);

  const pagedItems = useMemo(() => {
    if (!Array.isArray(filteredItems) || filteredItems.length === 0) return [];
    const start = (page - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page]);

  // Keep page synced in URL so refresh stays on same page.
  useEffect(() => {
    const current = searchParams.get('page') || '1';
    const next = String(page);
    if (current === next) return;

    const nextParams = new URLSearchParams(searchParams);
    if (page <= 1) nextParams.delete('page');
    else nextParams.set('page', next);
    setSearchParams(nextParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // If user changes URL (back/forward), reflect it in state.
  useEffect(() => {
    const next = parsePageParam(searchParams.get('page') || '1');
    if (next !== page) setPage(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Persist current page to sessionStorage (per route).
  useEffect(() => {
    if (page <= 1) sessionStorage.removeItem(storageKey);
    else sessionStorage.setItem(storageKey, String(page));
  }, [page, storageKey]);

  // When search/filter actually changes, reset to page 1.
  // (Using previous values avoids resetting on refresh / StrictMode double effects.)
  useEffect(() => {
    const didSearchChange = prevSearchRef.current !== debouncedSearch;
    const didFiltersChange = prevFiltersRef.current !== filters;
    prevSearchRef.current = debouncedSearch;
    prevFiltersRef.current = filters;
    if (!didSearchChange && !didFiltersChange) return;
    setPage(1);
    setPageInput('');
  }, [debouncedSearch, filters]);

  // Clamp current page if list shrinks.
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const canPrev = page > 1;
  const canNext = page < pageCount;

  const pageButtons = useMemo(() => {
    if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);

    // Always show: 1, last, and around current page.
    const start = Math.max(2, page - 2);
    const end = Math.min(pageCount - 1, page + 2);
    const items = [1];

    if (start > 2) items.push('...');
    for (let p = start; p <= end; p += 1) items.push(p);
    if (end < pageCount - 1) items.push('...');

    items.push(pageCount);
    return items;
  }, [pageCount, page]);

  const handleGoToPage = () => {
    const raw = String(pageInput).trim();
    if (!raw) return;
    const nextPage = Number.parseInt(raw, 10);
    if (Number.isNaN(nextPage)) return;
    const clamped = Math.min(pageCount, Math.max(1, nextPage));
    setPage(clamped);
    setPageInput(String(clamped));
  };

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
                  pagedItems.map((item) => renderRow(item))
                )}
              </tbody>
            </table>
          )}
        </div>

        {!isLoading && !error && filteredItems.length > 0 && pageCount > 1 ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400 px-1">
              Page <span className="font-medium text-slate-700 dark:text-slate-200">{page}</span> of{' '}
              <span className="font-medium text-slate-700 dark:text-slate-200">{pageCount}</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => canPrev && setPage((p) => Math.max(1, p - 1))}
                disabled={!canPrev}
                className="px-3 py-1.5 rounded-lg border border-slate-300/20 bg-slate-800/20 hover:bg-slate-800/40 disabled:opacity-40 disabled:hover:bg-slate-800/20 transition-colors text-sm"
              >
                Prev
              </button>

              {pageButtons.map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-slate-500 text-sm select-none">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`px-3 py-1.5 rounded-lg border transition-colors text-sm ${
                      p === page
                        ? 'bg-primary border-primary text-white'
                        : 'bg-slate-800/20 border-slate-300/20 hover:bg-slate-800/40 hover:border-slate-300/40 text-slate-600 dark:text-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}

              <button
                type="button"
                onClick={() => canNext && setPage((p) => Math.min(pageCount, p + 1))}
                disabled={!canNext}
                className="px-3 py-1.5 rounded-lg border border-slate-300/20 bg-slate-800/20 hover:bg-slate-800/40 disabled:opacity-40 disabled:hover:bg-slate-800/20 transition-colors text-sm"
              >
                Next
              </button>

              <div className="h-6 border-l border-slate-200/20 mx-3 hidden md:block" />

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">Go to page</span>
                <input
                  type="number"
                  min={1}
                  max={pageCount}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  placeholder="1"
                  className="w-24 px-3 py-1.5 bg-slate-800/20 border border-slate-300/20 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleGoToPage}
                  className="px-4 py-1.5 rounded-lg bg-primary hover:bg-blue-600 text-white text-sm font-medium transition-colors"
                >
                  Go
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {children}
    </div>
  );
}

