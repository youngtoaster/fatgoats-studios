import React, { useState, useEffect } from 'react';
import {
  Film,
  FileText,
  Users2,
  CheckSquare,
  FolderArchive,
  Clock,
  Lock,
  Unlock,
  Play,
  Plus,
  ArrowRight,
  TrendingUp,
  Database,
  Calendar,
} from 'lucide-react';
import { Project, StudioDatabaseState } from '../types';

interface ProjectDashboardProps {
  project: Project;
  state: StudioDatabaseState;
  onNavigate: (module: string) => void;
  isOnline: boolean;
  backlogCount: number;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  project,
  state,
  onNavigate,
  isOnline,
  backlogCount,
}) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute metrics
  const projectEpisodes = state.episodes.filter((e) => e.project_id === project.id);
  const projectScenes = state.scenes.filter((s) => s.project_id === project.id);
  const projectTasks = state.kanban_tasks.filter((t) => t.project_id === project.id);
  const openTasks = projectTasks.filter((t) => t.column_id !== 'approved');
  const projectAssets = state.assets.filter((a) => a.project_id === project.id);
  const projectCharacters = state.characters.filter((c) => c.project_id === project.id);

  // Time-locked embargoed scenes
  const lockedScenes = projectScenes.filter(
    (s) => s.locked_until && new Date(s.locked_until).getTime() > now
  );

  // Format countdown string
  const formatCountdown = (targetIso: string) => {
    const diff = Math.max(0, new Date(targetIso).getTime() - now);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const kpis = [
    { label: 'Episodes', value: projectEpisodes.length, sub: 'In pipeline', icon: Film },
    { label: 'Scenes written', value: projectScenes.length, sub: 'Fountain format', icon: FileText },
    { label: 'Cast & characters', value: projectCharacters.length, sub: 'Dossiers active', icon: Users2 },
    { label: 'Open tasks', value: openTasks.length, sub: `${projectTasks.length - openTasks.length} approved`, icon: CheckSquare },
    { label: 'Vault assets', value: projectAssets.length, sub: 'Art, audio, models', icon: FolderArchive },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Project Overview */}
      <div className="studio-card p-6 border border-[rgba(255,255,255,0.07)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20">
                Active production
              </span>
              <span className="text-xs text-slate-400">• Release: {project.target_release}</span>
            </div>
            <h1 className="text-xl lg:text-2xl font-medium text-white tracking-tight">{project.title}</h1>
            <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">{project.description}</p>
          </div>

          {/* Quick-Access Action Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate('scripts')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-medium text-xs transition-colors"
            >
              <Plus size={14} />
              <span>Write scene</span>
            </button>
            <button
              onClick={() => onNavigate('characters')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151820] hover:bg-[#1e222d] border border-[rgba(255,255,255,0.08)] text-slate-200 text-xs font-medium transition-colors"
            >
              <Users2 size={14} className="text-slate-400" />
              <span>Cast dossier</span>
            </button>
            <button
              onClick={() => onNavigate('whiteboard')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151820] hover:bg-[#1e222d] border border-[rgba(255,255,255,0.08)] text-slate-200 text-xs font-medium transition-colors"
            >
              <Film size={14} className="text-slate-400" />
              <span>Whiteboard</span>
            </button>
            <button
              onClick={() => onNavigate('chat')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151820] hover:bg-[#1e222d] border border-[rgba(255,255,255,0.08)] text-slate-200 text-xs font-medium transition-colors"
            >
              <Play size={13} className="text-slate-400" />
              <span>Room chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Production Metrics & KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="studio-card p-4 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">{kpi.label}</span>
                <Icon size={15} className="text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-medium tabular-nums text-white">{kpi.value}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{kpi.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid: Embargo Countdown & Episode Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Time-Lock Countdown Tracker */}
        <div className="studio-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-[#151820] text-slate-400 border border-[rgba(255,255,255,0.07)]">
                <Clock size={15} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">Scene embargo tracker</h3>
                <p className="text-[11px] text-slate-400">Confidential script scenes sealed under future timestamps</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#151820] text-amber-400 border border-[rgba(255,255,255,0.08)]">
              {lockedScenes.length} locked
            </span>
          </div>

          {lockedScenes.length === 0 ? (
            <div className="p-6 rounded-lg bg-[#0a0b0e] border border-[rgba(255,255,255,0.06)] text-center">
              <Unlock size={20} className="mx-auto text-slate-400 mb-2" />
              <p className="text-xs font-medium text-slate-300">All screenplay scenes unlocked</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Writers can set confidential embargo dates inside the Script Editor.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {lockedScenes.map((scene) => (
                <div
                  key={scene.id}
                  className="p-3 rounded-lg bg-[#0a0b0e] border border-[rgba(255,255,255,0.08)] flex items-center justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded bg-[#151820] text-amber-400 mt-0.5">
                      <Lock size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white font-mono">{scene.slugline}</p>
                      <p className="text-[11px] text-slate-400">Scene #{scene.scene_number} • {scene.location}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        Unlocks: {new Date(scene.locked_until!).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-medium text-amber-400 tabular-nums">
                      {formatCountdown(scene.locked_until!)}
                    </div>
                    <span className="text-[10px] text-slate-400">Time left</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Season & Episode Progress */}
        <div className="studio-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-[#151820] text-slate-400 border border-[rgba(255,255,255,0.07)]">
                <TrendingUp size={15} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">Episode progress</h3>
                <p className="text-[11px] text-slate-400">Completion tracking across active season episodes</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('scripts')}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
            >
              <span>View scripts</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="space-y-3">
            {projectEpisodes.map((ep) => (
              <div key={ep.id} className="p-3 rounded-lg bg-[#0a0b0e] border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#151820] text-slate-300 font-medium">
                      E{ep.episode_number}
                    </span>
                    <span className="text-xs font-medium text-slate-200">{ep.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono text-slate-400 bg-[#151820]">
                      {ep.status}
                    </span>
                    <span className="text-xs font-mono tabular-nums text-white">{ep.progress_pct}%</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 rounded bg-[#151820] overflow-hidden">
                  <div
                    className="h-full rounded bg-amber-500 transition-all duration-300"
                    style={{ width: `${ep.progress_pct}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-1">{ep.synopsis}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Connection Status & Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Persistence Engine */}
        <div className="studio-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Database size={15} className="text-slate-400" />
            <h4 className="text-xs font-medium text-white">Persistence engine</h4>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-[#0a0b0e] border border-[rgba(255,255,255,0.06)]">
              <span className="text-slate-400">Backend engine</span>
              <span className="font-medium text-white">Rust (Axum + Tokio)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-[#0a0b0e] border border-[rgba(255,255,255,0.06)]">
              <span className="text-slate-400">Database driver</span>
              <span className="font-medium text-white">SQLite3 relational</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-[#0a0b0e] border border-[rgba(255,255,255,0.06)]">
              <span className="text-slate-400">Network sync</span>
              <span className={`font-medium ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isOnline ? 'Realtime' : 'Offline backlog'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-[#0a0b0e] border border-[rgba(255,255,255,0.06)]">
              <span className="text-slate-400">Pending mutations</span>
              <span className="font-mono font-medium text-amber-400 tabular-nums">{backlogCount}</span>
            </div>
          </div>
        </div>

        {/* Activity Stream */}
        <div className="lg:col-span-2 studio-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-medium text-white">Activity stream</h4>
            <span className="text-[11px] text-slate-400 font-mono">Recent audit</span>
          </div>

          <div className="space-y-2">
            {state.audit_logs.slice(0, 4).map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-lg bg-[#0a0b0e] border border-[rgba(255,255,255,0.06)] flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded text-slate-400 bg-[#151820]">
                    {log.action_type}
                  </span>
                  <div>
                    <span className="text-slate-200 font-medium">{log.user_name}</span>
                    <span className="text-slate-400 ml-1.5">{log.details}</span>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 tabular-nums whitespace-nowrap ml-3">
                  {new Date(log.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
