import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Key,
  Download,
  Upload,
  Users,
  Settings,
  HardDrive,
  Copy,
  Check,
  Plus,
  RefreshCw,
  FileArchive,
  Cpu,
  Bot,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Code2,
} from 'lucide-react';
import { InviteCode, RoleTier, StudioDatabaseState } from '../types';
import { ApiService } from '../services/api';
import { useExplicitMachine } from '../machines/useExplicitMachine';
import {
  createArchivePortabilityMachine,
  ArchivePortabilityState,
  ArchivePortabilityEvent,
  ArchivePortabilityContext,
} from '../machines/archivePortabilityMachine';
import { StudioMachineRegistry } from '../machines';

interface AdminPanelProps {
  state: StudioDatabaseState;
  onUpdateState: (newState: StudioDatabaseState) => void;
  currentRole: RoleTier;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  state,
  onUpdateState,
  currentRole,
}) => {
  const [activeTab, setActiveTab] = useState<'rbac' | 'invites' | 'backup' | 'settings' | 'machines'>('rbac');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Invite Generator State
  const [inviteRole, setInviteRole] = useState<RoleTier>('Editor');
  const [inviteMaxUses, setInviteMaxUses] = useState(5);
  const [inviteExpiresDays, setInviteExpiresDays] = useState(30);

  // Machine Inspection state for AX/DX tab
  const [registeredMachines, setRegisteredMachines] = useState<any[]>([]);
  const [backendMachinesJson, setBackendMachinesJson] = useState<string | null>(null);

  // Archive Portability Explicit State Machine
  const [archiveSnapshot, sendArchive] = useExplicitMachine<
    ArchivePortabilityState,
    ArchivePortabilityEvent,
    ArchivePortabilityContext
  >(() => createArchivePortabilityMachine(), []);

  // Poll machine registry on tab view
  useEffect(() => {
    if (activeTab === 'machines') {
      setRegisteredMachines(StudioMachineRegistry.inspectAll());
      fetch('/api/machines')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setBackendMachinesJson(JSON.stringify(data, null, 2));
        })
        .catch(() => {});
    }
  }, [activeTab]);

  // RBAC Permission Tiers Matrix
  const rbacTiers = [
    {
      role: 'CEO / Super Admin',
      badge: 'Unrestricted master',
      desc: 'Full unrestricted control over all workspace pipelines, user accounts, system settings, database migrations, and archive exports.',
      permissions: [
        'Manage Workspace Pipelines',
        'Export & Restore Databases',
        'Modify System Settings',
        'Issue Cryptographic Invites',
        'Full Script & Lore Read/Write',
        'Emergency Embargo Override',
      ],
      color: 'border-white/10 text-amber-400 bg-white/5',
    },
    {
      role: 'Admin',
      badge: 'Production lead',
      desc: 'Management over active projects, casting dossiers, invites, and team scheduling. Cannot modify core system storage roots.',
      permissions: [
        'Manage Projects',
        'Issue Invites',
        'Manage Cast & Team',
        'Edit Scripts & Boards',
        'Publish Soundboard Drops',
      ],
      color: 'border-white/10 text-slate-300 bg-white/5',
    },
    {
      role: 'Editor',
      badge: 'Creative staff',
      desc: 'Standard creative department seat with write and edit access to screenplays, whiteboards, storyboards, and chat.',
      permissions: [
        'Draft Screenplays (Fountain)',
        'Edit Whiteboards & Storyboards',
        'Post Chat & Audio Drops',
        'Manage Kanban Tasks',
      ],
      color: 'border-white/10 text-slate-300 bg-white/5',
    },
    {
      role: 'Viewer',
      badge: 'Client / screener',
      desc: 'Read-only access for executive producers, table-read screeners, and distribution partners.',
      permissions: [
        'Read Screenplays (Unsealed)',
        'View Storyboards & Dailies',
        'View Lore Bible',
        'Audit Activity Logs',
      ],
      color: 'border-white/10 text-slate-400 bg-white/5',
    },
  ];

  // Generate cryptographic invite code
  const handleGenerateInvite = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let randomPart = '';
    for (let i = 0; i < 8; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `FG-${inviteRole.toUpperCase()}-${randomPart}`;
    const expiresAt = new Date(Date.now() + inviteExpiresDays * 24 * 3600 * 1000).toISOString();

    const newInvite: InviteCode = {
      id: `inv_${Date.now()}`,
      code,
      role_tier: inviteRole,
      created_by: state.team_members[0]?.id || 'user_tyler',
      max_uses: inviteMaxUses,
      times_used: 0,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    };

    const updated = {
      ...state,
      invite_codes: [newInvite, ...state.invite_codes],
    };
    onUpdateState(updated);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Full Workspace ZIP Export via State Machine
  const handleExportZip = async () => {
    try {
      sendArchive({ type: 'START_EXPORT' });
      const zipBlob = await ApiService.exportProjectZip(state);
      const filename = `FatGoats_Studio_Backup_${new Date().toISOString().split('T')[0]}.zip`;
      const url = URL.createObjectURL(zipBlob);
      sendArchive({ type: 'PACKAGE_COMPLETE', downloadUrl: url, filename });

      // Trigger user download
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      sendArchive({ type: 'FAIL', error: e?.message || 'Export error' });
    }
  };

  // Full Workspace ZIP Import / Restore via State Machine
  const handleImportZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      sendArchive({ type: 'START_IMPORT', file });
      sendArchive({ type: 'SCHEMA_VALID' });
      const restored = await ApiService.importProjectZip(file);
      onUpdateState(restored);
      sendArchive({ type: 'RESTORE_COMPLETE' });
    } catch (err: any) {
      sendArchive({ type: 'FAIL', error: err?.message || 'Import failed' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#101217] border border-white/5 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#151820] text-slate-400 border border-white/5">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">System administration & security</h2>
            <p className="text-xs text-slate-400 mt-0.5">Role-based access control, cryptographic invites, archive portability, and agent state machines</p>
          </div>
        </div>

        {/* Admin Tabs */}
        <div className="flex bg-[#151820] p-1 rounded-lg border border-white/5 text-xs font-medium overflow-x-auto">
          <button
            onClick={() => setActiveTab('rbac')}
            className={`px-3 py-1 rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'rbac' ? 'bg-[#1a1e28] text-white shadow-sm border border-white/5' : 'text-slate-400 hover:text-white'
            }`}
          >
            RBAC matrix
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`px-3 py-1 rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'invites' ? 'bg-[#1a1e28] text-white shadow-sm border border-white/5' : 'text-slate-400 hover:text-white'
            }`}
          >
            Invites ({state.invite_codes.length})
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-3 py-1 rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'backup' ? 'bg-[#1a1e28] text-white shadow-sm border border-white/5' : 'text-slate-400 hover:text-white'
            }`}
          >
            Backup (.ZIP)
          </button>
          <button
            onClick={() => setActiveTab('machines')}
            className={`px-3 py-1 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'machines' ? 'bg-[#1a1e28] text-white shadow-sm border border-white/5' : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            <Bot size={13} />
            <span>State machines (AX/DX)</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1 rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'settings' ? 'bg-[#1a1e28] text-white shadow-sm border border-white/5' : 'text-slate-400 hover:text-white'
            }`}
          >
            Studio config
          </button>
        </div>
      </div>

      {/* Tab 1: RBAC Permission Tiers */}
      {activeTab === 'rbac' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Role-based access control matrix governing access to scripts, embargoed spoilers, casting dossiers, and administrative storage:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rbacTiers.map((tier) => (
              <div
                key={tier.role}
                className="bg-[#101217] border border-white/5 rounded-xl p-4 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-white">{tier.role}</h3>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${tier.color}`}>
                      {tier.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-4">{tier.desc}</p>

                  <div className="space-y-1.5">
                    <p className="text-[10px] font-medium text-slate-400">Granted privileges:</p>
                    {tier.permissions.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-200">
                        <Check size={13} className="text-emerald-400 shrink-0" />
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Current session tier:</span>
                  <span className={`font-medium ${currentRole === tier.role.split(' ')[0] ? 'text-amber-400' : 'text-slate-500'}`}>
                    {currentRole === tier.role.split(' ')[0] ? 'Active now' : 'Passive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Invite Code Generator */}
      {activeTab === 'invites' && (
        <div className="space-y-4">
          <div className="bg-[#101217] border border-white/5 rounded-xl p-4 space-y-3.5">
            <h3 className="text-xs font-semibold text-white">Generate cryptographic invite</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-400">Assigned role tier:</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as RoleTier)}
                  className="w-full bg-[#151820] border border-white/10 rounded-lg p-2 text-xs text-white outline-none mt-1 focus:border-white/20"
                >
                  <option value="Admin">Admin</option>
                  <option value="Editor">Editor</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400">Usage limit (seats):</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={inviteMaxUses}
                  onChange={(e) => setInviteMaxUses(Number(e.target.value))}
                  className="w-full bg-[#151820] border border-white/10 rounded-lg p-2 text-xs text-white outline-none mt-1 focus:border-white/20"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400">Expiration (days):</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={inviteExpiresDays}
                  onChange={(e) => setInviteExpiresDays(Number(e.target.value))}
                  className="w-full bg-[#151820] border border-white/10 rounded-lg p-2 text-xs text-white outline-none mt-1 focus:border-white/20"
                />
              </div>
            </div>

            <button
              onClick={handleGenerateInvite}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-medium text-xs transition-colors"
            >
              <Key size={14} />
              <span>Generate invite token</span>
            </button>
          </div>

          <div className="bg-[#101217] border border-white/5 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-medium text-slate-300">Active invite tokens</h4>
            <div className="space-y-2">
              {state.invite_codes.map((inv) => (
                <div
                  key={inv.id}
                  className="p-3 rounded-lg bg-[#0a0b0e] border border-white/5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Key size={15} className="text-amber-400 shrink-0" />
                    <div>
                      <p className="font-mono text-xs font-medium text-white">{inv.code}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Tier: <span className="text-amber-400">{inv.role_tier}</span> • Used {inv.times_used} of {inv.max_uses} • Expires: {new Date(inv.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard(inv.code)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#151820] hover:bg-[#1a1e28] border border-white/10 text-[11px] text-slate-300 transition-colors"
                  >
                    {copiedCode === inv.code ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedCode === inv.code ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Full Workspace ZIP Backup & Restore (FSM Powered) */}
      {activeTab === 'backup' && (
        <div className="space-y-4">
          {/* FSM Status Indicator Banner */}
          <div className="p-3 rounded-xl bg-[#101217] border border-white/5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-slate-400" />
              <span className="text-slate-400">Archive lifecycle:</span>
              <span className="font-mono font-medium text-amber-400 px-2 py-0.5 rounded bg-white/5 border border-white/5">
                {archiveSnapshot.state}
              </span>
            </div>
            {archiveSnapshot.state !== 'IDLE' && (
              <button
                onClick={() => sendArchive({ type: 'RESET' })}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Export Package */}
            <div className="bg-[#101217] border border-white/5 rounded-xl p-4 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Download size={16} className="text-amber-400" />
                  <h3 className="text-sm font-semibold text-white">Full workspace export (.ZIP)</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Downloads a self-contained portable package with relational tables, Fountain screenplays, character dossiers, whiteboard graphs, and production assets.
                </p>
              </div>

              {archiveSnapshot.state === 'PACKAGING_ZIP' ? (
                <div className="w-full py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono flex items-center justify-center gap-2">
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Packaging workspace archive...</span>
                </div>
              ) : (
                <button
                  onClick={handleExportZip}
                  className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-medium text-xs flex items-center justify-center gap-2 transition-colors mt-3"
                >
                  <FileArchive size={14} />
                  <span>Download .ZIP backup</span>
                </button>
              )}
            </div>

            {/* Import Package */}
            <div className="bg-[#101217] border border-white/5 rounded-xl p-4 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Upload size={16} className="text-slate-400" />
                  <h3 className="text-sm font-semibold text-white">Restore workspace from .ZIP</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Upload an existing FatGoats .zip backup to validate the schema and atomically restore the production state into SQLite.
                </p>
              </div>

              {archiveSnapshot.state === 'VALIDATING_SCHEMA' || archiveSnapshot.state === 'RESTORING_TABLES' ? (
                <div className="w-full py-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-200 text-xs font-mono flex items-center justify-center gap-2">
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Database restore in progress...</span>
                </div>
              ) : archiveSnapshot.state === 'RESTORE_SUCCESS' ? (
                <div className="w-full py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium flex items-center justify-center gap-2">
                  <CheckCircle2 size={14} />
                  <span>Workspace restored successfully</span>
                </div>
              ) : (
                <label className="w-full py-2.5 rounded-lg bg-[#151820] hover:bg-[#1a1e28] border border-white/10 text-slate-200 font-medium text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors mt-3">
                  <Upload size={14} className="text-slate-400" />
                  <span>Select .ZIP file to restore</span>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleImportZip}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: State Machines (AX / DX Inspection Matrix) */}
      {activeTab === 'machines' && (
        <div className="space-y-4">
          <div className="bg-[#101217] border border-white/5 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot size={18} className="text-amber-400" />
                <h3 className="text-sm font-semibold text-white">
                  State machine registry (AX & DX)
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5">
                Active registry
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Every critical lifecycle in FatGoats Studios is governed by an explicit Finite State Machine with strictly guarded transitions.
              Autonomous AI agents and automation scripts can query <code className="text-amber-400 font-mono">GET /api/machines</code> or inspect the client registry via <code className="text-amber-400 font-mono">window.__FATGOATS_MACHINES__</code> without fragile DOM scraping.
            </p>
          </div>

          {/* Live Machine Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {registeredMachines.map((m) => {
              const machineId = m.machineId || m.id;
              const machineName = m.machineName || m.name;
              const states = m.states || [];
              const transitions = (m.availableTransitions || []).map((t: any) =>
                typeof t === 'string' ? t : t.event
              );

              return (
                <div key={machineId} className="bg-[#101217] border border-white/5 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-white font-mono">{machineName}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">ID: {machineId}</p>
                    </div>
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      {m.currentState}
                    </span>
                  </div>

                  {/* State Nodes */}
                  <div>
                    <p className="text-[10px] font-mono text-slate-400 mb-1">State nodes:</p>
                    <div className="flex flex-wrap gap-1">
                      {states.map((st: string) => (
                        <span
                          key={st}
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                            st === m.currentState
                              ? 'bg-amber-500 text-black font-medium'
                              : 'bg-white/5 text-slate-400 border border-white/5'
                          }`}
                        >
                          {st}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Available Transitions */}
                  <div>
                    <p className="text-[10px] font-mono text-slate-400 mb-1">Allowed transitions:</p>
                    <div className="flex flex-wrap gap-1">
                      {transitions.length === 0 ? (
                        <span className="text-[10px] text-slate-500 italic">Terminal or event-locked</span>
                      ) : (
                        transitions.map((t: string) => (
                          <span
                            key={t}
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10"
                          >
                            {t}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Backend Agent Schema Reference */}
          <div className="bg-[#101217] border border-white/5 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 size={15} className="text-slate-400" />
                <h4 className="text-xs font-mono font-medium text-white">Backend Agent Machine Schema (GET /api/machines)</h4>
              </div>
              <button
                onClick={() => backendMachinesJson && copyToClipboard(backendMachinesJson)}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <Copy size={12} />
                <span>{copiedCode === backendMachinesJson ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>
            <pre className="p-3 bg-[#0a0b0e] border border-white/5 rounded-lg text-[10px] font-mono text-slate-300 max-h-56 overflow-y-auto leading-relaxed">
              {backendMachinesJson || '// Fetching live /api/machines from Rust backend...'}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 5: Studio Configuration */}
      {activeTab === 'settings' && (
        <div className="bg-[#101217] border border-white/5 rounded-xl p-5 space-y-4 max-w-xl">
          <h3 className="text-sm font-semibold text-white">Studio infrastructure settings</h3>
          <div className="space-y-3 text-xs">
            <div>
              <label className="text-[11px] text-slate-400">Studio name:</label>
              <input
                type="text"
                value={state.system_settings.studio_name}
                onChange={(e) =>
                  onUpdateState({
                    ...state,
                    system_settings: { ...state.system_settings, studio_name: e.target.value },
                  })
                }
                className="w-full bg-[#151820] border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none mt-1 focus:border-white/20"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400">Vault local storage directory:</label>
              <input
                type="text"
                value={state.system_settings.storage_path}
                readOnly
                className="w-full bg-[#0a0b0e] border border-white/5 rounded-lg p-2.5 text-xs text-slate-400 font-mono mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400">Automated backup frequency:</label>
              <select
                value={state.system_settings.backup_frequency}
                onChange={(e) =>
                  onUpdateState({
                    ...state,
                    system_settings: { ...state.system_settings, backup_frequency: e.target.value },
                  })
                }
                className="w-full bg-[#151820] border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none mt-1 focus:border-white/20"
              >
                <option value="Every 1 Hour">Every 1 Hour</option>
                <option value="Every 6 Hours">Every 6 Hours</option>
                <option value="Daily">Daily</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
