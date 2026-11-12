import React, { useState } from 'react';
import { StickyNote, X } from 'lucide-react';

interface NotesWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotesWidget: React.FC<NotesWidgetProps> = ({ isOpen, onClose }) => {
  const [notes, setNotes] = useState(() => {
    return localStorage.getItem('fatgoats_quick_notes') || '• Polish act 1 dialogue transition\n• Check Vector-7 sound FX stems\n• Schedule E2 table read with Sofia';
  });

  const handleNotesChange = (text: string) => {
    setNotes(text);
    localStorage.setItem('fatgoats_quick_notes', text);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 rounded-xl bg-[#101217] border border-white/10 shadow-2xl overflow-hidden flex flex-col">
      <div className="h-10 bg-[#151820] px-3.5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <StickyNote size={14} className="text-amber-400" />
          <span className="text-xs font-medium text-white">Quick scratchpad</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="p-3">
        <textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Jot down quick thoughts, scene ideas, casting reminders..."
          className="w-full h-44 bg-[#0a0b0e] border border-white/5 rounded-lg p-2.5 text-xs text-slate-200 outline-none focus:border-white/20 resize-none font-sans leading-relaxed"
        />
        <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500 font-mono">
          <span>Auto-saved to local workspace</span>
          <span>{notes.length} chars</span>
        </div>
      </div>
    </div>
  );
};
