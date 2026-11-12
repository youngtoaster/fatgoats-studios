import React from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Milestone, StudioDatabaseState } from '../types';

interface TimelineViewProps {
  state: StudioDatabaseState;
  onSaveMilestone: (ms: Milestone) => void;
  onCreateMilestone: (phase: Milestone['phase']) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  state,
  onSaveMilestone,
  onCreateMilestone,
}) => {
  const phases: Array<Milestone['phase']> = [
    'Scripting & Writing',
    'Casting & Table Reads',
    'Production & Principle Photography',
    'Post-Production & Scoring',
    'Distribution & Release',
  ];

  const toggleMilestone = (ms: Milestone) => {
    const isDone = ms.status === 'completed';
    onSaveMilestone({
      ...ms,
      status: isDone ? 'in_progress' : 'completed',
      progress_pct: isDone ? 50 : 100,
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#101217] border border-white/5 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#151820] text-slate-400 border border-white/5">
            <CalendarDays size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">Project timeline</h2>
            <p className="text-xs text-slate-400 mt-0.5">High-level production schedule roadmap across all cinematic phases</p>
          </div>
        </div>

        <button
          onClick={() => onCreateMilestone('Scripting & Writing')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-medium text-xs self-start sm:self-auto transition-colors"
        >
          <Plus size={14} />
          <span>New milestone</span>
        </button>
      </div>

      {/* Production Phase Roadmap */}
      <div className="space-y-4">
        {phases.map((phase, pIndex) => {
          const phaseMilestones = state.milestones.filter((m) => m.phase === phase);
          const completedCount = phaseMilestones.filter((m) => m.status === 'completed').length;
          const phasePct =
            phaseMilestones.length > 0
              ? Math.round((completedCount / phaseMilestones.length) * 100)
              : 0;

          return (
            <div key={phase} className="bg-[#101217] border border-white/5 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-md bg-white/5 border border-white/5 text-slate-300 font-mono text-xs flex items-center justify-center tabular-nums">
                    0{pIndex + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-tight">{phase}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {completedCount} of {phaseMilestones.length} milestones cleared
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-32 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        phasePct === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${phasePct}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs text-slate-400 min-w-[35px] text-right tabular-nums">
                    {phasePct}%
                  </span>
                </div>
              </div>

              {/* Milestones List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {phaseMilestones.map((ms) => {
                  const isDone = ms.status === 'completed';
                  return (
                    <div
                      key={ms.id}
                      onClick={() => toggleMilestone(ms)}
                      className={`p-3 rounded-lg border transition-colors cursor-pointer flex items-start gap-2.5 ${
                        isDone
                          ? 'bg-[#0a0b0e] border-white/5'
                          : 'bg-[#151820] border-white/5 hover:border-white/15'
                      }`}
                    >
                      <button
                        className={`mt-0.5 p-0.5 rounded transition-colors ${
                          isDone ? 'text-emerald-400' : 'text-slate-600 hover:text-slate-400'
                        }`}
                      >
                        <CheckCircle2 size={16} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className={`text-xs font-medium ${isDone ? 'text-slate-400 line-through' : 'text-white'}`}>
                            {ms.title}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-500 tabular-nums">{ms.target_date}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{ms.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
