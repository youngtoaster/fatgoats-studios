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
  RotateCcw,
  AlertTriangle,
  Info,
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
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('preview');

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
        error: e?.message || 'Microphone access denied or unavailable in this environment',
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

  // Fountain Screenplay Parser
  const parseFountain = (raw: string) => {
    const lines = raw.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      if (!trimmed) {
        return <div key={idx} className="h-4" />;
      }

      if (/^(EXT\.|INT\.|I\/E\.|INT\/EXT\.|EST\.)/i.test(trimmed)) {
        return (
          <div
            key={idx}
            className="font-bold text-amber-400 tracking-wider text-sm mt-6 mb-2 uppercase border-b border-amber-500/20 pb-1 font-screenplay"
          >
            {trimmed}
          </div>
        );
      }

      if (/^(CUT TO:|FADE OUT\.|FADE IN:|DISSOLVE TO:|MATCH CUT TO:)/i.test(trimmed) || trimmed.endsWith('TO:')) {
        return (
          <div key={idx} className="text-right text-slate-400 text-xs font-semibold my-4 tracking-widest uppercase font-screenplay">
            {trimmed}
          </div>
        );
      }

      if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        return (
          <div key={idx} className="text-center text-slate-400 italic text-xs my-0.5 max-w-sm mx-auto font-screenplay">
            {trimmed}
          </div>
        );
      }

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
            className="text-center text-amber-300 font-bold tracking-widest text-xs mt-4 mb-1 uppercase font-screenplay"
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

      if (isPrevCue || isPrevParen) {
        return (
          <div key={idx} className="text-center text-slate-100 text-xs leading-relaxed max-w-md mx-auto mb-2 font-screenplay">
            {trimmed}
          </div>
        );
      }

      return (
        <div key={idx} className="text-left text-slate-300 text-xs leading-relaxed my-2 max-w-2xl font-screenplay">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f1117] border border-[#1e2330] p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <FileText size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">Fountain Screenplay Suite</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#161922] text-amber-400 border border-[#2a3144]">
                FSM: {embargoSnapshot.state}
              </span>
            </div>
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
            onClick={() => sendTele({ type: 'OPEN' })}
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
          {isSceneLocked ? (
            <button
              onClick={removeLock}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold hover:bg-amber-500/30 transition-colors"
            >
              <Unlock size={13} />
              <span>Unlock Scene ({formatCountdown(embargoSnapshot.context.remainingMs)})</span>
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
                      const isLockedItem = Boolean(s.locked_until && new Date(s.locked_until).getTime() > Date.now());
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
              {/* Scene Slug & Header Bar */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1e2330]">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono">{currentScene.slugline}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Scene #{currentScene.scene_number} • Est. Length: {currentScene.page_length} pages • {currentScene.time_of_day}
                  </p>
                </div>
                {isSceneLocked && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/40 border border-amber-500/40 text-amber-400 text-xs font-mono font-bold animate-pulse">
                    <Lock size={12} />
                    <span>EMBARGO COUNTDOWN: {formatCountdown(embargoSnapshot.context.remainingMs)}</span>
                  </div>
                )}
              </div>

              {/* Embargo Overlay if locked */}
              {isSceneLocked ? (
                <div className="p-8 my-8 text-center rounded-xl bg-[#0b0d13] border border-amber-500/30 space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                    <Lock size={32} className="text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Confidential Production Embargo Active</h4>
                    <p className="text-xs text-slate-300 max-w-md mx-auto mt-1">
                      This scene is guarded by an explicit state machine countdown to prevent production leaks before the scheduled table read.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-[#161922] max-w-sm mx-auto border border-[#2a3144] space-y-2">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Countdown to Autonomous Unlock</p>
                    <p className="text-2xl font-mono font-bold text-amber-400 tracking-wider">
                      {formatCountdown(embargoSnapshot.context.remainingMs)}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Target: {new Date(currentScene.locked_until!).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={removeLock}
                    className="px-5 py-2 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
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
                  className="w-full h-[450px] bg-[#0b0d13] border border-[#1e2330] rounded-lg p-4 font-screenplay text-xs text-slate-200 outline-none focus:border-amber-500/50 resize-y leading-relaxed font-mono"
                />
              ) : (
                /* Hollywood Screenplay Standard Formatted Render */
                <div className="p-6 bg-[#0b0d13] border border-[#1e2330] rounded-lg min-h-[450px] overflow-y-auto max-h-[500px]">
                  {parseFountain(currentScene.content)}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500 text-xs">No scene selected.</div>
          )}

          {/* Bottom Bar: In-Scene Voice Memo Controls */}
          {currentScene && !isSceneLocked && (
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

              {/* Explicit Audio Recorder State Machine UI */}
              <div className="flex items-center gap-2">
                {audioSnapshot.state === 'IDLE' && (
                  <button
                    onClick={handleStartRecording}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161922] hover:bg-[#202534] border border-[#2a3144] text-slate-200 font-medium transition-colors"
                  >
                    <Mic size={13} className="text-amber-400" />
                    <span>Record Voice Memo</span>
                  </button>
                )}

                {audioSnapshot.state === 'REQUESTING_MIC' && (
                  <span className="text-xs text-amber-400 animate-pulse flex items-center gap-1.5">
                    <Mic size={13} /> Requesting mic permissions...
                  </span>
                )}

                {audioSnapshot.state === 'RECORDING' && (
                  <button
                    onClick={handleStopRecording}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white font-bold animate-pulse"
                  >
                    <Square size={13} />
                    <span>Stop Recording</span>
                  </button>
                )}

                {audioSnapshot.state === 'REVIEWING' && (
                  <div className="flex items-center gap-2 bg-[#161922] p-1.5 rounded-lg border border-[#2a3144]">
                    {audioSnapshot.context.audioUrl && (
                      <audio src={audioSnapshot.context.audioUrl} controls className="h-6 w-36" />
                    )}
                    <button
                      onClick={handleSaveRecordedMemo}
                      className="px-2.5 py-1 rounded bg-amber-500 text-black text-xs font-bold hover:bg-amber-400"
                    >
                      Attach Memo
                    </button>
                    <button
                      onClick={() => sendAudio({ type: 'DISCARD' })}
                      className="p-1 rounded text-slate-400 hover:text-red-400"
                      title="Discard take"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}

                {audioSnapshot.state === 'SAVING' && (
                  <span className="text-xs text-amber-400 font-mono">Attaching memo...</span>
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

      {/* Teleprompter / Fullscreen Script Reader Modal (Explicit FSM Powered) */}
      {teleSnapshot.state !== 'CLOSED' && currentScene && (
        <div className="fixed inset-0 z-50 bg-[#08090e] text-white flex flex-col">
          {/* Teleprompter Controls Header */}
          <div className="h-14 border-b border-[#1e2330] bg-[#0f1117] px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold text-amber-400 uppercase">
                TELEPROMPTER REHEARSAL MODE
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#161922] text-slate-300 border border-[#2a3144]">
                STATE: {teleSnapshot.state}
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
                <span className="font-mono text-amber-400">{teleSnapshot.context.speed}x</span>
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
                <span className="font-mono text-amber-400">{teleSnapshot.context.fontSize}px</span>
              </div>

              {teleSnapshot.state === 'READY' && (
                <button
                  onClick={() => sendTele({ type: 'CUE_COUNTDOWN' })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-black font-bold hover:bg-amber-400"
                >
                  <Play size={13} />
                  <span>Start Cue</span>
                </button>
              )}

              {teleSnapshot.state === 'AUTOSCROLLING' && (
                <button
                  onClick={() => sendTele({ type: 'PAUSE' })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-black font-bold"
                >
                  <Pause size={13} />
                  <span>Pause</span>
                </button>
              )}

              {teleSnapshot.state === 'PAUSED' && (
                <button
                  onClick={() => sendTele({ type: 'RESUME' })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-black font-bold"
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
                className="p-1.5 rounded-lg bg-[#161922] text-slate-300 hover:text-white border border-[#2a3144]"
                title="Rewind to Top"
              >
                <RotateCcw size={14} />
              </button>

              <button
                onClick={() => sendTele({ type: 'CLOSE' })}
                className="p-1.5 rounded-lg bg-[#161922] text-slate-300 hover:text-white border border-[#2a3144]"
                title="Exit Fullscreen"
              >
                <Minimize2 size={16} />
              </button>
            </div>
          </div>

          {/* Lead-in 3..2..1 Countdown Overlay */}
          {teleSnapshot.state === 'COUNTDOWN' && (
            <div className="absolute inset-0 z-10 bg-black/85 flex flex-col items-center justify-center space-y-4">
              <span className="text-xs uppercase tracking-widest text-slate-400 font-mono">
                Rehearsal Autoscroll in
              </span>
              <span className="text-8xl font-mono font-bold text-amber-400 animate-ping">
                {teleSnapshot.context.countdownValue}
              </span>
              <button
                onClick={() => sendTele({ type: 'CLOSE' })}
                className="mt-6 px-4 py-2 rounded-lg bg-[#161922] border border-[#2a3144] text-xs text-slate-300 hover:text-white"
              >
                Cancel Countdown
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
