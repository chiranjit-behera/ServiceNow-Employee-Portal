import React, { useEffect } from 'react';
import { X, CheckCircle, Clock } from 'lucide-react';

export default function RecordDetailsModal({ isOpen, onClose, title, record, fields }) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-surface border border-slate-700 bg-slate-800 rounded-xl w-full max-w-2xl shadow-2xl relative overflow-hidden transform transition-all flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 shrink-0">
          <h3 className="text-xl font-semibold text-white">{title || 'Record Details'} - <span className="text-primary">{record.number}</span></h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 text-slate-300 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field, idx) => {
              // Full width fields for description
              const isFullWidth = field.key === 'description' || field.key === 'short_description';
              return (
                <div key={idx} className={`border border-slate-700/50 rounded-lg p-4 bg-slate-800/50 ${isFullWidth ? 'col-span-1 md:col-span-2' : ''}`}>
                  <span className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">{field.label}</span>
                  <div className="text-sm font-medium text-slate-200 break-words whitespace-pre-wrap">
                    {field.render ? field.render(record[field.key], record) : (record[field.key] || '—')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="p-4 border-t border-slate-700 flex justify-end shrink-0 bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
