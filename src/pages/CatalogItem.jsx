import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Heart, ArrowLeft, ShoppingCart } from 'lucide-react';
import { useCatalogStore } from '../store/catalogStore';

const getText = (v) => {
  if (v == null) return '';
  if (typeof v === 'object') return v.display_value ?? v.name ?? v.label ?? v.value ?? '';
  return String(v);
};

const money = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n);
};

export default function CatalogItem() {
  const { sysId } = useParams();
  const navigate = useNavigate();
  const {
    selectedItem,
    selectedIsLoading,
    selectedError,
    fetchCatalogItem,
    orderNow,
    orderIsSubmitting,
    orderError,
    lastOrder,
    clearOrder,
  } = useCatalogStore();

  console.log(JSON.stringify(selectedItem, null, 2));
  

  const [qty, setQty] = useState(1);

  useEffect(() => {
    clearOrder();
    fetchCatalogItem(sysId);
  }, [sysId, fetchCatalogItem, clearOrder]);

  const name = useMemo(() => getText(selectedItem?.name) || 'Catalog item', [selectedItem]);
  const sd = useMemo(() => getText(selectedItem?.short_description) || '', [selectedItem]);
  const desc = useMemo(() => getText(selectedItem?.description) || '', [selectedItem]);
  const price = useMemo(() => money(selectedItem?.price) || getText(selectedItem?.price) || '', [selectedItem]);
  const delivery = useMemo(() => getText(selectedItem?.delivery_time) || '', [selectedItem]);

  const handleOrder = async () => {
    const res = await orderNow({ sysId, quantity: qty, variables: {} });
    if (res.ok) {
      // Give a quick moment for user to see success, then navigate to requests.
      setTimeout(() => navigate('/requests'), 600);
    }
  };

  return (
    <div className="space-y-4">
      {/* <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors text-sm flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div> */}

      {selectedIsLoading ? (
        <div className="flex items-center justify-center p-12 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mr-3 text-primary" />
          <p>Loading item...</p>
        </div>
      ) : selectedError ? (
        <div className="p-8 text-sm text-red-400">{selectedError}</div>
      ) : !selectedItem ? (
        <div className="p-10 text-center text-slate-500">Item not found.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <section className="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {name}
                </h1>
                {sd ? <p className="text-slate-600 dark:text-slate-400 mt-1">{sd}</p> : null}
              </div>
              <button
                type="button"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors text-slate-500"
                aria-label="Favorite"
              >
                <Heart className="w-4 h-4" />
              </button>
            </div>

            {/* {desc ? (
              <div className="mt-6">
                <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{desc}</div>
              </div>
            ) : null} */}
            
          </section>

          <aside className="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm h-fit">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Quantity</div>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
                className="w-24 px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary"
              />
            </div>

            {price ? (
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                Price: <span className="text-slate-900 dark:text-white font-semibold">{price}</span>
              </div>
            ) : null}
            {delivery ? (
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Delivery Time: <span className="text-slate-900 dark:text-white font-semibold">{delivery}</span>
              </div>
            ) : null}

            {orderError ? (
              <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 p-2 rounded-lg mb-3">
                {orderError}
              </div>
            ) : null}

            {lastOrder ? (
              <div className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 p-2 rounded-lg mb-3">
                Order submitted successfully.
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleOrder}
              disabled={orderIsSubmitting}
              className="w-full px-4 py-2.5 rounded-lg bg-primary hover:bg-blue-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {orderIsSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
              {orderIsSubmitting ? 'Ordering...' : 'Order Now'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/requests')}
              className="w-full mt-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors text-sm font-semibold"
            >
              View My Requests
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}

