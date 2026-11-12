import React, { useState, useRef } from 'react';
import {
  Users2,
  Mic,
  Square,
  Play,
  Volume2,
  Film,
  CheckSquare,
  MessageSquare,
  Plus,
  Trash2,
  Image as ImageIcon,
  ExternalLink,
  Sparkles,
  UserCheck,
  Check,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { Character, CharacterVoiceClip, CharacterGalleryItem, StudioDatabaseState } from '../types';
import { useExplicitMachine } from '../machines/useExplicitMachine';
import {
  createAudioRecorderMachine,
  AudioRecorderState,
  AudioRecorderEvent,
  AudioRecorderContext,
} from '../machines/audioRecorderMachine';

interface CharacterProfilesProps {
  state: StudioDatabaseState;
  onSaveCharacter: (char: Character) => void;
  onCreateCharacter: () => void;
  onNavigateToScene?: (sceneId: string) => void;
  onNavigateToTask?: (taskId: string) => void;
}

export const CharacterProfiles: React.FC<CharacterProfilesProps> = ({
  state,
  onSaveCharacter,
  onCreateCharacter,
  onNavigateToScene,
  onNavigateToTask,
}) => {
  const characters = state.characters;
  const [selectedCharId, setSelectedCharId] = useState<string>(characters[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'bio' | 'gallery' | 'voice' | 'matrix'>('bio');

  // Voice recording state & explicit FSM
  const [clipTitle, setClipTitle] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Add gallery image modal state
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageCaption, setNewImageCaption] = useState('');
  const [showImageDialog, setShowImageDialog] = useState(false);

  const selectedChar = characters.find((c) => c.id === selectedCharId) || characters[0];

  const [recorderSnapshot, sendRecorder] = useExplicitMachine<
    AudioRecorderState,
    AudioRecorderEvent,
    AudioRecorderContext
  >(() => createAudioRecorderMachine(`char-${selectedChar?.id}`), [selectedChar?.id]);

  // Global Mentions Matrix aggregation
  const mentionsMatrix = React.useMemo(() => {
    if (!selectedChar) return { scenes: [], tasks: [], storyboards: [], chats: [] };
    const charName = selectedChar.name.toLowerCase();
    const firstName = selectedChar.name.split(' ')[0].toLowerCase();
    const lastName = selectedChar.name.split(' ').slice(-1)[0].toLowerCase();

    const matchesName = (text: string) => {
      const lower = text.toLowerCase();
      return lower.includes(charName) || lower.includes(firstName) || lower.includes(lastName);
    };

    // 1. Screenplay scenes
    const scenes = state.scenes.filter((s) => matchesName(s.content) || matchesName(s.slugline));

    // 2. Kanban Tasks tagged or mentioned
    const tasks = state.kanban_tasks.filter(
      (t) =>
        t.tagged_character_ids?.includes(selectedChar.id) ||
        matchesName(t.title) ||
        matchesName(t.description)
    );

    // 3. Storyboard frames
    const storyboards = state.storyboard_frames.filter(
      (sb) => matchesName(sb.dialogue_text) || matchesName(sb.director_notes)
    );

    // 4. Team Chat discussions
    const chats = state.chat_messages.filter(
      (m) => matchesName(m.content) || (m.script_snippet_data && matchesName(m.script_snippet_data.scriptText))
    );

    return { scenes, tasks, storyboards, chats };
  }, [selectedChar, state]);

  // Voice recorder handlers driven by explicit state machine
  const startRecording = async () => {
    sendRecorder({ type: 'START_RECORD' });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        sendRecorder({ type: 'STOP_RECORD', blob: audioBlob, audioUrl: url, duration: 6.5 });
      };

      recorder.start();
      sendRecorder({ type: 'MIC_GRANTED', stream });
    } catch (e: any) {
      sendRecorder({
        type: 'MIC_DENIED',
        error: e?.message || 'Microphone access is not supported or was denied',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const saveAuditionTake = () => {
    if (!recorderSnapshot.context.audioUrl || !selectedChar) return;
    const newClip: CharacterVoiceClip = {
      id: `vc_${Date.now()}`,
      title: clipTitle.trim() || `Voice Take #${(selectedChar.voice_clips?.length || 0) + 1}`,
      audioUrl: recorderSnapshot.context.audioUrl,
      duration: recorderSnapshot.context.durationSeconds || 6.5,
      recordedAt: new Date().toISOString().split('T')[0],
    };

    const updatedClips = [...(selectedChar.voice_clips || []), newClip];
    onSaveCharacter({ ...selectedChar, voice_clips: updatedClips });
    setClipTitle('');
    sendRecorder({ type: 'COMMIT_SAVE' });
  };

  const addGalleryImage = () => {
    if (!newImageUrl.trim()) return;
    const newItem: CharacterGalleryItem = {
      id: `img_${Date.now()}`,
      url: newImageUrl.trim(),
      caption: newImageCaption.trim() || 'Costume & Concept Reference',
    };
    const updatedGallery = [...(selectedChar.gallery_images || []), newItem];
    onSaveCharacter({ ...selectedChar, gallery_images: updatedGallery });
    setNewImageUrl('');
    setNewImageCaption('');
    setShowImageDialog(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f1117] border border-[#1e2330] p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Users2 size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Character Intelligence Dossiers</h2>
            <p className="text-xs text-slate-400">Cast profiles, voice test archives, visual turnarounds & cross-studio mentions matrix</p>
          </div>
        </div>

        <button
          onClick={onCreateCharacter}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>New Character Dossier</span>
        </button>
      </div>

      {/* Main Grid: Cast List & Detailed Multi-Tab Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Column: Cast Roster */}
        <div className="studio-card p-4 lg:col-span-1 space-y-2.5 max-h-[700px] overflow-y-auto">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Cast Roster</p>
          {characters.map((char) => {
            const isSel = char.id === selectedChar?.id;
            return (
              <button
                key={char.id}
                onClick={() => setSelectedCharId(char.id)}
                className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center gap-3 border ${
                  isSel
                    ? 'bg-amber-500/10 border-amber-500/50 text-white'
                    : 'hover:bg-[#161922] border-transparent text-slate-300'
                }`}
              >
                <img
                  src={char.avatar_url}
                  alt={char.name}
                  className="w-10 h-10 rounded-full object-cover border border-[#2a3144] shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{char.name}</p>
                  <p className="text-[11px] text-amber-400 font-mono">{char.role} • Age: {char.age}</p>
                  <p className="text-[10px] text-slate-500 truncate">Cast: {char.actor_name}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Column: Active Character Multi-Tab Dossier */}
        <div className="studio-card p-6 lg:col-span-3 space-y-6">
          {selectedChar ? (
            <div>
              {/* Dossier Header with Avatar, Actor link, and Role */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#1e2330]">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedChar.avatar_url}
                    alt={selectedChar.name}
                    className="w-16 h-16 rounded-xl object-cover border-2 border-amber-500/30 shadow-md"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white tracking-tight">{selectedChar.name}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30">
                        {selectedChar.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Portrayed by: <span className="text-slate-200 font-semibold">{selectedChar.actor_name}</span> • Age: {selectedChar.age}
                    </p>
                  </div>
                </div>

                {/* Dossier Tabs */}
                <div className="flex bg-[#161922] p-1 rounded-lg border border-[#2a3144] text-xs font-semibold">
                  <button
                    onClick={() => setActiveTab('bio')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      activeTab === 'bio' ? 'bg-amber-500 text-black' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Bio & Traits
                  </button>
                  <button
                    onClick={() => setActiveTab('gallery')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      activeTab === 'gallery' ? 'bg-amber-500 text-black' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Visual Turnarounds ({selectedChar.gallery_images?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('voice')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      activeTab === 'voice' ? 'bg-amber-500 text-black' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Voice Archive ({selectedChar.voice_clips?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('matrix')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      activeTab === 'matrix' ? 'bg-amber-500 text-black' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Mentions Matrix
                  </button>
                </div>
              </div>

              {/* Tab 1: Bio & Demographics */}
              {activeTab === 'bio' && (
                <div className="space-y-5 pt-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Backstory & Lore</h4>
                    <p className="text-xs leading-relaxed text-slate-200 bg-[#0b0d13] p-4 rounded-xl border border-[#1e2330]">
                      {selectedChar.backstory}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Personality Traits</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedChar.personality_traits?.map((trait, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-md bg-[#161922] border border-[#2a3144] text-xs font-medium text-amber-300"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Linked Cast & Crew Member */}
                  <div className="p-4 rounded-xl bg-[#0b0d13] border border-[#1e2330] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <UserCheck size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Linked Studio Cast Member</p>
                        <p className="text-[11px] text-slate-400">
                          Connected to registered team profile: <span className="text-slate-200 font-semibold">{selectedChar.actor_name}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Visual Gallery & Turnarounds */}
              {activeTab === 'gallery' && (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400 font-medium">Character design turnaround sheets and costume variations</p>
                    <button
                      onClick={() => setShowImageDialog(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/25"
                    >
                      <Plus size={13} />
                      <span>Add Turnaround Art</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedChar.gallery_images?.map((item) => (
                      <div key={item.id} className="rounded-xl overflow-hidden border border-[#2a3144] bg-[#0b0d13] group">
                        <img src={item.url} alt={item.caption} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="p-2.5">
                          <p className="text-xs font-medium text-slate-200">{item.caption}</p>
                        </div>
                      </div>
                    ))}
                    {(!selectedChar.gallery_images || selectedChar.gallery_images.length === 0) && (
                      <div className="col-span-full py-12 text-center text-slate-500 text-xs">
                        No reference art uploaded yet. Click "Add Turnaround Art" above.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Voice Archive & Microphone Audition Recorder */}
              {activeTab === 'voice' && (
                <div className="space-y-5 pt-4">
                  <div className="p-4 rounded-xl bg-[#0b0d13] border border-[#1e2330] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-white">Record In-Studio Voice Audition / Dialogue Take</h4>
                      <p className="text-[11px] text-slate-400">Capture voice actor accents, emotion passes, and synthetic voice test clips</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {recorderSnapshot.state === 'IDLE' && (
                        <>
                          <input
                            type="text"
                            placeholder="Clip label (e.g. Battle Cry)"
                            value={clipTitle}
                            onChange={(e) => setClipTitle(e.target.value)}
                            className="bg-[#161922] border border-[#2a3144] rounded-lg px-2.5 py-1 text-xs text-white outline-none w-40"
                          />
                          <button
                            onClick={startRecording}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold"
                          >
                            <Mic size={13} />
                            <span>Record Take</span>
                          </button>
                        </>
                      )}

                      {recorderSnapshot.state === 'REQUESTING_MIC' && (
                        <span className="text-xs text-amber-400 font-mono animate-pulse">Requesting mic...</span>
                      )}

                      {recorderSnapshot.state === 'RECORDING' && (
                        <button
                          onClick={stopRecording}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white font-bold text-xs animate-pulse"
                        >
                          <Square size={13} />
                          <span>Stop & Review</span>
                        </button>
                      )}

                      {recorderSnapshot.state === 'REVIEWING' && (
                        <div className="flex items-center gap-2 bg-[#161922] p-1 rounded-lg border border-[#2a3144]">
                          {recorderSnapshot.context.audioUrl && (
                            <audio src={recorderSnapshot.context.audioUrl} controls className="h-6 w-36" />
                          )}
                          <button
                            onClick={saveAuditionTake}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500 text-black text-xs font-bold hover:bg-amber-400"
                          >
                            <Check size={12} />
                            <span>Save Clip</span>
                          </button>
                          <button
                            onClick={() => sendRecorder({ type: 'DISCARD' })}
                            className="p-1 rounded text-slate-400 hover:text-red-400"
                            title="Discard take"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}

                      {recorderSnapshot.state === 'ERROR' && (
                        <div className="flex items-center gap-1 text-xs text-red-400">
                          <AlertTriangle size={13} />
                          <button
                            onClick={() => sendRecorder({ type: 'RESET' })}
                            className="p-1 text-slate-400 hover:text-white"
                          >
                            <RotateCcw size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {selectedChar.voice_clips?.map((clip) => (
                      <div
                        key={clip.id}
                        className="p-3 rounded-lg bg-[#0b0d13] border border-[#1e2330] flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Volume2 size={16} className="text-amber-400" />
                          <div>
                            <p className="text-xs font-bold text-white">{clip.title}</p>
                            <p className="text-[10px] text-slate-500 font-mono">Recorded: {clip.recordedAt}</p>
                          </div>
                        </div>
                        <audio src={clip.audioUrl} controls className="h-7 w-56" />
                      </div>
                    ))}
                    {(!selectedChar.voice_clips || selectedChar.voice_clips.length === 0) && (
                      <div className="py-8 text-center text-slate-500 text-xs">
                        No voice takes stored in dossier archive.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Global Mentions Matrix */}
              {activeTab === 'matrix' && (
                <div className="space-y-5 pt-4">
                  <p className="text-xs text-slate-400">
                    Cross-studio intelligence automatically scanning all screenplay scenes, Kanban production tasks, storyboards, and chat logs for <strong className="text-amber-400">{selectedChar.name}</strong>:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Screenplay Scenes Matrix */}
                    <div className="p-4 rounded-xl bg-[#0b0d13] border border-[#1e2330] space-y-2.5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-[#1e2330]">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <Film size={14} className="text-amber-400" />
                          <span>Screenplay Scenes</span>
                        </span>
                        <span className="text-[10px] font-mono text-amber-400">{mentionsMatrix.scenes.length}</span>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {mentionsMatrix.scenes.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => onNavigateToScene && onNavigateToScene(s.id)}
                            className="p-2 rounded bg-[#161922] hover:bg-[#202534] cursor-pointer text-xs flex items-center justify-between"
                          >
                            <span className="font-mono text-[11px] truncate">#{s.scene_number} {s.slugline}</span>
                            <ExternalLink size={12} className="text-slate-500 shrink-0 ml-1" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Kanban Production Tasks Matrix */}
                    <div className="p-4 rounded-xl bg-[#0b0d13] border border-[#1e2330] space-y-2.5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-[#1e2330]">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <CheckSquare size={14} className="text-sky-400" />
                          <span>Assigned Tasks</span>
                        </span>
                        <span className="text-[10px] font-mono text-sky-400">{mentionsMatrix.tasks.length}</span>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {mentionsMatrix.tasks.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => onNavigateToTask && onNavigateToTask(t.id)}
                            className="p-2 rounded bg-[#161922] hover:bg-[#202534] cursor-pointer text-xs flex items-center justify-between"
                          >
                            <span className="truncate">{t.title}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold bg-[#2a3144] text-slate-300">
                              {t.column_id}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500 text-xs">No character selected.</div>
          )}
        </div>
      </div>

      {/* Add Turnaround Image Dialog */}
      {showImageDialog && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0f1117] border border-[#2a3144] rounded-xl p-5 max-w-md w-full space-y-4">
            <h3 className="text-sm font-bold text-white">Add Character Turnaround Art</h3>
            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] text-slate-400">Image URL:</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="w-full bg-[#161922] border border-[#2a3144] rounded-lg p-2 text-xs text-white outline-none mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Caption / Description:</label>
                <input
                  type="text"
                  placeholder="e.g. EVA Pressure Suit Turnaround"
                  value={newImageCaption}
                  onChange={(e) => setNewImageCaption(e.target.value)}
                  className="w-full bg-[#161922] border border-[#2a3144] rounded-lg p-2 text-xs text-white outline-none mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowImageDialog(false)}
                className="px-3 py-1.5 rounded-lg bg-[#161922] text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={addGalleryImage}
                className="px-4 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold"
              >
                Save to Gallery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
