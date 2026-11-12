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
  ChevronRight,
  Plus,
  Trash2,
  Clock,
  BarChart2,
  Maximize2,
  Minimize2,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { Episode, Scene, Character, Project } from '../types';
import { useExplicitMachine } from '../machines/useExplicitMachine';
import {
  createEmbargoMachine,
  EmbargoState,
  EmbargoEvent,
  EmbargoContext,
} from '../machines/embargoMachine';
import {
  createTeleprompterMachine,
  TeleprompterState,
  TeleprompterEvent,
  TeleprompterContext,
} from '../machines/teleprompterMachine';
import {
  createAudioRecorderMachine,
  AudioRecorderState,
  AudioRecorderEvent,
  AudioRecorderContext,
} from '../machines/audioRecorderMachine';

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
  const [activeTab, setActiveTab] = useState<'preview' | 'editor'>('preview');

  // Time-lock embargo modal state
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockHours, setLockHours] = useState(24);

  // Audio recording stream ref for native media
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const teleprompterRef = useRef<HTMLDivElement>(null);

  const currentScene = scenes.find((s) => s.id === selectedSceneId) || scenes[0];

  // 1. Explicit Machine: Scene Embargo State Machine
  const [embargoSnapshot, sendEmbargo] = useExplicitMachine<
    EmbargoState,
    EmbargoEvent,
    EmbargoContext
  >(
    () => createEmbargoMachine(currentScene?.locked_until || null),
    [currentScene?.id, currentScene?.locked_until]
  );

  // 2. Explicit Machine: Teleprompter Rehearsal Reader Machine
  const [teleSnapshot, sendTele] = useExplicitMachine<
    TeleprompterState,
    TeleprompterEvent,
    TeleprompterContext
  >(
    () => createTeleprompterMachine(),
    [currentScene?.id]
  );

  // 3. Explicit Machine: Audio / Foley Recorder Machine
  const [audioSnapshot, sendAudio] = useExplicitMachine<
    AudioRecorderState,
    AudioRecorderEvent,
    AudioRecorderContext
  >(
    () => createAudioRecorderMachine(`scene-memo-${currentScene?.id}`),
    [currentScene?.id]
  );

  // Embargo Tick effect: update remaining countdown
  useEffect(() => {
    if (embargoSnapshot.state !== 'LOCKED_COUNTDOWN') return;
    const interval = setInterval(() => {
      sendEmbargo({ type: 'TICK' });
    }, 1000);
    return () => clearInterval(interval);
  }, [embargoSnapshot.state, sendEmbargo]);

  // Teleprompter 3..2..1 Lead-in countdown effect
  useEffect(() => {
    if (teleSnapshot.state !== 'COUNTDOWN') return;
    const interval = setInterval(() => {
      if (teleSnapshot.context.countdownValue > 1) {
        sendTele({ type: 'COUNTDOWN_TICK' });
      } else {
        sendTele({ type: 'ENGAGE_SCROLL' });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [teleSnapshot.state, teleSnapshot.context.countdownValue, sendTele]);

  // Teleprompter Autoscroll effect
  useEffect(() => {
    if (teleSnapshot.state !== 'AUTOSCROLLING') return;
    const interval = setInterval(() => {
      if (teleprompterRef.current) {
        teleprompterRef.current.scrollTop += teleSnapshot.context.speed;

        // Detect completion at scroll end
        const isAtBottom =
          teleprompterRef.current.scrollHeight - teleprompterRef.current.scrollTop <=
          teleprompterRef.current.clientHeight + 5;
        if (isAtBottom) {
          sendTele({ type: 'REACH_END' });
        }
      }
    }, 30);
    return () => clearInterval(interval);
  }, [teleSnapshot.state, teleSnapshot.context.speed, sendTele]);

  // Audio Recorder Native MediaRecorder orchestration
  const handleStartRecording = async () => {
    sendAudio({ type: 'START_RECORD' });
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
        sendAudio({ type: 'STOP_RECORD', blob: audioBlob, audioUrl: url, duration: 10 });
      };

      recorder.start();
      sendAudio({ type: 'MIC_GRANTED', stream });
    } catch (e: any) {
      sendAudio({
        type: 'MIC_DENIED',
        error: e?.message || 'Microphone access denied or unavailable',
      });
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const handleSaveRecordedMemo = () => {
    if (!currentScene || !audioSnapshot.context.audioUrl) return;
    onSaveScene({
      ...currentScene,
      voice_memo_url: audioSnapshot.context.audioUrl,
      voice_memo_duration: audioSnapshot.context.durationSeconds || 10,
    });
    sendAudio({ type: 'COMMIT_SAVE' });
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
    sendEmbargo({ type: 'APPLY_EMBARGO', lockedUntil: unlockDate });
    setShowLockModal(false);
  };

  const removeLock = () => {
    if (!currentScene) return;
    onSaveScene({
      ...currentScene,
      locked_until: null,
      is_spoiler: false,
    });
    sendEmbargo({ type: 'REMOVE_LOCK' });
  };

  const isSceneLocked =
    embargoSnapshot.state === 'LOCKED_COUNTDOWN' &&
    embargoSnapshot.context.remainingMs > 0;

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

  // Fountain Screenplay Parser (Hollywood Industry Standard)
  const parseFountain = (raw: string) => {
    const lines = raw.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      if (!trimmed) {
        return <div key={idx} className="h-4" />;
      }

      // Scene heading
      if (/^(EXT\.|INT\.|I\/E\.|INT\/EXT\.|EST\.)/i.test(trimmed)) {
        return (
          <div
            key={idx}
            className="font-mono font-medium text-amber-400 text-xs mt-6 mb-2 border-b border-[rgba(255,255,255,0.06)] pb-1"
          >
            {trimmed}
          </div>
        );
      }

      // Transition
      if (/^(CUT TO:|FADE OUT\.|FADE IN:|DISSOLVE TO:|MATCH CUT TO:)/i.test(trimmed) || trimmed.endsWith('TO:')) {
        return (
          <div key={idx} className="text-right text-slate-400 text-xs my-3 font-mono">
            {trimmed}
          </div>
        );
      }

      // Parenthetical
      if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        return (
          <div key={idx} className="text-center text-slate-400 italic text-xs my-0.5 max-w-sm mx-auto font-mono">
            {trimmed}
          </div>
        );
      }

      // Character Cue
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
            className="text-center text-slate-200 font-medium text-xs mt-4 mb-1 font-mono"
          >
            {trimmed}
          </div>
        );
      }

      const prevLine = idx > 0 ? lines[idx - 1].trim() : '';
      const isPrevCue =
        prevLine === prevLine.toUpperCase() &&
        prevLine.length > 1 &&
        prevLine.length < 35 &&
        !prevLine.startsWith('EXT.') &&
        !prevLine.startsWith('INT.');
      const isPrevParen = prevLine.startsWith('(') && prevLine.endsWith(')');

      // Dialogue block
      if (isPrevCue || isPrevParen) {
        return (
          <div key={idx} className="text-center text-slate-100 text-xs leading-relaxed max-w-md mx-auto mb-2 font-mono">
            {trimmed}
          </div>
        );
      }

      // Action / narrative block
      return (
        <div key={idx} className="text-left text-slate-300 text-xs leading-relaxed my-2 max-w-2xl font-mono">
          {trimmed}
        </div>
      );
    });
  };

  const formatCountdown = (ms: number) => {
    if (ms <= 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Mode Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 studio-card p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#151820] text-slate-300 border border-[rgba(255,255,255,0.07)]">
            <FileText size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium text-white tracking-tight">Screenplay editor</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-[#151820] border border-[rgba(255,255,255,0.06)]">
                FSM: {embargoSnapshot.state}
              </span>
            </div>
            <p className="text-xs text-slate-400">Fountain script formatting with cast continuity auto-detection</p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Editor / Preview Switcher */}
          <div className="flex bg-[#0a0b0e] p-0.5 rounded-lg border border-[rgba(255,255,255,0.07)] text-xs">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'preview' ? 'bg-[#1a1e28] text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Formatted script
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'editor' ? 'bg-[#1a1e28] text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Fountain markdown
            </button>
          </div>

          {/* Teleprompter / Rehearsal Reader */}
          <button
            onClick={() => sendTele({ type: 'OPEN' })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151820] hover:bg-[#1e222d] border border-[rgba(255,255,255,0.08)] text-xs font-medium text-slate-200 transition-colors"
            title="Open Teleprompter / Rehearsal Reader"
          >
            <Maximize2 size={13} className="text-slate-400" />
            <span>Teleprompter</span>
          </button>

          {/* Script Analytics */}
          {onOpenAnalytics && (
            <button
              onClick={onOpenAnalytics}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151820] hover:bg-[#1e222d] border border-[rgba(255,255,255,0.08)] text-xs font-medium text-slate-200 transition-colors"
            >
              <BarChart2 size={13} className="text-slate-400" />
              <span>Analytics</span>
            </button>
          )}

          {/* Embargo Action */}
          {isSceneLocked ? (
            <button
              onClick={removeLock}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium hover:bg-amber-500/20 transition-colors"
            >
              <Unlock size={13} />
              <span>Unlock scene ({formatCountdown(embargoSnapshot.context.remainingMs)})</span>
            </button>
          ) : (
            <button
              onClick={() => setShowLockModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151820] hover:bg-[#1e222d] border border-[rgba(255,255,255,0.08)] text-xs font-medium text-slate-300 transition-colors"
            >
              <Clock size={13} className="text-slate-400" />
              <span>Embargo lock</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Screenplay Suite Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Column: Scene Hierarchy Navigator */}
        <div className="studio-card p-4 lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[rgba(255,255,255,0.06)]">
            <span className="text-xs font-medium text-slate-400">Scenes</span>
            <button
              onClick={() => onCreateScene(episodes[0]?.id || '')}
              className="p-1 rounded bg-[#151820] text-slate-300 hover:text-white border border-[rgba(255,255,255,0.08)] text-xs transition-colors"
              title="Add New Scene"
            >
              <Plus size={13} />
            </button>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {episodes.map((ep) => {
              const epScenes = scenes.filter((s) => s.episode_id === ep.id);
              return (
                <div key={ep.id} className="space-y-1">
                  <div className="flex items-center justify-between px-2 py-1 rounded bg-[#0a0b0e] text-[11px] font-medium text-slate-300">
                    <span className="truncate">E{ep.episode_number}: {ep.title}</span>
                    <span className="text-slate-500 font-mono">{epScenes.length}</span>
                  </div>
                  <div className="space-y-0.5 pl-1">
                    {epScenes.map((s) => {
                      const isSel = s.id === currentScene?.id;
                      const isLockedItem = Boolean(s.locked_until && new Date(s.locked_until).getTime() > Date.now());
                      return (
                        <button
                          key={s.id}
                          onClick={() => setSelectedSceneId(s.id)}
                          className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                            isSel
                              ? 'bg-[#1a1e28] text-white font-medium border-l-2 border-amber-500'
                              : 'hover:bg-[#151820] text-slate-300 border-l-2 border-transparent'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="truncate font-mono text-[11px]">#{s.scene_number} {s.slugline}</p>
                            <p className="text-[10px] text-slate-500 truncate">{s.location} • {s.page_length} pgs</p>
                          </div>
                          {isLockedItem && <Lock size={12} className="text-amber-400 shrink-0" />}
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
              {/* Scene Slug Header */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[rgba(255,255,255,0.06)]">
                <div>
                  <h3 className="text-sm font-medium text-white font-mono">{currentScene.slugline}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Scene #{currentScene.scene_number} • Est. length: {currentScene.page_length} pages • {currentScene.time_of_day}
                  </p>
                </div>
                {isSceneLocked && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-medium">
                    <Lock size={12} />
                    <span>Locked: {formatCountdown(embargoSnapshot.context.remainingMs)}</span>
                  </div>
                )}
              </div>

              {/* Embargo Overlay if locked */}
              {isSceneLocked ? (
                <div className="p-8 my-8 text-center rounded-xl bg-[#0a0b0e] border border-[rgba(255,255,255,0.07)] space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#151820] border border-[rgba(255,255,255,0.08)] flex items-center justify-center">
                    <Lock size={20} className="text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">Scene embargo active</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                      This scene is guarded by an explicit state machine countdown to prevent production leaks before the table read.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#151820] max-w-xs mx-auto border border-[rgba(255,255,255,0.07)] space-y-1">
                    <p className="text-[10px] text-slate-400 font-mono">Unlock countdown</p>
                    <p className="text-xl font-mono font-medium text-amber-400 tabular-nums">
                      {formatCountdown(embargoSnapshot.context.remainingMs)}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Target: {new Date(currentScene.locked_until!).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={removeLock}
                    className="px-4 py-1.5 rounded-lg bg-[#151820] hover:bg-[#1e222d] border border-[rgba(255,255,255,0.12)] text-white text-xs font-medium transition-colors"
                  >
                    Admin unlock
                  </button>
                </div>
              ) : activeTab === 'editor' ? (
                /* Fountain Textarea Editor */
                <textarea
                  value={currentScene.content}
                  onChange={(e) => onSaveScene({ ...currentScene, content: e.target.value })}
                  placeholder="Screenplay in Fountain format (EXT./INT., CHARACTER CUE, dialogue, CUT TO:)..."
                  className="w-full h-[450px] bg-[#0a0b0e] border border-[rgba(255,255,255,0.07)] rounded-lg p-4 font-screenplay text-xs text-slate-200 outline-none focus:border-amber-500/50 resize-y leading-relaxed font-mono"
                />
              ) : (
                /* Hollywood Screenplay Formatted Render */
                <div className="p-6 bg-[#0a0b0e] border border-[rgba(255,255,255,0.07)] rounded-lg min-h-[450px] overflow-y-auto max-h-[500px]">
                  {parseFountain(currentScene.content)}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500 text-xs">No scene selected.</div>
          )}

          {/* Bottom Bar: In-Scene Voice Memo Controls */}
          {currentScene && !isSceneLocked && (
            <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.06)] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Scene memo:</span>
                {currentScene.voice_memo_url ? (
                  <div className="flex items-center gap-2 bg-[#151820] px-2 py-1 rounded-md border border-[rgba(255,255,255,0.07)]">
                    <Volume2 size={13} className="text-amber-400" />
                    <audio src={currentScene.voice_memo_url} controls className="h-6 w-40" />
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-500">None attached</span>
                )}
              </div>

              {/* Audio Recorder UI */}
              <div className="flex items-center gap-2">
                {audioSnapshot.state === 'IDLE' && (
                  <button
                    onClick={handleStartRecording}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151820] hover:bg-[#1e222d] border border-[rgba(255,255,255,0.08)] text-slate-200 font-medium text-xs transition-colors"
                  >
                    <Mic size={13} className="text-slate-400" />
                    <span>Record memo</span>
                  </button>
                )}

                {audioSnapshot.state === 'REQUESTING_MIC' && (
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Mic size={13} /> Requesting microphone...
                  </span>
                )}

                {audioSnapshot.state === 'RECORDING' && (
                  <button
                    onClick={handleStopRecording}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151820] border border-red-500/40 text-red-400 font-medium text-xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <Square size={12} />
                    <span>Stop recording</span>
                  </button>
                )}

                {audioSnapshot.state === 'REVIEWING' && (
                  <div className="flex items-center gap-2 bg-[#151820] p-1.5 rounded-lg border border-[rgba(255,255,255,0.08)]">
                    {audioSnapshot.context.audioUrl && (
                      <audio src={audioSnapshot.context.audioUrl} controls className="h-6 w-32" />
                    )}
                    <button
                      onClick={handleSaveRecordedMemo}
                      className="px-2.5 py-1 rounded bg-amber-500 text-black text-xs font-medium hover:bg-amber-400"
                    >
                      Attach
                    </button>
                    <button
                      onClick={() => sendAudio({ type: 'DISCARD' })}
                      className="p-1 rounded text-slate-400 hover:text-white"
                      title="Discard take"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}

                {audioSnapshot.state === 'SAVING' && (
                  <span className="text-xs text-slate-400 font-mono">Attaching memo...</span>
                )}

                {audioSnapshot.state === 'ERROR' && (
                  <div className="flex items-center gap-1.5 text-xs text-red-400">
                    <AlertTriangle size={13} />
                    <span>{audioSnapshot.context.errorMessage || 'Audio error'}</span>
                    <button
                      onClick={() => sendAudio({ type: 'RESET' })}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <RotateCcw size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Character Continuity Scanner */}
        <div className="studio-card p-4 lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-1.5">
              <Users size={14} className="text-slate-400" />
              <span className="text-xs font-medium text-slate-300">
                Continuity scanner
              </span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#151820] text-slate-400 border border-[rgba(255,255,255,0.06)]">
              {detectedCharacters.length} linked
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-normal">
            Characters recognized in this scene's Fountain cues:
          </p>

          <div className="space-y-1.5">
            {detectedCharacters.length === 0 ? (
              <div className="p-4 rounded-lg bg-[#0a0b0e] text-center text-slate-500 text-xs">
                No registered characters recognized in this scene text.
              </div>
            ) : (
              detectedCharacters.map((char) => (
                <div
                  key={char.id}
                  className="p-2 rounded-lg bg-[#0a0b0e] border border-[rgba(255,255,255,0.06)] flex items-center justify-between hover:border-[rgba(255,255,255,0.12)] transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={char.avatar_url}
                      alt={char.name}
                      className="w-7 h-7 rounded-full object-cover border border-[rgba(255,255,255,0.10)]"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white truncate">{char.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{char.role}</p>
                    </div>
                  </div>
                  {onNavigateToCharacter && (
                    <button
                      onClick={() => onNavigateToCharacter(char.id)}
                      className="p-1 rounded text-slate-400 hover:text-white"
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

      {/* Teleprompter Rehearsal Modal */}
      {teleSnapshot.state !== 'CLOSED' && currentScene && (
        <div className="fixed inset-0 z-50 bg-[#0a0b0e] text-white flex flex-col">
          {/* Teleprompter Controls Header */}
          <div className="h-14 border-b border-[rgba(255,255,255,0.07)] bg-[#101217] px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-medium text-slate-300">
                Teleprompter rehearsal
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#151820] text-slate-400 border border-[rgba(255,255,255,0.06)]">
                {teleSnapshot.state}
              </span>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">• {currentScene.slugline}</span>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Speed:</span>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={teleSnapshot.context.speed}
                  onChange={(e) =>
                    sendTele({
                      type: 'SET_SPEED',
                      speed: Number(e.target.value),
                    })
                  }
                  className="w-20 accent-amber-500 cursor-pointer"
                />
                <span className="font-mono text-slate-300 tabular-nums">{teleSnapshot.context.speed}x</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Font:</span>
                <input
                  type="range"
                  min="18"
                  max="44"
                  value={teleSnapshot.context.fontSize}
                  onChange={(e) =>
                    sendTele({
                      type: 'SET_FONT_SIZE',
                      size: Number(e.target.value),
                    })
                  }
                  className="w-20 accent-amber-500 cursor-pointer"
                />
                <span className="font-mono text-slate-300 tabular-nums">{teleSnapshot.context.fontSize}px</span>
              </div>

              {teleSnapshot.state === 'READY' && (
                <button
                  onClick={() => sendTele({ type: 'CUE_COUNTDOWN' })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-black font-medium hover:bg-amber-400 transition-colors"
                >
                  <Play size={13} />
                  <span>Start cue</span>
                </button>
              )}

              {teleSnapshot.state === 'AUTOSCROLLING' && (
                <button
                  onClick={() => sendTele({ type: 'PAUSE' })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151820] border border-[rgba(255,255,255,0.12)] text-white font-medium"
                >
                  <Pause size={13} />
                  <span>Pause</span>
                </button>
              )}

              {teleSnapshot.state === 'PAUSED' && (
                <button
                  onClick={() => sendTele({ type: 'RESUME' })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-black font-medium hover:bg-amber-400"
                >
                  <Play size={13} />
                  <span>Resume</span>
                </button>
              )}

              <button
                onClick={() => {
                  if (teleprompterRef.current) teleprompterRef.current.scrollTop = 0;
                  sendTele({ type: 'RESET_TOP' });
                }}
                className="p-1.5 rounded-lg bg-[#151820] text-slate-300 hover:text-white border border-[rgba(255,255,255,0.08)]"
                title="Rewind to Top"
              >
                <RotateCcw size={14} />
              </button>

              <button
                onClick={() => sendTele({ type: 'CLOSE' })}
                className="p-1.5 rounded-lg bg-[#151820] text-slate-300 hover:text-white border border-[rgba(255,255,255,0.08)]"
                title="Exit Fullscreen"
              >
                <Minimize2 size={16} />
              </button>
            </div>
          </div>

          {/* Lead-in 3..2..1 Countdown Overlay */}
          {teleSnapshot.state === 'COUNTDOWN' && (
            <div className="absolute inset-0 z-10 bg-black/90 flex flex-col items-center justify-center space-y-4">
              <span className="text-xs tracking-wider text-slate-400 font-mono">
                Autoscroll starting in
              </span>
              <span className="text-7xl font-mono font-medium text-amber-400 tabular-nums">
                {teleSnapshot.context.countdownValue}
              </span>
              <button
                onClick={() => sendTele({ type: 'CLOSE' })}
                className="mt-4 px-4 py-1.5 rounded-lg bg-[#151820] border border-[rgba(255,255,255,0.10)] text-xs text-slate-300 hover:text-white"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Teleprompter Scrollable Canvas */}
          <div
            ref={teleprompterRef}
            className="flex-1 overflow-y-auto px-8 py-16 flex flex-col items-center justify-start font-screenplay"
            style={{ fontSize: `${teleSnapshot.context.fontSize}px` }}
          >
            <div className="max-w-3xl w-full text-center space-y-6">
              {currentScene.content.split('\n').map((line, i) => (
                <p key={i} className="leading-relaxed text-slate-100 font-screenplay">
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
          <div className="bg-[#101217] border border-[rgba(255,255,255,0.12)] rounded-xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[#151820] text-amber-400">
                <Lock size={16} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">Apply scene embargo lock</h3>
                <p className="text-[11px] text-slate-400">Lock scene content behind an active countdown clock</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-medium">Embargo duration (hours):</label>
              <select
                value={lockHours}
                onChange={(e) => setLockHours(Number(e.target.value))}
                className="w-full bg-[#151820] border border-[rgba(255,255,255,0.08)] rounded-lg p-2.5 text-xs text-white outline-none"
              >
                <option value={12}>12 Hours</option>
                <option value={24}>24 Hours (1 Day)</option>
                <option value={48}>48 Hours (2 Days)</option>
                <option value={72}>72 Hours (3 Days)</option>
                <option value={168}>1 Week</option>
              </select>
            </div>

            <p className="text-[11px] text-slate-400">
              The scene will unlock on: <strong className="text-slate-200 font-mono">{new Date(Date.now() + lockHours * 3600 * 1000).toLocaleString()}</strong>
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowLockModal(false)}
                className="px-3 py-1.5 rounded-lg bg-[#151820] text-slate-300 text-xs hover:bg-[#1e222d]"
              >
                Cancel
              </button>
              <button
                onClick={applyLock}
                className="px-4 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-medium hover:bg-amber-400"
              >
                Lock scene
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
