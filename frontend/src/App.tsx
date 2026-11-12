import React, { useState, useEffect } from 'react';
import { initialStudioState } from './services/seedData';
import { ApiService } from './services/api';
import {
  StudioDatabaseState,
  Project,
  RoleTier,
  Scene,
  Character,
  KanbanTask,
  Whiteboard,
  StoryboardFrame,
  SoundboardClip,
  LoreArticle,
  Milestone,
  AuditLog,
} from './types';
import { Navigation } from './components/Navigation';
import { NotesWidget } from './components/NotesWidget';
import { AuditDrawer } from './components/AuditDrawer';
import { ProjectDashboard } from './modules/ProjectDashboard';
import { ScriptEditor } from './modules/ScriptEditor';
import { ScriptAnalytics } from './modules/ScriptAnalytics';
import { CharacterProfiles } from './modules/CharacterProfiles';
import { CreativeWhiteboard } from './modules/CreativeWhiteboard';
import { StoryboardBuilder } from './modules/StoryboardBuilder';
import { CommunicationHub } from './modules/CommunicationHub';
import { KanbanBoard } from './modules/KanbanBoard';
import { AssetVault } from './modules/AssetVault';
import { Soundboard } from './modules/Soundboard';
import { LoreWiki } from './modules/LoreWiki';
import { TimelineView } from './modules/TimelineView';
import { TeamProfiles } from './modules/TeamProfiles';
import { AdminPanel } from './modules/AdminPanel';

