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
      caption: newImageCaption.trim() || 'Costume & concept reference',
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#101217] border border-white/5 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#151820] text-slate-400 border border-white/5">
            <Users2 size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">Character dossiers</h2>
            <p className="text-xs text-slate-400 mt-0.5">Cast profiles, voice test archives, visual turnarounds, and cross-studio mentions</p>
          </div>
        </div>

        <button
          onClick={onCreateCharacter}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-medium self-start sm:self-auto transition-colors"
        >
          <Plus size={14} />
          <span>New character dossier</span>
        </button>
      </div>

      {/* Main Grid: Cast List & Detailed Multi-Tab Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Column: Cast Roster */}
        <div className="bg-[#101217] border border-white/5 rounded-xl p-3.5 lg:col-span-1 space-y-2 max-h-[700px] overflow-y-auto">
          <p className="text-xs font-medium text-slate-400 mb-2 px-1">Cast roster</p>
          {characters.map((char) => {
            const isSel = char.id === selectedChar?.id;
            return (
              <button
                key={char.id}
                onClick={() => setSelectedCharId(char.id)}
                className={`w-full text-left p-2 rounded-lg transition-colors flex items-center gap-2.5 border ${
                  isSel
                    ? 'bg-[#1a1e28] border-white/10 text-white'
                    : 'hover:bg-white/5 border-transparent text-slate-300'
                }`}
              >
                <img
                  src={char.avatar_url}
                  alt={char.name}
                  className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{char.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{char.role} • Age {char.age}</p>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{char.actor_name}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Column: Active Character Multi-Tab Dossier */}
        <div className="bg-[#101217] border border-white/5 rounded-xl p-5 lg:col-span-3 space-y-5">
          {selectedChar ? (
            <div>
              {/* Dossier Header with Avatar, Actor link, and Role */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
                <div className="flex items-center gap-3.5">
                  <img
                    src={selectedChar.avatar_url}
                    alt={selectedChar.name}
                    className="w-14 h-14 rounded-xl object-cover border border-white/10 shadow-sm"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-white tracking-tight">{selectedChar.name}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-amber-400 border border-white/10">
                        {selectedChar.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Portrayed by <span className="text-slate-200 font-medium">{selectedChar.actor_name}</span> • Age {selectedChar.age}
                    </p>
                  </div>
                </div>

                {/* Dossier Tabs */}
                <div className="flex bg-[#151820] p-1 rounded-lg border border-white/5 text-xs font-medium">
                  <button
                    onClick={() => setActiveTab('bio')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      activeTab === 'bio' ? 'bg-[#1a1e28] text-white shadow-sm border border-white/5' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Bio & traits
                  </button>
                  <button
                    onClick={() => setActiveTab('gallery')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      activeTab === 'gallery' ? 'bg-[#1a1e28] text-white shadow-sm border border-white/5' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Visual art ({selectedChar.gallery_images?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('voice')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      activeTab === 'voice' ? 'bg-[#1a1e28] text-white shadow-sm border border-white/5' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Voice takes ({selectedChar.voice_clips?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('matrix')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      activeTab === 'matrix' ? 'bg-[#1a1e28] text-white shadow-sm border border-white/5' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Mentions matrix
                  </button>
                </div>
              </div>

              {/* Tab 1: Bio & Demographics */}
              {activeTab === 'bio' && (
                <div className="space-y-4 pt-3">
                  <div>
                    <h4 className="text-xs font-medium text-slate-400 mb-1.5">Backstory & lore</h4>
                    <p className="text-xs leading-relaxed text-slate-200 bg-[#0a0b0e] p-3.5 rounded-lg border border-white/5 font-serif">
                      {selectedChar.backstory}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-medium text-slate-400 mb-1.5">Personality traits</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedChar.personality_traits?.map((trait, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-md bg-white/5 border border-white/5 text-xs text-slate-300"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Linked Cast & Crew Member */}
                  <div className="p-3 rounded-lg bg-[#0a0b0e] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-white/5 text-emerald-400 border border-white/5">
                        <UserCheck size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-white">Linked studio cast member</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Connected to registered team profile: <span className="text-slate-200 font-medium">{selectedChar.actor_name}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Visual Gallery & Turnarounds */}
              {activeTab === 'gallery' && (
                <div className="space-y-4 pt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">Character design turnaround sheets and costume variations</p>
                    <button
                      onClick={() => setShowImageDialog(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-medium transition-colors"
                    >
                      <Plus size={13} />
                      <span>Add turnaround art</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    {selectedChar.gallery_images?.map((item) => (
                      <div key={item.id} className="rounded-lg overflow-hidden border border-white/5 bg-[#0a0b0e] group">
                        <img src={item.url} alt={item.caption} className="w-full h-40 object-cover group-hover:scale-102 transition-transform duration-200" />
                        <div className="p-2.5">
                          <p className="text-xs font-medium text-slate-200">{item.caption}</p>
                        </div>
                      </div>
                    ))}
                    {(!selectedChar.gallery_images || selectedChar.gallery_images.length === 0) && (
                      <div className="col-span-full py-12 text-center text-slate-500 text-xs">
                        No reference art uploaded yet. Click "Add turnaround art" above.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Voice Archive & Microphone Audition Recorder */}
              {activeTab === 'voice' && (
                <div className="space-y-4 pt-3">
                  <div className="p-3.5 rounded-lg bg-[#0a0b0e] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-medium text-white">Record voice audition or dialogue take</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Capture voice actor accents, emotion passes, and dialogue takes</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {recorderSnapshot.state === 'IDLE' && (
                        <>
                          <input
                            type="text"
                            placeholder="Clip label (e.g. Battle Cry)"
                            value={clipTitle}
                            onChange={(e) => setClipTitle(e.target.value)}
                            className="bg-[#151820] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-white/20 w-40"
                          />
                          <button
                            onClick={startRecording}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-medium transition-colors"
                          >
                            <Mic size={13} />
                            <span>Record take</span>
                          </button>
                        </>
                      )}

                      {recorderSnapshot.state === 'REQUESTING_MIC' && (
                        <div className="flex items-center gap-2 text-xs text-amber-400 font-mono">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          <span>Requesting mic...</span>
                        </div>
                      )}

                      {recorderSnapshot.state === 'RECORDING' && (
                        <button
                          onClick={stopRecording}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-white mr-0.5" />
                          <Square size={12} />
                          <span>Stop & review</span>
                        </button>
                      )}

                      {recorderSnapshot.state === 'REVIEWING' && (
                        <div className="flex items-center gap-2 bg-[#151820] p-1.5 rounded-lg border border-white/10">
                          {recorderSnapshot.context.audioUrl && (
                            <audio src={recorderSnapshot.context.audioUrl} controls className="h-6 w-36" />
                          )}
                          <button
                            onClick={saveAuditionTake}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500 text-black text-xs font-medium hover:bg-amber-400"
                          >
                            <Check size={12} />
                            <span>Save take</span>
                          </button>
                          <button
                            onClick={() => sendRecorder({ type: 'DISCARD' })}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 transition-colors"
                            title="Discard take"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}

                      {recorderSnapshot.state === 'ERROR' && (
                        <div className="flex items-center gap-1.5 text-xs text-rose-400">
                          <AlertTriangle size={13} />
                          <span>{recorderSnapshot.context.errorMessage}</span>
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

                  <div className="space-y-2">
                    {selectedChar.voice_clips?.map((clip) => (
                      <div
                        key={clip.id}
                        className="p-2.5 rounded-lg bg-[#0a0b0e] border border-white/5 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <Volume2 size={15} className="text-amber-400" />
                          <div>
                            <p className="text-xs font-medium text-white">{clip.title}</p>
                            <p className="text-[10px] text-slate-500 font-mono">Recorded {clip.recordedAt}</p>
                          </div>
                        </div>
                        <audio src={clip.audioUrl} controls className="h-7 w-52" />
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
                <div className="space-y-4 pt-3">
                  <p className="text-xs text-slate-400">
                    Cross-studio intelligence scanning screenplay scenes, tasks, storyboards, and chats for <strong className="text-slate-200">{selectedChar.name}</strong>:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Screenplay Scenes Matrix */}
                    <div className="p-3.5 rounded-lg bg-[#0a0b0e] border border-white/5 space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                        <span className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                          <Film size={14} className="text-slate-400" />
                          <span>Screenplay scenes</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 tabular-nums">{mentionsMatrix.scenes.length}</span>
                      </div>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {mentionsMatrix.scenes.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => onNavigateToScene && onNavigateToScene(s.id)}
                            className="p-2 rounded bg-[#151820] hover:bg-[#1a1e28] cursor-pointer text-xs flex items-center justify-between transition-colors"
                          >
                            <span className="font-mono text-[11px] truncate text-slate-300">#{s.scene_number} {s.slugline}</span>
                            <ExternalLink size={12} className="text-slate-500 shrink-0 ml-1" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Kanban Production Tasks Matrix */}
                    <div className="p-3.5 rounded-lg bg-[#0a0b0e] border border-white/5 space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                        <span className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                          <CheckSquare size={14} className="text-slate-400" />
                          <span>Assigned tasks</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 tabular-nums">{mentionsMatrix.tasks.length}</span>
                      </div>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {mentionsMatrix.tasks.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => onNavigateToTask && onNavigateToTask(t.id)}
                            className="p-2 rounded bg-[#151820] hover:bg-[#1a1e28] cursor-pointer text-xs flex items-center justify-between transition-colors"
                          >
                            <span className="truncate text-slate-300">{t.title}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-mono bg-white/5 text-slate-400 border border-white/5">
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
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#101217] border border-white/10 rounded-xl p-5 max-w-md w-full space-y-4">
            <h3 className="text-sm font-semibold text-white">Add turnaround art</h3>
            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] text-slate-400">Image URL:</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="w-full bg-[#151820] border border-white/10 rounded-lg p-2 text-xs text-white outline-none mt-1 focus:border-white/20"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Caption / Description:</label>
                <input
                  type="text"
                  placeholder="e.g. EVA Pressure Suit Turnaround"
                  value={newImageCaption}
                  onChange={(e) => setNewImageCaption(e.target.value)}
                  className="w-full bg-[#151820] border border-white/10 rounded-lg p-2 text-xs text-white outline-none mt-1 focus:border-white/20"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowImageDialog(false)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addGalleryImage}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-medium transition-colors"
              >
                Save to gallery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
