import React, { useState, useRef } from 'react';
import {
  Radio,
  Play,
  Pause,
  Repeat,
  Volume2,
  Mic,
  Square,
  Share2,
  Plus,
  Trash2,
  Music,
  Wind,
  Zap,
  MessageSquare,
  RotateCcw,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { SoundboardClip, StudioDatabaseState } from '../types';
import { ApiService } from '../services/api';
import { useExplicitMachine } from '../machines/useExplicitMachine';
import {
  createAudioRecorderMachine,
  AudioRecorderState,
  AudioRecorderEvent,
  AudioRecorderContext,
} from '../machines/audioRecorderMachine';

interface SoundboardProps {
  state: StudioDatabaseState;
  onSaveClip: (clip: SoundboardClip) => void;
  onDeleteClip: (clipId: string) => void;
}

export const Soundboard: React.FC<SoundboardProps> = ({
  state,
  onSaveClip,
  onDeleteClip,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);

  // Live in-browser microphone foley recording
  const [foleyTitle, setFoleyTitle] = useState('');
  const [foleyCategory, setFoleyCategory] = useState<SoundboardClip['category']>('SFX');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Explicit Audio Recorder Machine
  const [recorderSnapshot, sendRecorder] = useExplicitMachine<
    AudioRecorderState,
    AudioRecorderEvent,
    AudioRecorderContext
  >(() => createAudioRecorderMachine('soundboard-foley'), []);

  // Audio elements map
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const categories: Array<{ id: string; label: string; icon: any }> = [
    { id: 'all', label: 'All Audio Banks', icon: Radio },
    { id: 'Dialogue', label: 'Dialogue Cuts', icon: MessageSquare },
    { id: 'Score', label: 'Soundtrack & Score', icon: Music },
    { id: 'SFX', label: 'Sound Effects (SFX)', icon: Zap },
    { id: 'Foley', label: 'Foley Actions', icon: Play },
    { id: 'Ambient', label: 'Ambient Atmospheres', icon: Wind },
  ];

  const filteredClips = state.soundboard_clips.filter((clip) => {
    if (selectedCategory !== 'all' && clip.category !== selectedCategory) return false;
    return true;
  });

  const togglePlayClip = (clip: SoundboardClip) => {
    const audio = audioRefs.current[clip.id];
    if (!audio) return;

    if (playingClipId === clip.id) {
      audio.pause();
      audio.currentTime = 0;
      setPlayingClipId(null);
    } else {
      // Pause any currently playing
      Object.values(audioRefs.current).forEach((a) => {
        a.pause();
        a.currentTime = 0;
      });
      audio.volume = clip.volume;
      audio.loop = clip.is_looping;
      audio.play();
      setPlayingClipId(clip.id);

      audio.onended = () => {
        if (!clip.is_looping) setPlayingClipId(null);
      };
    }
  };

  // Live recording handlers powered by explicit state machine
  const startRecordingFoley = async () => {
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
        sendRecorder({ type: 'STOP_RECORD', blob: audioBlob, audioUrl: url, duration: 5.0 });
      };

      recorder.start();
      sendRecorder({ type: 'MIC_GRANTED', stream });
    } catch (e: any) {
      sendRecorder({
        type: 'MIC_DENIED',
        error: e?.message || 'Microphone recording unavailable or denied in browser',
      });
    }
  };

  const stopRecordingFoley = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const commitSaveFoley = () => {
    if (!recorderSnapshot.context.audioUrl) return;

    const newClip: SoundboardClip = {
      id: `snd_${Date.now()}`,
      project_id: state.projects[0]?.id || 'proj_nebula_01',
      title: foleyTitle.trim() || `Live ${foleyCategory} #${state.soundboard_clips.length + 1}`,
      category: foleyCategory,
      audio_url: recorderSnapshot.context.audioUrl,
      duration_seconds: recorderSnapshot.context.durationSeconds || 5.0,
      waveform_points: [15, 30, 75, 90, 60, 40, 20],
      is_looping: false,
      volume: 0.9,
      created_at: new Date().toISOString(),
    };

    onSaveClip(newClip);
    setFoleyTitle('');
    sendRecorder({ type: 'COMMIT_SAVE' });
  };

  // Send soundboard clip to chat
  const shareToChat = async (clip: SoundboardClip) => {
    const chatMsg = {
      id: `msg_${Date.now()}`,
      project_id: clip.project_id,
      channel_id: 'sound',
      sender_id: state.team_members[0]?.id || 'user_tyler',
      sender_name: state.team_members[0]?.name || 'Tyler Vance',
      sender_avatar: state.team_members[0]?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
      content: `Dispatched soundboard audio drop: ${clip.title}`,
      message_type: 'soundboard_clip' as const,
      soundboard_clip_data: {
        clipId: clip.id,
        title: clip.title,
        category: clip.category,
        audioUrl: clip.audio_url,
      },
      is_starred: false,
      read_by: [],
      created_at: new Date().toISOString(),
    };

    await ApiService.postChatMessage(chatMsg);
    alert(`Clip "${clip.title}" dispatched to #sound-foley chat channel!`);
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f1117] border border-[#1e2330] p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Radio size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">Show Soundboard & Foley Vault</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#161922] text-amber-400 border border-[#2a3144]">
                Recorder: {recorderSnapshot.state}
              </span>
            </div>
            <p className="text-xs text-slate-400">Live studio audio banks, instant chat dispatch & live microphone foley recorder</p>
          </div>
        </div>
      </div>

      {/* Live In-Studio Foley Recording Bar (Explicit FSM Powered) */}
      <div className="studio-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#12151e] to-[#0f1117]">
        <div>
          <h3 className="text-xs font-bold text-white">Record Foley or Custom Soundbite Live</h3>
          <p className="text-[11px] text-slate-400">Capture mic audio with state-machine safety and pre-save preview</p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {recorderSnapshot.state === 'IDLE' && (
            <>
              <input
                type="text"
                placeholder="Sound label (e.g. Laser Impact)..."
                value={foleyTitle}
                onChange={(e) => setFoleyTitle(e.target.value)}
                className="bg-[#161922] border border-[#2a3144] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none w-44"
              />
              <select
                value={foleyCategory}
                onChange={(e) => setFoleyCategory(e.target.value as any)}
                className="bg-[#161922] border border-[#2a3144] rounded-lg px-2 py-1.5 text-xs text-white outline-none"
              >
                <option value="SFX">SFX</option>
                <option value="Dialogue">Dialogue</option>
                <option value="Foley">Foley</option>
                <option value="Ambient">Ambient</option>
                <option value="Score">Score</option>
              </select>
              <button
                onClick={startRecordingFoley}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs"
              >
                <Mic size={13} />
                <span>Record Live Foley</span>
              </button>
            </>
          )}

          {recorderSnapshot.state === 'REQUESTING_MIC' && (
            <span className="text-xs text-amber-400 font-mono animate-pulse">Requesting microphone access...</span>
          )}

          {recorderSnapshot.state === 'RECORDING' && (
            <button
              onClick={stopRecordingFoley}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-500 text-white font-bold text-xs animate-pulse"
            >
              <Square size={13} />
              <span>Stop & Review Foley Take</span>
            </button>
          )}

          {recorderSnapshot.state === 'REVIEWING' && (
            <div className="flex items-center gap-2 bg-[#161922] p-1.5 rounded-lg border border-[#2a3144]">
              {recorderSnapshot.context.audioUrl && (
                <audio src={recorderSnapshot.context.audioUrl} controls className="h-6 w-36" />
              )}
              <button
                onClick={commitSaveFoley}
                className="flex items-center gap-1 px-3 py-1 rounded bg-amber-500 text-black text-xs font-bold hover:bg-amber-400"
              >
                <Check size={12} />
                <span>Save to {foleyCategory}</span>
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
            <div className="flex items-center gap-2 text-xs text-red-400">
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

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 border ${
                selectedCategory === c.id
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                  : 'bg-[#0f1117] border-[#1e2330] text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon size={13} />
              <span>{c.label}</span>
            </button>
          );
        })}
      </div>

      {/* Soundboard Clips Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClips.map((clip) => {
          const isPlaying = playingClipId === clip.id;

          return (
            <div
              key={clip.id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                isPlaying
                  ? 'bg-[#141824] border-amber-500/60 shadow-lg'
                  : 'bg-[#0f1117] border-[#1e2330] hover:border-[#2a3144]'
              }`}
            >
              {/* Hidden audio element */}
              <audio
                ref={(el) => {
                  if (el) audioRefs.current[clip.id] = el;
                }}
                src={clip.audio_url}
              />

              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-white leading-snug">{clip.title}</h4>
                    <span className="text-[10px] font-mono text-amber-400">{clip.category} Bank</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161922] text-slate-400 border border-[#2a3144]">
                    {clip.duration_seconds}s
                  </span>
                </div>

                {/* Simulated Waveform Visualizer */}
                <div className="h-10 rounded-lg bg-[#0b0d13] border border-[#1e2330] px-3 flex items-center justify-between gap-1">
                  {clip.waveform_points.map((pt, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-full transition-all duration-200 ${
                        isPlaying ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'
                      }`}
                      style={{ height: `${isPlaying ? Math.min(100, pt * 1.2) : pt}%` }}
                    />
                  ))}
                </div>
              </div>

              {/* Controls Bar */}
              <div className="pt-3 mt-3 border-t border-[#1e2330] flex items-center justify-between text-xs">
                <button
                  onClick={() => togglePlayClip(clip)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                    isPlaying
                      ? 'bg-amber-500 text-black'
                      : 'bg-[#161922] text-slate-200 hover:text-white border border-[#2a3144]'
                  }`}
                >
                  {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                  <span>{isPlaying ? 'Stop' : 'Play Clip'}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {/* Share to Chat button */}
                  <button
                    onClick={() => shareToChat(clip)}
                    className="p-1.5 rounded-md bg-[#161922] hover:bg-[#202534] border border-[#2a3144] text-slate-300 hover:text-amber-400"
                    title="Share directly to #sound chat channel"
                  >
                    <Share2 size={13} />
                  </button>

                  {/* Loop toggle */}
                  <button
                    onClick={() => onSaveClip({ ...clip, is_looping: !clip.is_looping })}
                    className={`p-1.5 rounded-md border ${
                      clip.is_looping
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        : 'bg-[#161922] text-slate-400 border-[#2a3144]'
                    }`}
                    title="Toggle Loop"
                  >
                    <Repeat size={13} />
                  </button>

                  <button
                    onClick={() => onDeleteClip(clip.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400"
                    title="Delete Clip"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
