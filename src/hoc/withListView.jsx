import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '../store/authStore';

/**
 * Generic HOC for list pages.
 * - Fetches list data once `user` is available.
 * - Provides debounced search state.
 * - Provides filter-popover open/close with outside click handling.
 * - Computes `filteredItems` using `filterFn`.
 */
const withListView =
  ({
    useStoreHook,
    select,
    initialFilters,
    getActiveFilterCount,
    filterFn,
    debounceMs = 500,
    fetchOnUser = true,
  }) =>
  (WrappedComponent) => {
    return function WithListView(props) {
      const user = useAuthStore(state => state.user);

      const storeSlice = useStoreHook(useShallow(select));
      const {
        items,
        metrics,
        isLoading,
        error,
        fetchList,
        ...restFromStore
      } = storeSlice;

      const [searchTerm, setSearchTerm] = useState('');
      const [debouncedSearch, setDebouncedSearch] = useState('');

      const [isFilterOpen, setIsFilterOpen] = useState(false);
      const [filters, setFilters] = useState(initialFilters);
      const filterRef = useRef(null);

      useEffect(() => {
        const timer = setTimeout(() => {
          setDebouncedSearch(searchTerm);
        }, debounceMs);
        return () => clearTimeout(timer);
      }, [searchTerm, debounceMs]);

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
        if (!fetchOnUser) return;
        if (!user || !fetchList) return;
        fetchList(user);
      }, [fetchOnUser, fetchList, user]);

      const filteredItems = useMemo(() => {
        const list = Array.isArray(items) ? items : [];
        return list.filter((item) => filterFn(item, { debouncedSearch, filters }));
      }, [items, debouncedSearch, filters]);

      const activeFilterCount = getActiveFilterCount ? getActiveFilterCount(filters) : 0;

      return (
        <WrappedComponent
          {...props}
          {...restFromStore}
          user={user}
          items={items}
          filteredItems={filteredItems}
          metrics={metrics}
          isLoading={isLoading}
          error={error}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          debouncedSearch={debouncedSearch}
          hasSearch={Boolean(debouncedSearch && debouncedSearch.trim())}
          isFilterOpen={isFilterOpen}
          setIsFilterOpen={setIsFilterOpen}
          filterRef={filterRef}
          filters={filters}
          setFilters={setFilters}
          activeFilterCount={activeFilterCount}
        />
      );
    };
  };

export default withListView;

