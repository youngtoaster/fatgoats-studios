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
  WifiOff,
  RefreshCw,
  StickyNote,
  History,
  Menu,
  X,
  ChevronDown,
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
          category: 'Scenes',
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
          category: 'Cast',
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
          category: 'Vault',
        });
      }
    });

    // Search Lore
    state.lore_articles.forEach((l) => {
      if (l.title.toLowerCase().includes(q) || l.summary.toLowerCase().includes(q)) {
        results.push({
          title: l.title,
          subtitle: `${l.category} • ${l.summary.slice(0, 50)}`,
          module: 'lore',
          id: l.id,
          category: 'Lore',
        });
      }
    });

    return results.slice(0, 8);
  }, [searchQuery, state]);

  const navGroups = [
    {
      group: 'Operations',
      items: [
        { id: 'dashboard', label: 'Project Dashboard', icon: LayoutDashboard, badge: `${state.scenes.length}` },
        { id: 'kanban', label: 'Production Kanban', icon: CheckSquare, badge: `${state.kanban_tasks.length}` },
        { id: 'timeline', label: 'Milestones & Timeline', icon: CalendarDays, badge: `${state.milestones.length}` },
      ],
    },
    {
      group: 'Creative & Script',
      items: [
        { id: 'scripts', label: 'Screenplay Editor', icon: FileText, badge: 'Fountain' },
        { id: 'analytics', label: 'Script Analytics', icon: BookOpen },
        { id: 'storyboard', label: 'Storyboard Sequence', icon: Film, badge: `${state.storyboard_frames.length}` },
        { id: 'whiteboard', label: 'Creative Whiteboard', icon: Compass },
        { id: 'lore', label: 'Lore & Bible', icon: BookMarked, badge: `${state.lore_articles.length}` },
      ],
    },
    {
      group: 'Cast & Continuity',
      items: [
        { id: 'characters', label: 'Character Dossiers', icon: Users2, badge: `${state.characters.length}` },
        { id: 'team', label: 'Cast & Crew Directory', icon: UserCheck, badge: `${state.team_members.length}` },
      ],
    },
    {
      group: 'Media & Foley',
      items: [
        { id: 'assets', label: 'Asset Vault', icon: FolderArchive, badge: `${state.assets.length}` },
        { id: 'soundboard', label: 'Audio & Foley Vault', icon: Radio, badge: `${state.soundboard_clips.length}` },
      ],
    },
    {
      group: 'Studio Infrastructure',
      items: [
        { id: 'chat', label: 'Team Communication', icon: MessageSquare },
        { id: 'admin', label: 'Administration & Security', icon: ShieldCheck, badge: currentRole },
      ],
    },
  ];

  const handleManualSyncClick = async () => {
    setSyncing(true);
    await onManualSync();
    setTimeout(() => setSyncing(false), 600);
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
      <header className="sticky top-0 z-40 w-full h-14 bg-[#0a0b0e] border-b border-[rgba(255,255,255,0.07)] px-4 lg:px-6 flex items-center justify-between">
        {/* Left: Mobile hamburger & Studio Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-md hover:bg-[#151820] text-slate-400 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#151820] border border-[rgba(255,255,255,0.10)] flex items-center justify-center text-amber-400 font-mono font-bold text-xs">
              FG
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-100 tracking-tight text-sm">FatGoats</span>
                <span className="text-slate-400 text-xs">Studios</span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">Production OS</p>
            </div>
          </div>

          {/* Project Workspace Pipeline Selector Dropdown */}
          <div className="relative ml-2 sm:ml-4">
            <button
              onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#151820] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] text-xs text-slate-200 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="max-w-[120px] sm:max-w-[180px] truncate">{activeProject.title}</span>
              <ChevronDown size={13} className="text-slate-400" />
            </button>

            {projectDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-[#151820] border border-[rgba(255,255,255,0.12)] rounded-lg shadow-xl p-1 z-50">
                <div className="text-[10px] text-slate-400 px-2 py-1 font-medium">
                  Productions
                </div>
                {allProjects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => {
                      onSelectProject(proj);
                      setProjectDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between transition-colors ${
                      proj.id === activeProject.id
                        ? 'bg-amber-500/10 text-amber-300 font-medium'
                        : 'text-slate-300 hover:bg-[#1e222d]'
                    }`}
                  >
                    <span className="truncate">{proj.title}</span>
                    <span className="text-[10px] text-slate-400 bg-[#0a0b0e] px-1.5 py-0.5 rounded border border-[rgba(255,255,255,0.06)] font-mono">
                      {proj.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center: Global Filter-and-Jump Search */}
        <div className="relative hidden md:block w-72 lg:w-80">
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search project (Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              className="w-full bg-[#151820] border border-[rgba(255,255,255,0.08)] focus:border-amber-500/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 outline-none transition-colors"
            />
          </div>

          {/* Jump Search Results Dropdown */}
          {searchFocused && searchResults.length > 0 && (
            <div className="absolute left-0 top-full mt-1.5 w-full bg-[#151820] border border-[rgba(255,255,255,0.12)] rounded-lg shadow-xl overflow-hidden z-50 p-1">
              {searchResults.map((item) => (
                <button
                  key={`${item.category}_${item.id}`}
                  onMouseDown={() => handleSelectSearchResult(item)}
                  className="w-full text-left p-2 rounded hover:bg-[#1e222d] flex items-start gap-2.5 transition-colors group"
                >
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 whitespace-nowrap mt-0.5">
                    {item.category}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-200 group-hover:text-amber-300 truncate">{item.title}</p>
                    <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Quick actions, Sync status, Role indicator */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Explicit Connection & Sync State Machine Indicator */}
          <div
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#151820] border border-[rgba(255,255,255,0.08)] text-xs text-slate-300 font-medium"
            title={`Machine State: ${connectionState || (isOnline ? 'CONNECTED_IDLE' : 'OFFLINE_BACKLOG')}`}
          >
            {connectionState === 'CONNECTED_IDLE' ? (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            ) : connectionState === 'SYNCING_BATCH' ? (
              <RefreshCw size={11} className="animate-spin text-amber-400" />
            ) : connectionState === 'OFFLINE_BACKLOG' ? (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            ) : (
              <WifiOff size={12} className="text-slate-400" />
            )}
            <span className="hidden sm:inline text-[11px]">
              {connectionState === 'CONNECTED_IDLE'
                ? 'Synced'
                : connectionState === 'SYNCING_BATCH'
                ? 'Syncing...'
                : connectionState === 'OFFLINE_BACKLOG'
                ? `Offline • ${backlogCount} queued`
                : isOnline
                ? 'Online'
                : 'Offline'}
            </span>
            {backlogCount > 0 && connectionState !== 'OFFLINE_BACKLOG' && (
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                {backlogCount}
              </span>
            )}
            <button
              onClick={handleManualSyncClick}
              className={`p-0.5 text-slate-400 hover:text-white transition-colors ${syncing ? 'animate-spin text-amber-400' : ''}`}
              title="Force sync"
            >
              <RefreshCw size={11} />
            </button>
          </div>

          {/* Quick Notes Scratchpad Toggle */}
          <button
            onClick={onToggleNotes}
            className="p-1.5 rounded-lg bg-[#151820] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] text-slate-300 hover:text-white transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Scratchpad notes"
          >
            <StickyNote size={15} />
          </button>

          {/* Activity & Audit Drawer Toggle */}
          <button
            onClick={onToggleAudit}
            className="p-1.5 rounded-lg bg-[#151820] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] text-slate-300 hover:text-white transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Activity audit log"
          >
            <History size={15} />
          </button>

          {/* Role Tier Badge with switcher */}
          <div className="hidden xl:flex items-center gap-1.5 bg-[#151820] border border-[rgba(255,255,255,0.08)] px-2 py-1 rounded-lg text-xs">
            <span className="text-slate-400">Role:</span>
            <select
              value={currentRole}
              onChange={(e) => onChangeRole(e.target.value as RoleTier)}
              className="bg-transparent text-amber-400 font-medium outline-none cursor-pointer"
            >
              <option value="Super Admin" className="bg-[#151820] text-slate-200">Super Admin (CEO)</option>
              <option value="Admin" className="bg-[#151820] text-slate-200">Admin</option>
              <option value="Editor" className="bg-[#151820] text-slate-200">Editor</option>
              <option value="Viewer" className="bg-[#151820] text-slate-200">Viewer</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main Sidebar Navigation Layout */}
      <div className="flex">
        {/* Desktop Collapsible Navigation Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-64 bg-[#0a0b0e] border-r border-[rgba(255,255,255,0.07)] pt-14 flex flex-col justify-between transition-transform duration-200 ease-out lg:translate-x-0 ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Scrollable Nav Item Groups */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
            {navGroups.map((group) => (
              <div key={group.group}>
                <p className="px-3 text-[11px] font-medium text-slate-400 mb-1.5">
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
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                          isActive
                            ? 'bg-[#1a1e28] text-white font-medium border-l-2 border-amber-500 shadow-sm'
                            : 'text-slate-300 hover:bg-[#151820] hover:text-white border-l-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon size={15} className={isActive ? 'text-amber-400' : 'text-slate-400'} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                              isActive ? 'bg-[#222736] text-amber-300' : 'text-slate-400 bg-[#12141c]'
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
          <div className="p-3 border-t border-[rgba(255,255,255,0.07)] bg-[#0c0e12]">
            <div className="flex items-center gap-2.5">
              <img
                src={state.team_members[0]?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'}
                alt="Avatar"
                className="w-7 h-7 rounded-full border border-[rgba(255,255,255,0.12)] object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-200 truncate">{state.team_members[0]?.name || 'Studio Member'}</p>
                <p className="text-[11px] text-slate-400 truncate">{currentRole} • {state.team_members[0]?.studio_title || 'Showrunner'}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          />
        )}
      </div>
    </>
  );
};
