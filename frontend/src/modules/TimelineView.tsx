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
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f1117] border border-[#1e2330] p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CalendarDays size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Project Timeline & Milestones</h2>
            <p className="text-xs text-slate-400">High-level production schedule roadmap across all cinematic phases</p>
          </div>
        </div>

        <button
          onClick={() => onCreateMilestone('Scripting & Writing')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>New Phase Milestone</span>
        </button>
      </div>

      {/* Production Phase Roadmap */}
      <div className="space-y-6">
        {phases.map((phase, pIndex) => {
          const phaseMilestones = state.milestones.filter((m) => m.phase === phase);
          const completedCount = phaseMilestones.filter((m) => m.status === 'completed').length;
          const phasePct =
            phaseMilestones.length > 0
              ? Math.round((completedCount / phaseMilestones.length) * 100)
              : 0;

          return (
            <div key={phase} className="studio-card p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1e2330]">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono font-bold text-xs flex items-center justify-center">
                    0{pIndex + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">{phase}</h3>
                    <p className="text-[11px] text-slate-400">
                      {completedCount} of {phaseMilestones.length} milestones cleared
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 rounded-full bg-[#161922] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        phasePct === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${phasePct}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs font-bold text-amber-400 min-w-[35px] text-right">
                    {phasePct}%
                  </span>
                </div>
              </div>

              {/* Milestones List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {phaseMilestones.map((ms) => {
                  const isDone = ms.status === 'completed';
                  return (
                    <div
                      key={ms.id}
                      onClick={() => toggleMilestone(ms)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isDone
                          ? 'bg-[#0b0d13] border-emerald-500/30'
                          : 'bg-[#0f1117] border-[#1e2330] hover:border-[#2a3144]'
                      }`}
                    >
                      <button
                        className={`mt-0.5 p-1 rounded-full transition-colors ${
                          isDone ? 'text-emerald-400' : 'text-slate-600 hover:text-slate-400'
                        }`}
                      >
                        <CheckCircle2 size={18} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className={`text-xs font-bold ${isDone ? 'text-slate-400 line-through' : 'text-white'}`}>
                            {ms.title}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-500">{ms.target_date}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{ms.description}</p>
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
