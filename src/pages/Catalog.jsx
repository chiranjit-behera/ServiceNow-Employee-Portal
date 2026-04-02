import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, List as ListIcon, Search, Loader2 } from 'lucide-react';
import { useCatalogStore } from '../store/catalogStore';

const getText = (v) => {
  if (v == null) return '';
  if (typeof v === 'object') {
    return v.display_value ?? v.name ?? v.label ?? v.value ?? '';
  }
  return String(v);
};

const money = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n);
};

export default function Catalog() {
  const navigate = useNavigate();
  const { items, isLoading, error, fetchCatalogItems } = useCatalogStore();

  const [view, setView] = useState('grid'); // grid | list
  const [sortBy, setSortBy] = useState('popular');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCatalogItems({ limit: 50 });
  }, [fetchCatalogItems]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = Array.isArray(items) ? items : [];
    if (q) {
      list = list.filter((it) => {
        const name = (getText(it.name) || '').toLowerCase();
        const sd = (getText(it.short_description) || '').toLowerCase();
        return name.includes(q) || sd.includes(q);
      });
    }
    if (sortBy === 'az') {
      list = [...list].sort((a, b) => getText(a.name).localeCompare(getText(b.name)));
    }
    return list;
  }, [items, search, sortBy]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Catalog</h1>
          <p className="text-slate-600 dark:text-slate-400">Browse items and place requests.</p>
        </div>
      </div>

      <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
        <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-3 justify-between border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search catalog..."
                className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setView('grid')}
                className={`p-2 rounded-lg border transition-colors ${
                  view === 'grid'
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                className={`p-2 rounded-lg border transition-colors ${
                  view === 'list'
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
                aria-label="List view"
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sort by</div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="popular">Popular</option>
              <option value="az">A - Z</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mb-0 mr-3 text-primary" />
            <p>Loading catalog...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-sm text-red-400">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No items found.</div>
        ) : (
          <div className={view === 'grid' ? 'p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'p-2'}>
            {filtered.map((it) => {
              const id = it.sys_id || it.sysId || it.id;
              const name = getText(it.name) || 'Catalog item';
              const sd = getText(it.short_description) || '';
              const price = money(it.price) || (getText(it.price) ? String(it.price) : null);
              return view === 'grid' ? (
                <button
                  type="button"
                  key={id}
                  onClick={() => navigate(`/catalog/${id}`)}
                  className="text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors p-4"
                >
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Request</div>
                  <div className="font-semibold text-slate-900 dark:text-white">{name}</div>
                  {sd ? <div className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{sd}</div> : null}
                  {price ? <div className="text-sm text-slate-700 dark:text-slate-300 mt-3">{price}</div> : null}
                </button>
              ) : (
                <button
                  type="button"
                  key={id}
                  onClick={() => navigate(`/catalog/${id}`)}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900/40 transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{name}</div>
                    {sd ? <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1">{sd}</div> : null}
                  </div>
                  {price ? <div className="text-sm text-slate-700 dark:text-slate-300">{price}</div> : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