export function App() {
  const [state, setState] = useState<StudioDatabaseState>(() => {
    return ApiService.getLocalState() || initialStudioState;
  });

  const [activeModule, setActiveModule] = useState<string>('dashboard');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [backlogCount, setBacklogCount] = useState<number>(0);
  const [currentRole, setCurrentRole] = useState<RoleTier>('Super Admin');
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [showAudit, setShowAudit] = useState<boolean>(false);

  // Active production project
  const activeProject = state.projects.find((p) => p.active) || state.projects[0];

  // Initialize API service, connection listener, and WS listener
  useEffect(() => {
    ApiService.init();

    ApiService.onConnectionStatus((online) => {
      setIsOnline(online);
      setBacklogCount(ApiService.getOfflineBacklogCount());
    });

    ApiService.onWsMessage((event) => {
      if (event.type === 'chat_message') {
        setState((prev) => {
          // Avoid duplicate messages
          if (prev.chat_messages.some((m) => m.id === event.payload.id)) {
            return prev;
          }
          return {
            ...prev,
            chat_messages: [...prev.chat_messages, event.payload],
          };
        });
      } else if (event.type === 'sync_mutation') {
        // Refresh full state if notified of a remote update
        ApiService.fetchFullState().then((remote) => {
          if (remote) setState(remote);
        }).catch(() => {});
      }
    });

    // Initial fetch from Rust backend
    ApiService.fetchFullState()
      .then((remote) => {
        setState(remote);
      })
      .catch(() => {
        // Fall back to seed state
      });
  }, []);

  // Update and synchronize state changes
  const updateStateAndSync = (updater: (prev: StudioDatabaseState) => StudioDatabaseState) => {
    setState((prev) => {
      const next = updater(prev);
      ApiService.saveRemoteState(next);
      setBacklogCount(ApiService.getOfflineBacklogCount());
      return next;
    });
  };

  const handleManualSync = async () => {
    await ApiService.flushOfflineBacklog();
    const remote = await ApiService.fetchFullState().catch(() => null);
    if (remote) {
      setState(remote);
    }
    setBacklogCount(ApiService.getOfflineBacklogCount());
  };

  const appendAudit = (action_type: string, entity_type: string, entity_title: string, details: string) => {
    const newLog: AuditLog = {
      id: `log_${Date.now()}`,
      project_id: activeProject.id,
      user_id: state.team_members[0]?.id || 'user_tyler',
      user_name: state.team_members[0]?.name || 'Tyler Vance',
      action_type,
      entity_type,
      entity_title,
      details,
      timestamp: new Date().toISOString(),
    };

    updateStateAndSync((prev) => ({
      ...prev,
      audit_logs: [newLog, ...prev.audit_logs],
    }));

    ApiService.postAuditLog(newLog);
  };

  // Scene handlers
  const handleSaveScene = (updatedScene: Scene) => {
    updateStateAndSync((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) => (s.id === updatedScene.id ? updatedScene : s)),
    }));
    appendAudit('UPDATE', 'Scene', updatedScene.slugline, 'Edited Fountain script content and cues');
  };

  const handleCreateScene = (episodeId: string) => {
    const ep = state.episodes.find((e) => e.id === episodeId) || state.episodes[0];
    const epScenes = state.scenes.filter((s) => s.episode_id === ep.id);
    const sceneNumber = epScenes.length + 1;
    const newScene: Scene = {
      id: `sc_${Date.now()}`,
      project_id: activeProject.id,
      episode_id: ep.id,
      scene_number: sceneNumber,
      slugline: `INT. COMPARTMENT - SCENE ${sceneNumber}`,
      content: `INT. COMPARTMENT - SCENE ${sceneNumber}\n\nAction block begins here.\n\nCHARACTER\nDialogue goes here.`,
      synopsis: 'New scene in progress.',
      locked_until: null,
      is_spoiler: false,
      location: 'Interior Compartment',
      time_of_day: 'DAY',
      page_length: 1.0,
      voice_memo_url: null,
      voice_memo_duration: null,
      created_at: new Date().toISOString(),
    };

    updateStateAndSync((prev) => ({
      ...prev,
      scenes: [...prev.scenes, newScene],
    }));
    appendAudit('CREATE', 'Scene', newScene.slugline, `Registered new scene #${sceneNumber} in ${ep.title}`);
  };

  // Character handlers
  const handleSaveCharacter = (char: Character) => {
    updateStateAndSync((prev) => ({
      ...prev,
      characters: prev.characters.map((c) => (c.id === char.id ? char : c)),
    }));
    appendAudit('UPDATE', 'Character', char.name, 'Updated dossier backstory or voice tests');
  };

  const handleCreateCharacter = () => {
    const newChar: Character = {
      id: `char_${Date.now()}`,
      project_id: activeProject.id,
      name: 'New Character Candidate',
      role: 'Supporting',
      age: 30,
      actor_name: 'TBD',
      linked_user_id: null,
      backstory: 'Character backstory and narrative history in development.',
      personality_traits: ['Tenacious', 'Curious'],
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      gallery_images: [],
      voice_clips: [],
      created_at: new Date().toISOString(),
    };

    updateStateAndSync((prev) => ({
      ...prev,
      characters: [...prev.characters, newChar],
    }));
    appendAudit('CREATE', 'Character', newChar.name, 'Registered new character intelligence dossier');
  };

  // Kanban handlers
  const handleSaveTask = (task: KanbanTask) => {
    updateStateAndSync((prev) => ({
      ...prev,
      kanban_tasks: prev.kanban_tasks.map((t) => (t.id === task.id ? task : t)),
    }));
    appendAudit('UPDATE', 'Task', task.title, `Moved task stage to ${task.column_id}`);
  };

  const handleDeleteTask = (taskId: string) => {
    updateStateAndSync((prev) => ({
      ...prev,
      kanban_tasks: prev.kanban_tasks.filter((t) => t.id !== taskId),
    }));
  };

  const handleCreateTask = (columnId: KanbanTask['column_id']) => {
    const newTask: KanbanTask = {
      id: `task_${Date.now()}`,
      project_id: activeProject.id,
      episode_id: state.episodes[0]?.id || null,
      column_id: columnId,
      title: 'New Production Action Card',
      description: 'Detail action specifications and character assignments.',
      priority: 'Medium',
      due_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
      assignee_id: state.team_members[0]?.id || null,
      assignee_name: state.team_members[0]?.name || null,
      tagged_character_ids: [],
      labels: ['Production'],
      created_at: new Date().toISOString(),
    };

    updateStateAndSync((prev) => ({
      ...prev,
      kanban_tasks: [...prev.kanban_tasks, newTask],
    }));
    appendAudit('CREATE', 'Task', newTask.title, `Added new card to ${columnId}`);
  };

  // Whiteboard handlers
  const handleSaveWhiteboard = (board: Whiteboard) => {
    updateStateAndSync((prev) => ({
      ...prev,
      whiteboards: prev.whiteboards.map((b) => (b.id === board.id ? board : b)),
    }));
  };

  const handleCreateWhiteboard = () => {
    const newBoard: Whiteboard = {
      id: `wb_${Date.now()}`,
      project_id: activeProject.id,
      title: `Creative Canvas #${state.whiteboards.length + 1}`,
      category: 'Concept Art & Moodboard',
      is_pinned: false,
      is_locked: false,
      nodes: [
        {
          id: `node_${Date.now()}`,
          board_id: `wb_${Date.now()}`,
          node_type: 'sticky_note',
          x: 100,
          y: 100,
          width: 240,
          height: 150,
          title: 'Initial Beat Note',
          content: 'Brainstorm creative story points and ideas here.',
          color: '#f59e0b',
        },
      ],
      edges: [],
      created_at: new Date().toISOString(),
    };

    updateStateAndSync((prev) => ({
      ...prev,
      whiteboards: [...prev.whiteboards, newBoard],
    }));
    appendAudit('CREATE', 'Whiteboard', newBoard.title, 'Created new spatial canvas');
  };

  // Storyboard frame handlers
  const handleSaveStoryboardFrame = (frame: StoryboardFrame) => {
    updateStateAndSync((prev) => ({
      ...prev,
      storyboard_frames: prev.storyboard_frames.map((f) => (f.id === frame.id ? frame : f)),
    }));
  };

  const handleDeleteStoryboardFrame = (frameId: string) => {
    updateStateAndSync((prev) => ({
      ...prev,
      storyboard_frames: prev.storyboard_frames.filter((f) => f.id !== frameId),
    }));
  };

  const handleCreateStoryboardFrame = () => {
    const newFrame: StoryboardFrame = {
      id: `sb_${Date.now()}`,
      project_id: activeProject.id,
      episode_id: state.episodes[0]?.id || 'ep_101',
      scene_id: state.scenes[0]?.id || null,
      sequence_index: state.storyboard_frames.length + 1,
      image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
      camera_framing: 'Medium Shot',
      camera_movement: 'Static',
      dialogue_text: 'CHARACTER: Dialogue line placeholder.',
      director_notes: 'Camera framing note and lighting pass.',
      sound_effects: 'Room tone',
      duration_seconds: 3.5,
    };

    updateStateAndSync((prev) => ({
      ...prev,
      storyboard_frames: [...prev.storyboard_frames, newFrame],
    }));
    appendAudit('CREATE', 'Storyboard', `Shot #${newFrame.sequence_index}`, 'Added new animatic frame');
  };

  // Soundboard handlers
  const handleSaveSoundboardClip = (clip: SoundboardClip) => {
    updateStateAndSync((prev) => {
      const exists = prev.soundboard_clips.some((c) => c.id === clip.id);
      return {
        ...prev,
        soundboard_clips: exists
          ? prev.soundboard_clips.map((c) => (c.id === clip.id ? clip : c))
          : [clip, ...prev.soundboard_clips],
      };
    });
    appendAudit('CREATE', 'Soundboard', clip.title, `Recorded ${clip.category} soundbite`);
  };

  const handleDeleteSoundboardClip = (clipId: string) => {
    updateStateAndSync((prev) => ({
      ...prev,
      soundboard_clips: prev.soundboard_clips.filter((c) => c.id !== clipId),
    }));
  };

  // Asset handlers
  const handleSaveAsset = (asset: any) => {
    updateStateAndSync((prev) => ({
      ...prev,
      assets: prev.assets.map((a) => (a.id === asset.id ? asset : a)),
    }));
  };

  const handleDeleteAsset = (assetId: string) => {
    updateStateAndSync((prev) => ({
      ...prev,
      assets: prev.assets.filter((a) => a.id !== assetId),
    }));
  };

  const handleCreateAsset = (folderPath: string) => {
    const filename = prompt('Enter asset filename (e.g. Concept_Costume_v1.png):', 'New_Concept_Art.png');
    if (!filename) return;

    const newAsset = {
      id: `ast_${Date.now()}`,
      project_id: activeProject.id,
      folder_path: folderPath,
      filename,
      file_type: 'image' as const,
      file_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
      file_size_bytes: 3500000,
      tags: ['Concept', 'Production'],
      version: 'v1.0',
      uploaded_by: state.team_members[0]?.name || 'Tyler Vance',
      deep_links: [],
      created_at: new Date().toISOString(),
    };

    updateStateAndSync((prev) => ({
      ...prev,
      assets: [newAsset, ...prev.assets],
    }));
    appendAudit('CREATE', 'Asset', newAsset.filename, `Uploaded to ${folderPath}`);
  };

  // Lore handlers
  const handleSaveLoreArticle = (article: LoreArticle) => {
    updateStateAndSync((prev) => ({
      ...prev,
      lore_articles: prev.lore_articles.map((l) => (l.id === article.id ? article : l)),
    }));
  };

  const handleDeleteLoreArticle = (articleId: string) => {
    updateStateAndSync((prev) => ({
      ...prev,
      lore_articles: prev.lore_articles.filter((l) => l.id !== articleId),
    }));
  };

  const handleCreateLoreArticle = () => {
    const title = prompt('Enter lore article title:', 'The Void Nexus');
    if (!title) return;

    const newLore: LoreArticle = {
      id: `lore_${Date.now()}`,
      project_id: activeProject.id,
      title,
      category: 'Cosmology',
      emoji_icon: '🌌',
      cover_image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
      summary: 'An unmapped region of dark energy and gravimetric ripples.',
      content_markdown: `# ${title}\n\nDocument franchise lore, physics, and historical continuity.`,
      property_cards: [{ key: 'Status', value: 'Active Anomaly' }],
      tags: ['Lore', 'Bible'],
      attached_asset_ids: [],
      updated_at: new Date().toISOString(),
    };

    updateStateAndSync((prev) => ({
      ...prev,
      lore_articles: [newLore, ...prev.lore_articles],
    }));
    appendAudit('CREATE', 'Lore', newLore.title, 'Created new franchise bible article');
  };

  // Milestone handlers
  const handleSaveMilestone = (ms: Milestone) => {
    updateStateAndSync((prev) => ({
      ...prev,
      milestones: prev.milestones.map((m) => (m.id === ms.id ? ms : m)),
    }));
  };

  const handleCreateMilestone = (phase: Milestone['phase']) => {
    const title = prompt('Enter milestone title:', 'Episode 4 Table Read');
    if (!title) return;

    const newMs: Milestone = {
      id: `ms_${Date.now()}`,
      project_id: activeProject.id,
      phase,
      title,
      description: 'Production milestone checklist.',
      target_date: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      status: 'pending',
      progress_pct: 0,
    };

    updateStateAndSync((prev) => ({
      ...prev,
      milestones: [...prev.milestones, newMs],
    }));
    appendAudit('CREATE', 'Milestone', newMs.title, `Added milestone to phase: ${phase}`);
  };

  // Project selector
  const handleSelectProject = (proj: Project) => {
    updateStateAndSync((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => ({ ...p, active: p.id === proj.id })),
    }));
  };

  return (
    <div className="min-h-screen bg-[#08090e] text-[#f8fafc] flex flex-col">
      {/* Top Navigation */}
      <Navigation
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        activeProject={activeProject}
        allProjects={state.projects}
        onSelectProject={handleSelectProject}
        state={state}
        isOnline={isOnline}
        backlogCount={backlogCount}
        onManualSync={handleManualSync}
        onToggleNotes={() => setShowNotes(!showNotes)}
        onToggleAudit={() => setShowAudit(!showAudit)}
        currentRole={currentRole}
        onChangeRole={setCurrentRole}
        onNavigateToItem={(mod) => setActiveModule(mod)}
      />

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-64 p-4 lg:p-6 max-w-7xl w-full mx-auto pb-20">
        {activeModule === 'dashboard' && (
          <ProjectDashboard
            project={activeProject}
            state={state}
            onNavigate={(mod) => setActiveModule(mod)}
            isOnline={isOnline}
            backlogCount={backlogCount}
          />
        )}

        {activeModule === 'scripts' && (
          <ScriptEditor
            project={activeProject}
            episodes={state.episodes.filter((e) => e.project_id === activeProject.id)}
            scenes={state.scenes.filter((s) => s.project_id === activeProject.id)}
            characters={state.characters.filter((c) => c.project_id === activeProject.id)}
            onSaveScene={handleSaveScene}
            onCreateScene={handleCreateScene}
            onNavigateToCharacter={() => setActiveModule('characters')}
            onOpenAnalytics={() => setActiveModule('analytics')}
          />
        )}

        {activeModule === 'analytics' && (
          <ScriptAnalytics
            scenes={state.scenes.filter((s) => s.project_id === activeProject.id)}
            characters={state.characters.filter((c) => c.project_id === activeProject.id)}
            onBackToEditor={() => setActiveModule('scripts')}
          />
        )}

        {activeModule === 'characters' && (
          <CharacterProfiles
            state={state}
            onSaveCharacter={handleSaveCharacter}
            onCreateCharacter={handleCreateCharacter}
            onNavigateToScene={() => setActiveModule('scripts')}
            onNavigateToTask={() => setActiveModule('kanban')}
          />
        )}

        {activeModule === 'whiteboard' && (
          <CreativeWhiteboard
            whiteboards={state.whiteboards.filter((w) => w.project_id === activeProject.id)}
            onSaveWhiteboard={handleSaveWhiteboard}
            onCreateWhiteboard={handleCreateWhiteboard}
          />
        )}

        {activeModule === 'storyboard' && (
          <StoryboardBuilder
            state={state}
            onSaveFrame={handleSaveStoryboardFrame}
            onDeleteFrame={handleDeleteStoryboardFrame}
            onCreateFrame={handleCreateStoryboardFrame}
          />
        )}

        {activeModule === 'chat' && (
          <CommunicationHub
            state={state}
            currentUser={state.team_members[0]}
            onNavigateToWhiteboard={() => setActiveModule('whiteboard')}
            onNavigateToScene={() => setActiveModule('scripts')}
          />
        )}

        {activeModule === 'kanban' && (
          <KanbanBoard
            state={state}
            onSaveTask={handleSaveTask}
            onDeleteTask={handleDeleteTask}
            onCreateTask={handleCreateTask}
          />
        )}

        {activeModule === 'assets' && (
          <AssetVault
            state={state}
            onSaveAsset={handleSaveAsset}
            onDeleteAsset={handleDeleteAsset}
            onCreateAsset={handleCreateAsset}
          />
        )}

        {activeModule === 'soundboard' && (
          <Soundboard
            state={state}
            onSaveClip={handleSaveSoundboardClip}
            onDeleteClip={handleDeleteSoundboardClip}
          />
        )}

        {activeModule === 'lore' && (
          <LoreWiki
            state={state}
            onSaveArticle={handleSaveLoreArticle}
            onDeleteArticle={handleDeleteLoreArticle}
            onCreateArticle={handleCreateLoreArticle}
          />
        )}

        {activeModule === 'timeline' && (
          <TimelineView
            state={state}
            onSaveMilestone={handleSaveMilestone}
            onCreateMilestone={handleCreateMilestone}
          />
        )}

        {activeModule === 'team' && (
          <TeamProfiles
            state={state}
            onNavigateToChat={() => setActiveModule('chat')}
            onNavigateToCharacter={() => setActiveModule('characters')}
          />
        )}

        {activeModule === 'admin' && (
          <AdminPanel
            state={state}
            onUpdateState={(next) => updateStateAndSync(() => next)}
            currentRole={currentRole}
          />
        )}
      </main>

      {/* Floating Quick Scratchpad */}
      <NotesWidget isOpen={showNotes} onClose={() => setShowNotes(false)} />

      {/* Activity & Audit Drawer */}
      <AuditDrawer
        isOpen={showAudit}
        onClose={() => setShowAudit(false)}
        logs={state.audit_logs}
      />
    </div>
  );
}

export default App;
