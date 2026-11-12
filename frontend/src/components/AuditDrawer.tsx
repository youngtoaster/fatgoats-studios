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
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0f1117] border-l border-[#1e2330] shadow-2xl flex flex-col justify-between">
        <div className="p-4 border-b border-[#1e2330] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400">
              <History size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Studio Audit & Activity Drawer</h3>
              <p className="text-[10px] text-slate-400">Chronological history of production events</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="p-3 rounded-lg bg-[#0b0d13] border border-[#1e2330] space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {log.action_type} • {log.entity_type}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="text-slate-200 font-semibold">{log.entity_title}</p>
              <p className="text-slate-400 text-[11px] leading-relaxed">{log.details}</p>
              <p className="text-[10px] text-slate-500">Initiated by: {log.user_name}</p>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-center py-20 text-slate-500 text-xs">No audit logs recorded yet.</p>
          )}
        </div>

        <div className="p-3 border-t border-[#1e2330] text-center text-[11px] text-slate-500">
          Showing real-time audit ledger
        </div>
      </div>
    </>
  );
};
