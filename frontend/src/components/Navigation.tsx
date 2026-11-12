import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Film,
  Compass,
  BookMarked,
  Users2,
  UserCheck,
  FolderArchive,
  Radio,
  MessageSquare,
  ShieldCheck,
  CheckSquare,
  CalendarDays,
  Search,
  Wifi,
  WifiOff,
  RefreshCw,
  StickyNote,
  History,
  Menu,
  X,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { Project, RoleTier, StudioDatabaseState } from '../types';
import { ConnectionState } from '../machines/connectionMachine';

interface NavigationProps {
  activeModule: string;
  setActiveModule: (module: string) => void;
  activeProject: Project;
  allProjects: Project[];
  onSelectProject: (proj: Project) => void;
  state: StudioDatabaseState;
  isOnline: boolean;
  connectionState?: ConnectionState;
  backlogCount: number;
  onManualSync: () => void;
  onToggleNotes: () => void;
  onToggleAudit: () => void;
  currentRole: RoleTier;
  onChangeRole: (role: RoleTier) => void;
  onNavigateToItem?: (module: string, itemId: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeModule,
  setActiveModule,
  activeProject,
  allProjects,
  onSelectProject,
  state,
  isOnline,
  connectionState,
  backlogCount,
  onManualSync,
  onToggleNotes,
  onToggleAudit,
  currentRole,
  onChangeRole,
  onNavigateToItem,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Global Filter-and-Jump results
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const results: Array<{ title: string; subtitle: string; module: string; id: string; category: string }> = [];

    // Search Scenes
    state.scenes.forEach((s) => {
      if (s.slugline.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)) {
        results.push({
          title: s.slugline,
          subtitle: `Scene #${s.scene_number} • ${s.location}`,
          module: 'scripts',
          id: s.id,
          category: 'Scenes & Screenplay',
        });
      }
    });

    // Search Characters
    state.characters.forEach((c) => {
      if (c.name.toLowerCase().includes(q) || c.backstory.toLowerCase().includes(q) || c.role.toLowerCase().includes(q)) {
        results.push({
          title: c.name,
          subtitle: `${c.role} • Cast: ${c.actor_name}`,
          module: 'characters',
          id: c.id,
          category: 'Cast & Characters',
        });
      }
    });

    // Search Assets
    state.assets.forEach((a) => {
      if (a.filename.toLowerCase().includes(q) || a.tags.some((t) => t.toLowerCase().includes(q))) {
        results.push({
          title: a.filename,
          subtitle: `${a.folder_path} • ${a.version}`,
          module: 'assets',
          id: a.id,
          category: 'Vault Assets',
        });
      }
    });

    // Search Lore
    state.lore_articles.forEach((l) => {
      if (l.title.toLowerCase().includes(q) || l.summary.toLowerCase().includes(q)) {
        results.push({
          title: `${l.emoji_icon} ${l.title}`,
          subtitle: `${l.category} • ${l.summary.slice(0, 50)}...`,
          module: 'lore',
          id: l.id,
          category: 'Lore & Bible',
        });
      }
    });

