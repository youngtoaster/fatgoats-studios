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
  AlertCircle,
  Database,
  Calendar,
  Sparkles,
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
    { label: 'Total Episodes', value: projectEpisodes.length, sub: 'In pipeline', icon: Film, color: 'text-amber-400' },
    { label: 'Scenes Written', value: projectScenes.length, sub: 'Fountain formatted', icon: FileText, color: 'text-emerald-400' },
    { label: 'Active Cast & Crew', value: projectCharacters.length, sub: 'Dossiers linked', icon: Users2, color: 'text-sky-400' },
    { label: 'Open Production Tasks', value: openTasks.length, sub: `${projectTasks.length - openTasks.length} approved`, icon: CheckSquare, color: 'text-purple-400' },
    { label: 'Vault Assets', value: projectAssets.length, sub: 'Art, audio & models', icon: FolderArchive, color: 'text-rose-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Mission Control Header */}
      <div className="relative rounded-xl border border-[#1e2330] bg-gradient-to-r from-[#12151e] via-[#0f1117] to-[#141822] p-6 overflow-hidden shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Active Production Workspace
              </span>
              <span className="text-xs text-slate-400">• Release: {project.target_release}</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">{project.title}</h1>
            <p className="text-xs lg:text-sm text-slate-300 max-w-2xl mt-1 leading-relaxed">{project.description}</p>
          </div>

          {/* Quick-Access Action Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate('scripts')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs transition-colors shadow-sm"
            >
              <Plus size={15} />
              <span>Write Scene</span>
            </button>
            <button
              onClick={() => onNavigate('characters')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1a1f2c] hover:bg-[#232a3b] border border-[#2a3144] text-slate-200 text-xs font-medium transition-colors"
            >
              <Users2 size={15} className="text-sky-400" />
              <span>New Cast Dossier</span>
            </button>
            <button
              onClick={() => onNavigate('whiteboard')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1a1f2c] hover:bg-[#232a3b] border border-[#2a3144] text-slate-200 text-xs font-medium transition-colors"
            >
              <Sparkles size={15} className="text-amber-400" />
              <span>Whiteboard Beats</span>
            </button>
            <button
              onClick={() => onNavigate('chat')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1a1f2c] hover:bg-[#232a3b] border border-[#2a3144] text-slate-200 text-xs font-medium transition-colors"
            >
              <Play size={14} className="text-emerald-400" />
              <span>Room Chat</span>
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
              className="studio-card p-4 flex flex-col justify-between hover:border-[#2e374d] transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-400">{kpi.label}</span>
                <Icon size={16} className={kpi.color} />
              </div>
              <div>
                <p className="text-2xl font-black text-white">{kpi.value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{kpi.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid: Embargo Time-Lock Countdown & Episode Completion Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Time-Lock Countdown Tracker */}
        <div className="studio-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Spoiler & Embargo Time-Lock Tracker</h3>
                <p className="text-[11px] text-slate-400">Confidential script scenes sealed under future timestamps</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161922] text-amber-400 border border-[#2a3144]">
              {lockedScenes.length} Active Embargo{lockedScenes.length === 1 ? '' : 's'}
            </span>
          </div>

          {lockedScenes.length === 0 ? (
            <div className="p-6 rounded-lg bg-[#0b0d13] border border-[#1a1f2c] text-center">
              <Unlock size={24} className="mx-auto text-emerald-400 mb-2 opacity-80" />
              <p className="text-xs font-semibold text-slate-300">All screenplay scenes currently unlocked</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Writers can set confidential embargo dates inside the Script Editor.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lockedScenes.map((scene) => (
                <div
                  key={scene.id}
                  className="p-3.5 rounded-lg bg-[#0b0d13] border border-amber-500/30 flex items-center justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded bg-amber-500/10 text-amber-400 mt-0.5">
                      <Lock size={15} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{scene.slugline}</p>
                      <p className="text-[11px] text-slate-400">Scene #{scene.scene_number} • {scene.location}</p>
                      <p className="text-[10px] text-amber-400/90 mt-1 font-mono">
                        Embargo unlocks on: {new Date(scene.locked_until!).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-base font-bold text-amber-400 tracking-wider">
                      {formatCountdown(scene.locked_until!)}
                    </div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400">Time Left</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Season & Episode Status Bars */}
        <div className="studio-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <TrendingUp size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Season & Episode Progress</h3>
                <p className="text-[11px] text-slate-400">Visual completion meters for season arc production</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('scripts')}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
            >
              <span>View Scripts</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="space-y-3.5">
            {projectEpisodes.map((ep) => (
              <div key={ep.id} className="p-3 rounded-lg bg-[#0b0d13] border border-[#1e2330]">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#161922] text-slate-300 font-bold border border-[#2a3144]">
                      E{ep.episode_number}
                    </span>
                    <span className="text-xs font-semibold text-slate-200">{ep.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#161922] text-amber-400 border border-[#2a3144]">
                      {ep.status}
                    </span>
                    <span className="text-xs font-mono font-bold text-white">{ep.progress_pct}%</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-[#161922] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      ep.progress_pct === 100
                        ? 'bg-emerald-500'
                        : ep.progress_pct > 50
                        ? 'bg-amber-500'
                        : 'bg-sky-500'
                    }`}
                    style={{ width: `${ep.progress_pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 line-clamp-1">{ep.synopsis}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Connection Status & Recent Studio Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Storage & Sync Status Indicator Card */}
        <div className="studio-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Database size={16} className="text-emerald-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Persistence Engine</h4>
          </div>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded bg-[#0b0d13] border border-[#1e2330]">
              <span className="text-slate-400">Backend Engine</span>
              <span className="font-semibold text-white">Rust (Axum + Tokio)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded bg-[#0b0d13] border border-[#1e2330]">
              <span className="text-slate-400">Database Driver</span>
              <span className="font-semibold text-white">SQLite3 (Relational)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded bg-[#0b0d13] border border-[#1e2330]">
              <span className="text-slate-400">Network Sync</span>
              <span className={`font-semibold ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isOnline ? 'Active Realtime' : 'Offline Backlog Queue'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded bg-[#0b0d13] border border-[#1e2330]">
              <span className="text-slate-400">Pending Backlog Items</span>
              <span className="font-mono font-bold text-amber-400">{backlogCount} mutations</span>
            </div>
          </div>
        </div>

        {/* Recent Studio Audit Stream */}
        <div className="lg:col-span-2 studio-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Chronological Activity Stream</h4>
            <span className="text-[10px] text-slate-400 font-mono">Real-time production audit</span>
          </div>

          <div className="space-y-2">
            {state.audit_logs.slice(0, 4).map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-lg bg-[#0b0d13] border border-[#1e2330] flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {log.action_type}
                  </span>
                  <div>
                    <span className="text-slate-200 font-semibold">{log.user_name}</span>
                    <span className="text-slate-400 ml-1.5">{log.details}</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 whitespace-nowrap ml-3">
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
