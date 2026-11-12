import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Lock,
  Unlock,
  Play,
  Pause,
  Mic,
  Square,
  Volume2,
  Users,
  Eye,
  Sliders,
  ChevronRight,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  BarChart2,
  Maximize2,
  Minimize2,
  Check,
} from 'lucide-react';
import { Episode, Scene, Character, Project } from '../types';

interface ScriptEditorProps {
  project: Project;
  episodes: Episode[];
  scenes: Scene[];
  characters: Character[];
  onSaveScene: (scene: Scene) => void;
  onCreateScene: (episodeId: string) => void;
  onNavigateToCharacter?: (charId: string) => void;
  onOpenAnalytics?: () => void;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  project,
  episodes,
  scenes,
  characters,
  onSaveScene,
  onCreateScene,
  onNavigateToCharacter,
  onOpenAnalytics,
}) => {
  const [selectedSceneId, setSelectedSceneId] = useState<string>(scenes[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('preview');
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [teleprompterSpeed, setTeleprompterSpeed] = useState(2);
  const [teleprompterFontSize, setTeleprompterFontSize] = useState(28);
  const [teleprompterPlaying, setTeleprompterPlaying] = useState(false);

  // Time-lock embargo modal state
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockHours, setLockHours] = useState(24);

  // Voice memo recording state
  const [isRecordingMemo, setIsRecordingMemo] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Teleprompter scroll ref
  const teleprompterRef = useRef<HTMLDivElement>(null);

  const currentScene = scenes.find((s) => s.id === selectedSceneId) || scenes[0];

  // Auto-scroll for Teleprompter
  useEffect(() => {
    let interval: any;
    if (showTeleprompter && teleprompterPlaying && teleprompterRef.current) {
      interval = setInterval(() => {
        if (teleprompterRef.current) {
          teleprompterRef.current.scrollTop += teleprompterSpeed;
        }
      }, 30);
    }
    return () => clearInterval(interval);
  }, [showTeleprompter, teleprompterPlaying, teleprompterSpeed]);

  // Is current scene locked by embargo?
  const isLocked = Boolean(
    currentScene?.locked_until && new Date(currentScene.locked_until).getTime() > Date.now()
  );

  // Character Continuity Auto-Detection
  const detectedCharacters = React.useMemo(() => {
    if (!currentScene) return [];
    const textUpper = (currentScene.content || '').toUpperCase();
    return characters.filter((c) => {
      const charNameUpper = c.name.toUpperCase();
      const firstNameUpper = c.name.split(' ')[0].toUpperCase();
      const lastNameUpper = c.name.split(' ').slice(-1)[0].toUpperCase();
      return (
        textUpper.includes(charNameUpper) ||
        textUpper.includes(firstNameUpper) ||
        textUpper.includes(lastNameUpper)
      );
    });
  }, [currentScene, characters]);

  // Fountain Screenplay Parser
  const parseFountain = (raw: string) => {
    const lines = raw.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // Empty line
      if (!trimmed) {
        return <div key={idx} className="h-4" />;
      }

      // Scene Heading (EXT., INT., I/E., EST.)
      if (/^(EXT\.|INT\.|I\/E\.|INT\/EXT\.|EST\.)/i.test(trimmed)) {
        return (
          <div
            key={idx}
            className="font-bold text-amber-400 tracking-wider text-sm mt-6 mb-2 uppercase border-b border-amber-500/20 pb-1"
          >
            {trimmed}
          </div>
        );
      }

      // Transition (CUT TO:, FADE OUT., DISSOLVE TO:, FADE IN:)
      if (/^(CUT TO:|FADE OUT\.|FADE IN:|DISSOLVE TO:|MATCH CUT TO:)/i.test(trimmed) || trimmed.endsWith('TO:')) {
        return (
          <div key={idx} className="text-right text-slate-400 text-xs font-semibold my-4 tracking-widest uppercase">
            {trimmed}
          </div>
        );
      }

      // Parenthetical (e.g. (leaning forward), (smiling))
      if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        return (
          <div key={idx} className="text-center text-slate-400 italic text-xs my-0.5 max-w-sm mx-auto">
            {trimmed}
          </div>
        );
      }

      // Character Cue: uppercase line, not too long, likely dialogue speaker
      if (
        trimmed === trimmed.toUpperCase() &&
        trimmed.length > 1 &&
        trimmed.length < 35 &&
        !trimmed.startsWith('EXT.') &&
        !trimmed.startsWith('INT.')
      ) {
        return (
          <div
            key={idx}
            className="text-center text-amber-300 font-bold tracking-widest text-xs mt-4 mb-1 uppercase"
          >
            {trimmed}
          </div>
        );
      }

      // Dialogue (follows character cue or parenthetical)
      const prevLine = idx > 0 ? lines[idx - 1].trim() : '';
      const isPrevCue =
        prevLine === prevLine.toUpperCase() &&
        prevLine.length > 1 &&
        prevLine.length < 35 &&
        !prevLine.startsWith('EXT.') &&
        !prevLine.startsWith('INT.');
      const isPrevParen = prevLine.startsWith('(') && prevLine.endsWith(')');

      if (isPrevCue || isPrevParen) {
        return (
          <div key={idx} className="text-center text-slate-100 text-xs leading-relaxed max-w-md mx-auto mb-2">
            {trimmed}
          </div>
        );
      }

      // Action / Narrative block (default)
      return (
        <div key={idx} className="text-left text-slate-300 text-xs leading-relaxed my-2 max-w-2xl">
          {trimmed}
        </div>
      );
    });
  };

  // Voice memo recording handlers
  const startRecordingMemo = async () => {
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
        setRecordedAudioUrl(url);

        if (currentScene) {
          onSaveScene({
            ...currentScene,
            voice_memo_url: url,
            voice_memo_duration: 10,
          });
        }
      };

      recorder.start();
      setIsRecordingMemo(true);
    } catch (e) {
      alert('Microphone access unavailable or denied in this environment.');
    }
  };

  const stopRecordingMemo = () => {
    if (mediaRecorderRef.current && isRecordingMemo) {
      mediaRecorderRef.current.stop();
      setIsRecordingMemo(false);
    }
  };

  // Embargo time lock toggle
  const applyLock = () => {
    if (!currentScene) return;
    const unlockDate = new Date(Date.now() + lockHours * 3600 * 1000).toISOString();
    onSaveScene({
      ...currentScene,
      locked_until: unlockDate,
      is_spoiler: true,
    });
    setShowLockModal(false);
  };

  const removeLock = () => {
    if (!currentScene) return;
    onSaveScene({
      ...currentScene,
      locked_until: null,
      is_spoiler: false,
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Mode Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f1117] border border-[#1e2330] p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <FileText size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Fountain Screenplay Suite</h2>
            <p className="text-xs text-slate-400">Industry-standard Hollywood formatting with continuity auto-detection</p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Editor / Preview Switcher */}
          <div className="flex bg-[#161922] p-0.5 rounded-lg border border-[#2a3144]">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'preview' ? 'bg-amber-500 text-black' : 'text-slate-300 hover:text-white'
              }`}
            >
              Formatted Script
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'editor' ? 'bg-amber-500 text-black' : 'text-slate-300 hover:text-white'
              }`}
            >
              Fountain Markdown
            </button>
          </div>

          {/* Teleprompter / Script Reader button */}
          <button
            onClick={() => setShowTeleprompter(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161922] hover:bg-[#202534] border border-[#2a3144] text-xs font-medium text-slate-200"
            title="Open Teleprompter / Rehearsal Reader"
          >
            <Maximize2 size={13} className="text-amber-400" />
            <span>Teleprompter</span>
          </button>

          {/* Script Analytics Jump */}
          {onOpenAnalytics && (
            <button
              onClick={onOpenAnalytics}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161922] hover:bg-[#202534] border border-[#2a3144] text-xs font-medium text-slate-200"
            >
              <BarChart2 size={13} className="text-sky-400" />
              <span>Analytics</span>
            </button>
          )}

          {/* Time-Lock Embargo Action */}
          {isLocked ? (
            <button
              onClick={removeLock}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold hover:bg-amber-500/30 transition-colors"
            >
              <Lock size={13} />
              <span>Unlock Scene</span>
            </button>
          ) : (
            <button
              onClick={() => setShowLockModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161922] hover:bg-[#202534] border border-[#2a3144] text-xs font-medium text-slate-300"
            >
              <Clock size={13} className="text-slate-400" />
              <span>Embargo Lock</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Screenplay Suite Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Column: Episode & Scene Hierarchy Navigator */}
        <div className="studio-card p-4 lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#1e2330]">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Episode Scenes</span>
            <button
              onClick={() => onCreateScene(episodes[0]?.id || '')}
              className="p-1 rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 text-xs"
              title="Add New Scene"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {episodes.map((ep) => {
              const epScenes = scenes.filter((s) => s.episode_id === ep.id);
              return (
                <div key={ep.id} className="space-y-1.5">
                  <div className="flex items-center justify-between px-2 py-1 rounded bg-[#0b0d13] text-[11px] font-semibold text-slate-300">
                    <span className="truncate">E{ep.episode_number}: {ep.title}</span>
                    <span className="text-slate-500 font-mono">{epScenes.length}</span>
                  </div>
                  <div className="space-y-1 pl-1">
                    {epScenes.map((s) => {
                      const isSel = s.id === currentScene?.id;
                      const isSceneLocked = Boolean(s.locked_until && new Date(s.locked_until).getTime() > Date.now());
                      return (
                        <button
                          key={s.id}
                          onClick={() => setSelectedSceneId(s.id)}
                          className={`w-full text-left p-2 rounded-lg text-xs transition-all flex items-center justify-between ${
                            isSel
                              ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 font-semibold'
                              : 'hover:bg-[#161922] text-slate-300 border border-transparent'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="truncate font-mono text-[11px]">#{s.scene_number} {s.slugline}</p>
                            <p className="text-[10px] text-slate-500 truncate">{s.location} • {s.page_length} pgs</p>
                          </div>
                          {isSceneLocked && <Lock size={12} className="text-amber-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Fountain Screenplay Reading/Writing Canvas */}
        <div className="studio-card p-6 lg:col-span-2 relative min-h-[580px] flex flex-col justify-between">
          {currentScene ? (
            <div>
              {/* Scene Slug & Header Bar */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1e2330]">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono">{currentScene.slugline}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Scene #{currentScene.scene_number} • Est. Length: {currentScene.page_length} pages • {currentScene.time_of_day}
                  </p>
                </div>
                {isLocked && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/40 border border-amber-500/40 text-amber-400 text-xs font-mono font-bold">
                    <Lock size={12} />
                    <span>SEALED EMBARGO</span>
                  </div>
                )}
              </div>

              {/* Embargo Overlay if locked */}
              {isLocked ? (
                <div className="p-8 my-8 text-center rounded-xl bg-[#0b0d13] border border-amber-500/30 space-y-3">
                  <Lock size={36} className="mx-auto text-amber-400 animate-pulse" />
                  <h4 className="text-base font-bold text-white">Confidential Production Embargo Active</h4>
                  <p className="text-xs text-slate-300 max-w-md mx-auto">
                    This scene content has been time-locked to prevent plot leaks before scheduled table reads.
                  </p>
                  <div className="p-3 rounded-lg bg-[#161922] max-w-xs mx-auto border border-[#2a3144]">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Scheduled Unlock Date</p>
                    <p className="text-xs font-mono font-semibold text-amber-400 mt-0.5">
                      {new Date(currentScene.locked_until!).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={removeLock}
                    className="px-4 py-2 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors"
                  >
                    Super Admin Emergency Override
                  </button>
                </div>
              ) : activeTab === 'editor' ? (
                /* Fountain Textarea Editor */
                <textarea
                  value={currentScene.content}
                  onChange={(e) => onSaveScene({ ...currentScene, content: e.target.value })}
                  placeholder="Type screenplay in Fountain markdown (EXT./INT., CHARACTER CUE, dialogue, CUT TO:)..."
                  className="w-full h-[450px] bg-[#0b0d13] border border-[#1e2330] rounded-lg p-4 font-screenplay text-xs text-slate-200 outline-none focus:border-amber-500/50 resize-y leading-relaxed"
                />
              ) : (
                /* Hollywood Screenplay Standard Formatted Render */
                <div className="p-6 bg-[#0b0d13] border border-[#1e2330] rounded-lg min-h-[450px] font-screenplay overflow-y-auto max-h-[500px]">
                  {parseFountain(currentScene.content)}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500 text-xs">No scene selected.</div>
          )}

          {/* Bottom Bar: In-Scene Voice Memo Controls */}
          {currentScene && !isLocked && (
            <div className="mt-4 pt-3 border-t border-[#1e2330] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">In-Scene Director Memo:</span>
                {currentScene.voice_memo_url ? (
                  <div className="flex items-center gap-2 bg-[#161922] px-2.5 py-1 rounded-md border border-[#2a3144]">
                    <Volume2 size={14} className="text-amber-400" />
                    <audio src={currentScene.voice_memo_url} controls className="h-6 w-44" />
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-500">None attached</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isRecordingMemo ? (
                  <button
                    onClick={stopRecordingMemo}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white font-bold animate-pulse"
                  >
                    <Square size={13} />
                    <span>Stop Recording</span>
                  </button>
                ) : (
                  <button
                    onClick={startRecordingMemo}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161922] hover:bg-[#202534] border border-[#2a3144] text-slate-200 font-medium transition-colors"
                  >
                    <Mic size={13} className="text-amber-400" />
                    <span>Record Voice Memo</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Character Continuity Auto-Detection & Details */}
        <div className="studio-card p-4 lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#1e2330]">
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Continuity Scanner
              </span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#161922] text-amber-400 border border-[#2a3144]">
              {detectedCharacters.length} Linked
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-normal">
            Characters automatically recognized in this scene's Fountain cues:
          </p>

          <div className="space-y-2">
            {detectedCharacters.length === 0 ? (
              <div className="p-4 rounded-lg bg-[#0b0d13] text-center text-slate-500 text-xs">
                No registered characters recognized in this scene text.
              </div>
            ) : (
              detectedCharacters.map((char) => (
                <div
                  key={char.id}
                  className="p-2.5 rounded-lg bg-[#0b0d13] border border-[#1e2330] flex items-center justify-between hover:border-amber-500/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={char.avatar_url}
                      alt={char.name}
                      className="w-8 h-8 rounded-full object-cover border border-[#2a3144]"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{char.name}</p>
                      <p className="text-[10px] text-amber-400 font-mono">{char.role}</p>
                    </div>
                  </div>
                  {onNavigateToCharacter && (
                    <button
                      onClick={() => onNavigateToCharacter(char.id)}
                      className="p-1 rounded hover:bg-[#161922] text-slate-400 hover:text-amber-400"
                      title="Jump to Character Dossier"
                    >
                      <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Teleprompter / Fullscreen Script Reader Modal */}
      {showTeleprompter && currentScene && (
        <div className="fixed inset-0 z-50 bg-[#08090e] text-white flex flex-col">
          {/* Teleprompter Controls Header */}
          <div className="h-14 border-b border-[#1e2330] bg-[#0f1117] px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold text-amber-400 uppercase">
                TELEPROMPTER REHEARSAL MODE
              </span>
              <span className="text-xs text-slate-400 font-mono">• {currentScene.slugline}</span>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Speed:</span>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={teleprompterSpeed}
                  onChange={(e) => setTeleprompterSpeed(Number(e.target.value))}
                  className="w-20 accent-amber-500 cursor-pointer"
                />
                <span className="font-mono text-amber-400">{teleprompterSpeed}x</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Font:</span>
                <input
                  type="range"
                  min="18"
                  max="44"
                  value={teleprompterFontSize}
                  onChange={(e) => setTeleprompterFontSize(Number(e.target.value))}
                  className="w-20 accent-amber-500 cursor-pointer"
                />
                <span className="font-mono text-amber-400">{teleprompterFontSize}px</span>
              </div>

              <button
                onClick={() => setTeleprompterPlaying(!teleprompterPlaying)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  teleprompterPlaying ? 'bg-amber-500 text-black' : 'bg-[#161922] text-white border border-[#2a3144]'
                }`}
              >
                {teleprompterPlaying ? <Pause size={13} /> : <Play size={13} />}
                <span>{teleprompterPlaying ? 'Pause Scroll' : 'Autoscroll'}</span>
              </button>

              <button
                onClick={() => setShowTeleprompter(false)}
                className="p-1.5 rounded-lg bg-[#161922] text-slate-300 hover:text-white border border-[#2a3144]"
              >
                <Minimize2 size={16} />
              </button>
            </div>
          </div>

          {/* Teleprompter Scrollable Canvas */}
          <div
            ref={teleprompterRef}
            className="flex-1 overflow-y-auto px-8 py-16 flex flex-col items-center justify-start font-screenplay"
            style={{ fontSize: `${teleprompterFontSize}px` }}
          >
            <div className="max-w-3xl w-full text-center space-y-6">
              {currentScene.content.split('\n').map((line, i) => (
                <p key={i} className="leading-relaxed text-slate-100">
                  {line || ' '}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Embargo Time-Lock Dialog Modal */}
      {showLockModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0f1117] border border-[#2a3144] rounded-xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Lock size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Apply Spoiler & Embargo Time-Lock</h3>
                <p className="text-[11px] text-slate-400">Lock scene content behind an active countdown clock</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-medium">Embargo Duration (Hours):</label>
              <select
                value={lockHours}
                onChange={(e) => setLockHours(Number(e.target.value))}
                className="w-full bg-[#161922] border border-[#2a3144] rounded-lg p-2.5 text-xs text-white outline-none"
              >
                <option value={12}>12 Hours</option>
                <option value={24}>24 Hours (1 Day)</option>
                <option value={48}>48 Hours (2 Days)</option>
                <option value={72}>72 Hours (3 Days)</option>
                <option value={168}>1 Week</option>
              </select>
            </div>

            <p className="text-[11px] text-slate-400">
              The scene will unlock on: <strong className="text-amber-400 font-mono">{new Date(Date.now() + lockHours * 3600 * 1000).toLocaleString()}</strong>
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowLockModal(false)}
                className="px-3 py-1.5 rounded-lg bg-[#161922] text-slate-300 text-xs hover:bg-[#202534]"
              >
                Cancel
              </button>
              <button
                onClick={applyLock}
                className="px-4 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400"
              >
                Lock Scene
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