    return results.slice(0, 8);
  }, [searchQuery, state]);

  const navGroups = [
    {
      group: 'OPERATIONS & PLANNING',
      items: [
        { id: 'dashboard', label: 'Project Dashboard', icon: LayoutDashboard, badge: `${state.scenes.length} Scenes` },
        { id: 'kanban', label: 'Tasks & Kanban', icon: CheckSquare, badge: `${state.kanban_tasks.length}` },
        { id: 'timeline', label: 'Timeline & Milestones', icon: CalendarDays, badge: `${state.milestones.length}` },
      ],
    },
    {
      group: 'CREATIVE WRITING & STORY',
      items: [
        { id: 'scripts', label: 'Script Editor (Fountain)', icon: FileText, badge: 'Hollywood' },
        { id: 'analytics', label: 'Script Analytics & Reader', icon: BookOpen, badge: 'Teleprompter' },
        { id: 'storyboard', label: 'Storyboard Builder', icon: Film, badge: `${state.storyboard_frames.length} Shots` },
        { id: 'whiteboard', label: 'Creative Whiteboard', icon: Compass, badge: 'Infinite' },
        { id: 'lore', label: 'Lore & World Bible', icon: BookMarked, badge: `${state.lore_articles.length}` },
      ],
    },
    {
      group: 'CAST & CONTINUITY',
      items: [
        { id: 'characters', label: 'Character Dossiers', icon: Users2, badge: `${state.characters.length} Cast` },
        { id: 'team', label: 'Team & Cast Directory', icon: UserCheck, badge: `${state.team_members.length}` },
      ],
    },
    {
      group: 'MEDIA & AUDIO VAULT',
      items: [
        { id: 'assets', label: 'Asset Vault (DAM)', icon: FolderArchive, badge: `${state.assets.length}` },
        { id: 'soundboard', label: 'Show Soundboard', icon: Radio, badge: 'Live Foley' },
      ],
    },
    {
      group: 'STUDIO INFRASTRUCTURE',
      items: [
        { id: 'chat', label: 'Communication Hub', icon: MessageSquare, badge: 'Live WS' },
        { id: 'admin', label: 'Admin & RBAC Security', icon: ShieldCheck, badge: currentRole },
      ],
    },
  ];

  const handleManualSyncClick = async () => {
    setSyncing(true);
    await onManualSync();
    setTimeout(() => setSyncing(false), 800);
  };

  const handleSelectSearchResult = (result: (typeof searchResults)[0]) => {
    setActiveModule(result.module);
    if (onNavigateToItem) {
      onNavigateToItem(result.module, result.id);
    }
    setSearchQuery('');
    setSearchFocused(false);
  };

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full h-16 bg-[#0f1117] border-b border-[#1e2330] px-4 lg:px-6 flex items-center justify-between">
        {/* Left: Mobile hamburger & Studio Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-md hover:bg-[#1e2330] text-slate-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold tracking-wider text-base">
              FG
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white tracking-tight text-sm lg:text-base">FATGOATS</span>
                <span className="text-amber-500 font-semibold text-xs lg:text-sm">STUDIOS</span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block font-medium">Production OS & Continuity Suite</p>
            </div>
          </div>

          {/* Project Workspace Pipeline Selector Dropdown */}
          <div className="relative ml-2 sm:ml-4">
            <button
              onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[#161922] border border-[#2a3144] hover:border-amber-500/50 text-xs font-medium text-slate-200 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="max-w-[120px] sm:max-w-[180px] truncate">{activeProject.title}</span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {projectDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-[#161922] border border-[#2a3144] rounded-lg shadow-2xl p-1.5 z-50">
                <div className="text-[10px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Active Production Pipelines
                </div>
                {allProjects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => {
                      onSelectProject(proj);
                      setProjectDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded text-xs flex items-center justify-between ${
                      proj.id === activeProject.id ? 'bg-amber-500/10 text-amber-400 font-semibold' : 'text-slate-300 hover:bg-[#202534]'
                    }`}
                  >
                    <span className="truncate">{proj.title}</span>
                    <span className="text-[10px] text-slate-500 bg-[#0f1117] px-1.5 py-0.5 rounded border border-[#2a3144]">
                      {proj.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center: Global Filter-and-Jump Search */}
        <div className="relative hidden md:block w-72 lg:w-96">
          <div className="relative flex items-center">
            <Search size={15} className="absolute left-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Jump to scene, character, asset, lore... (Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              className="w-full bg-[#161922] border border-[#2a3144] focus:border-amber-500/70 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>

          {/* Jump Search Results Dropdown */}
          {searchFocused && searchResults.length > 0 && (
            <div className="absolute left-0 top-full mt-1.5 w-full bg-[#161922] border border-[#2a3144] rounded-lg shadow-2xl overflow-hidden z-50">
              <div className="p-1.5">
                {searchResults.map((item) => (
                  <button
                    key={`${item.category}_${item.id}`}
                    onMouseDown={() => handleSelectSearchResult(item)}
                    className="w-full text-left p-2 rounded hover:bg-[#202534] flex items-start gap-2.5 transition-colors group"
                  >
                    <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 whitespace-nowrap mt-0.5">
                      {item.category.split(' ')[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-200 group-hover:text-amber-300 truncate">{item.title}</p>
                      <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Quick actions, Sync status, Role indicator */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Explicit Connection & Sync State Machine Indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border font-medium ${
              connectionState === 'CONNECTED_IDLE'
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400'
                : connectionState === 'SYNCING_BATCH'
                ? 'bg-sky-950/30 border-sky-500/30 text-sky-400'
                : connectionState === 'OFFLINE_BACKLOG'
                ? 'bg-amber-950/30 border-amber-500/30 text-amber-400'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
            title={`Machine State: ${connectionState || (isOnline ? 'CONNECTED_IDLE' : 'OFFLINE_BACKLOG')}`}
          >
            {connectionState === 'CONNECTED_IDLE' ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm" />
            ) : connectionState === 'SYNCING_BATCH' ? (
              <RefreshCw size={12} className="animate-spin text-sky-400" />
            ) : (
              <WifiOff size={13} className="text-amber-400" />
            )}
            <span className="hidden sm:inline">
              {connectionState === 'CONNECTED_IDLE'
                ? 'Rust DB Synced'
                : connectionState === 'SYNCING_BATCH'
                ? 'Syncing Backlog...'
                : connectionState === 'OFFLINE_BACKLOG'
                ? `Offline (${backlogCount})`
                : isOnline
                ? 'Online'
                : 'Offline'}
            </span>
            {backlogCount > 0 && connectionState !== 'OFFLINE_BACKLOG' && (
              <span className="bg-amber-500 text-black font-bold text-[10px] px-1.5 rounded-full ml-1">
                {backlogCount}
              </span>
            )}
            <button
              onClick={handleManualSyncClick}
              className={`p-1 hover:text-white transition-transform ${syncing ? 'animate-spin text-amber-400' : ''}`}
              title="Force Sync / Flush Machine Queue"
            >
              <RefreshCw size={12} />
            </button>
          </div>

          {/* Quick Notes Scratchpad Toggle */}
          <button
            onClick={onToggleNotes}
            className="p-2 rounded-lg bg-[#161922] border border-[#2a3144] hover:border-amber-500/50 text-slate-300 hover:text-amber-400 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Quick Production Scratchpad"
          >
            <StickyNote size={16} />
          </button>

          {/* Activity & Audit Drawer Toggle */}
          <button
            onClick={onToggleAudit}
            className="p-2 rounded-lg bg-[#161922] border border-[#2a3144] hover:border-amber-500/50 text-slate-300 hover:text-amber-400 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Production Audit Log"
          >
            <History size={16} />
          </button>

          {/* Role Tier Badge with switcher */}
          <div className="hidden xl:flex items-center gap-1.5 bg-[#161922] border border-[#2a3144] px-2 py-1 rounded-md text-[11px]">
            <span className="text-slate-400 font-medium">Role:</span>
            <select
              value={currentRole}
              onChange={(e) => onChangeRole(e.target.value as RoleTier)}
              className="bg-transparent text-amber-400 font-semibold outline-none cursor-pointer"
            >
              <option value="Super Admin" className="bg-[#161922] text-slate-200">Super Admin (CEO)</option>
              <option value="Admin" className="bg-[#161922] text-slate-200">Admin</option>
              <option value="Editor" className="bg-[#161922] text-slate-200">Editor</option>
              <option value="Viewer" className="bg-[#161922] text-slate-200">Viewer</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main Sidebar Navigation Layout */}
      <div className="flex">
        {/* Desktop Collapsible Navigation Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-64 bg-[#0f1117] border-r border-[#1e2330] pt-16 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Scrollable Nav Item Groups */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
            {navGroups.map((group) => (
              <div key={group.group}>
                <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  {group.group}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeModule === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveModule(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-amber-500 text-black font-semibold shadow-sm'
                            : 'text-slate-300 hover:bg-[#161922] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon size={16} className={isActive ? 'text-black' : 'text-slate-400'} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                              isActive ? 'bg-black/20 text-black font-bold' : 'bg-[#1a1f2c] text-slate-400 border border-[#2a3144]'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* User profile footer */}
          <div className="p-3 border-t border-[#1e2330] bg-[#0b0d13]">
            <div className="flex items-center gap-2.5">
              <img
                src={state.team_members[0]?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'}
                alt="Avatar"
                className="w-8 h-8 rounded-full border border-amber-500/40 object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-200 truncate">{state.team_members[0]?.name || 'Studio Member'}</p>
                <p className="text-[10px] text-amber-500 truncate font-medium">{currentRole} • {state.team_members[0]?.studio_title || 'Showrunner'}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 z-20 lg:hidden backdrop-blur-sm"
          />
        )}
      </div>
    </>
  );
};
