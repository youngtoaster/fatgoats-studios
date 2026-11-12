import React from 'react';
import { History, X, Shield, Plus, Edit, Trash2 } from 'lucide-react';
import { AuditLog } from '../types';

interface AuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLog[];
}

export const AuditDrawer: React.FC<AuditDrawerProps> = ({ isOpen, onClose, logs }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs" onClick={onClose} />

      {/* Slide-out Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#101217] border-l border-white/10 shadow-2xl flex flex-col justify-between">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-[#151820] text-slate-400 border border-white/5">
              <History size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Studio audit log</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Chronological history of production events</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {logs.map((log) => (
            <div key={log.id} className="p-3 rounded-lg bg-[#0a0b0e] border border-white/5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5">
                  {log.action_type} • {log.entity_type}
                </span>
                <span className="text-[10px] text-slate-500 font-mono tabular-nums">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="text-slate-200 font-medium">{log.entity_title}</p>
              <p className="text-slate-400 text-[11px] leading-relaxed">{log.details}</p>
              <p className="text-[10px] text-slate-500">By: {log.user_name}</p>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-center py-20 text-slate-500 text-xs">No audit logs recorded yet.</p>
          )}
        </div>

        <div className="p-3 border-t border-white/5 text-center text-[11px] text-slate-500 font-mono">
          Real-time audit ledger
        </div>
      </div>
    </>
  );
};
