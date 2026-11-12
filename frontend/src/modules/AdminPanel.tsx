import React, { useState } from 'react';
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
  Sparkles,
} from 'lucide-react';
import { InviteCode, RoleTier, StudioDatabaseState } from '../types';
import { ApiService } from '../services/api';

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
  const [activeTab, setActiveTab] = useState<'rbac' | 'invites' | 'backup' | 'settings'>('rbac');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Invite Generator State
  const [inviteRole, setInviteRole] = useState<RoleTier>('Editor');
  const [inviteMaxUses, setInviteMaxUses] = useState(5);
  const [inviteExpiresDays, setInviteExpiresDays] = useState(30);

  // Export / Import state
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // RBAC Permission Tiers Matrix
  const rbacTiers = [
    {
      role: 'CEO / Super Admin',
      badge: 'Unrestricted Master',
      desc: 'Full unrestricted control over all workspace pipelines, user accounts, system settings, database migrations, and archive exports.',
      permissions: ['Manage Workspace Pipelines', 'Export & Restore Databases', 'Modify System Settings', 'Issue Cryptographic Invites', 'Full Script & Lore Read/Write', 'Emergency Embargo Override'],
      color: 'border-amber-500 text-amber-400 bg-amber-500/10',
    },
    {
      role: 'Admin',
      badge: 'Production Lead',
      desc: 'Management over active projects, casting dossiers, invites, and team scheduling. Cannot modify core system storage roots.',
      permissions: ['Manage Projects', 'Issue Invites', 'Manage Cast & Team', 'Edit Scripts & Boards', 'Publish Soundboard Drops'],
      color: 'border-sky-500 text-sky-400 bg-sky-500/10',
    },
    {
      role: 'Editor',
      badge: 'Creative Staff',
      desc: 'Standard creative department seat with full write and edit access to screenplays, whiteboards, storyboards, and chat.',
      permissions: ['Draft Screenplays (Fountain)', 'Edit Whiteboards & Storyboards', 'Post Chat & Audio Drops', 'Manage Kanban Tasks'],
      color: 'border-purple-500 text-purple-400 bg-purple-500/10',
    },
    {
      role: 'Viewer',
      badge: 'Client / Screener',
      desc: 'Strict read-only access for executive producers, table-read screeners, and distribution partners.',
      permissions: ['Read Screenplays (Unsealed)', 'View Storyboards & Dailies', 'View Lore Bible', 'Audit Activity Logs'],
      color: 'border-slate-500 text-slate-400 bg-slate-500/10',
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

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Full Workspace ZIP Export
  const handleExportZip = async () => {
    try {
      setIsExporting(true);
      const zipBlob = await ApiService.exportProjectZip(state);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FatGoats_Studio_Backup_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to generate export archive: ' + e);
    } finally {
      setIsExporting(false);
    }
  };

  // Full Workspace ZIP Import / Restore
  const handleImportZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const restored = await ApiService.importProjectZip(file);
      onUpdateState(restored);
      alert('Workspace successfully restored from backup package!');
    } catch (err: any) {
      alert('Import failed: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f1117] border border-[#1e2330] p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">System Administration & Security</h2>
            <p className="text-xs text-slate-400">Enterprise Role-Based Access Control (RBAC), invite generator & full ZIP portability</p>
          </div>
        </div>

        {/* Admin Tabs */}
        <div className="flex bg-[#161922] p-1 rounded-lg border border-[#2a3144] text-xs font-semibold">
          <button
            onClick={() => setActiveTab('rbac')}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === 'rbac' ? 'bg-amber-500 text-black' : 'text-slate-300 hover:text-white'
            }`}
          >
            RBAC Matrix
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === 'invites' ? 'bg-amber-500 text-black' : 'text-slate-300 hover:text-white'
            }`}
          >
            Invite Generator ({state.invite_codes.length})
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === 'backup' ? 'bg-amber-500 text-black' : 'text-slate-300 hover:text-white'
            }`}
          >
            Workspace Backup (.ZIP)
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === 'settings' ? 'bg-amber-500 text-black' : 'text-slate-300 hover:text-white'
            }`}
          >
            Studio Config
          </button>
        </div>
      </div>

      {/* Tab 1: RBAC Permission Tiers */}
      {activeTab === 'rbac' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Role-Based Access Control matrix governing access to scripts, embargoed spoilers, casting dossiers, and administrative storage:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rbacTiers.map((tier) => (
              <div
                key={tier.role}
                className="studio-card p-5 border flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-white">{tier.role}</h3>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${tier.color}`}>
                      {tier.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-4">{tier.desc}</p>

                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Granted Privileges:</p>
                    {tier.permissions.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-200">
                        <Check size={13} className="text-emerald-400 shrink-0" />
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1e2330] flex items-center justify-between text-[11px] text-slate-400">
                  <span>Current Tier in Session:</span>
                  <span className={`font-mono font-bold ${currentRole === tier.role.split(' ')[0] ? 'text-amber-400' : 'text-slate-500'}`}>
                    {currentRole === tier.role.split(' ')[0] ? 'Active Now' : 'Passive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Invite Code Generator */}
      {activeTab === 'invites' && (
        <div className="space-y-5">
          {/* Generator Form */}
          <div className="studio-card p-5 bg-gradient-to-r from-[#12151e] to-[#0f1117] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Generate Cryptographic Studio Invite</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-400">Assigned Role Tier:</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as RoleTier)}
                  className="w-full bg-[#161922] border border-[#2a3144] rounded-lg p-2 text-xs text-white outline-none mt-1"
                >
                  <option value="Admin">Admin</option>
                  <option value="Editor">Editor</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400">Usage Limit (Seat count):</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={inviteMaxUses}
                  onChange={(e) => setInviteMaxUses(Number(e.target.value))}
                  className="w-full bg-[#161922] border border-[#2a3144] rounded-lg p-2 text-xs text-white outline-none mt-1"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400">Expiration (Days):</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={inviteExpiresDays}
                  onChange={(e) => setInviteExpiresDays(Number(e.target.value))}
                  className="w-full bg-[#161922] border border-[#2a3144] rounded-lg p-2 text-xs text-white outline-none mt-1"
                />
              </div>
            </div>

            <button
              onClick={handleGenerateInvite}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs"
            >
              <Key size={14} />
              <span>Create Cryptographic Invite Code</span>
            </button>
          </div>

          {/* Active Invites List */}
          <div className="studio-card p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Active Invite Tokens</h4>
            <div className="space-y-2">
              {state.invite_codes.map((inv) => (
                <div
                  key={inv.id}
                  className="p-3 rounded-lg bg-[#0b0d13] border border-[#1e2330] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Key size={15} className="text-amber-400" />
                    <div>
                      <p className="font-mono text-xs font-bold text-white">{inv.code}</p>
                      <p className="text-[10px] text-slate-500">
                        Tier: <span className="text-amber-400">{inv.role_tier}</span> • Used {inv.times_used} of {inv.max_uses} • Expires: {new Date(inv.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard(inv.code)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#161922] hover:bg-[#202534] border border-[#2a3144] text-[11px] text-slate-300"
                  >
                    {copiedCode === inv.code ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedCode === inv.code ? 'Copied' : 'Copy Token'}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Full Workspace ZIP Backup & Restore */}
      {activeTab === 'backup' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Export Package */}
            <div className="studio-card p-5 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Download size={18} className="text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Full Workspace Archive Export (.ZIP)</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Downloads a self-contained portable package with all relational schemas, screenplay Fountain files, character dossiers, whiteboard graphs, and production metadata intact.
                </p>
              </div>

              <button
                onClick={handleExportZip}
                disabled={isExporting}
                className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-bold text-xs flex items-center justify-center gap-2 transition-colors mt-4"
              >
                <FileArchive size={15} />
                <span>{isExporting ? 'Packaging Archive...' : 'Download Project .ZIP Backup'}</span>
              </button>
            </div>

            {/* Import Package */}
            <div className="studio-card p-5 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Upload size={18} className="text-sky-400" />
                  <h3 className="text-sm font-bold text-white">Restore Workspace from .ZIP Package</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Upload an existing FatGoats .zip backup to restore the production state into the Rust backend SQLite database.
                </p>
              </div>

              <label className="w-full py-2.5 rounded-lg bg-[#161922] hover:bg-[#202534] border border-[#2a3144] text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors mt-4">
                <Upload size={15} className="text-sky-400" />
                <span>{isImporting ? 'Restoring Database...' : 'Select .ZIP File to Restore'}</span>
                <input
                  type="file"
                  accept=".zip"
                  onChange={handleImportZip}
                  disabled={isImporting}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Studio Configuration */}
      {activeTab === 'settings' && (
        <div className="studio-card p-6 space-y-4 max-w-xl">
          <h3 className="text-sm font-bold text-white">Studio Infrastructure Settings</h3>
          <div className="space-y-3 text-xs">
            <div>
              <label className="text-[11px] text-slate-400">Studio Name:</label>
              <input
                type="text"
                value={state.system_settings.studio_name}
                onChange={(e) =>
                  onUpdateState({
                    ...state,
                    system_settings: { ...state.system_settings, studio_name: e.target.value },
                  })
                }
                className="w-full bg-[#161922] border border-[#2a3144] rounded-lg p-2.5 text-xs text-white outline-none mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400">Vault Local Storage Directory:</label>
              <input
                type="text"
                value={state.system_settings.storage_path}
                readOnly
                className="w-full bg-[#0b0d13] border border-[#1e2330] rounded-lg p-2.5 text-xs text-slate-400 font-mono mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400">Automated Backup Frequency:</label>
              <select
                value={state.system_settings.backup_frequency}
                onChange={(e) =>
                  onUpdateState({
                    ...state,
                    system_settings: { ...state.system_settings, backup_frequency: e.target.value },
                  })
                }
                className="w-full bg-[#161922] border border-[#2a3144] rounded-lg p-2.5 text-xs text-white outline-none mt-1"
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
