import React, { useState } from 'react';
import {
  Film,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Video,
  Move,
  MessageSquare,
  Sparkles,
  Layers,
} from 'lucide-react';
import { StoryboardFrame, Episode, Scene, StudioDatabaseState } from '../types';

interface StoryboardBuilderProps {
  state: StudioDatabaseState;
  onSaveFrame: (frame: StoryboardFrame) => void;
  onDeleteFrame: (frameId: string) => void;
  onCreateFrame: () => void;
}

export const StoryboardBuilder: React.FC<StoryboardBuilderProps> = ({
  state,
  onSaveFrame,
  onDeleteFrame,
  onCreateFrame,
}) => {
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string>(state.episodes[0]?.id || '');
  const [editingFrame, setEditingFrame] = useState<StoryboardFrame | null>(null);

  const frames = state.storyboard_frames
    .filter((f) => f.episode_id === selectedEpisodeId)
    .sort((a, b) => a.sequence_index - b.sequence_index);

  const moveFrame = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= frames.length) return;

    const frameA = frames[index];
    const frameB = frames[targetIndex];

    onSaveFrame({ ...frameA, sequence_index: frameB.sequence_index });
    onSaveFrame({ ...frameB, sequence_index: frameA.sequence_index });
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f1117] border border-[#1e2330] p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Film size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Storyboard Sequence Builder</h2>
            <p className="text-xs text-slate-400">Cinematic shot-by-shot frame planning, camera direction & animatic blocking</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Episode selector */}
          <select
            value={selectedEpisodeId}
            onChange={(e) => setSelectedEpisodeId(e.target.value)}
            className="bg-[#161922] border border-[#2a3144] rounded-lg px-3 py-1.5 text-xs text-white outline-none"
          >
            {state.episodes.map((ep) => (
              <option key={ep.id} value={ep.id}>
                E{ep.episode_number}: {ep.title}
              </option>
            ))}
          </select>

          <button
            onClick={onCreateFrame}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs transition-colors"
          >
            <Plus size={14} />
            <span>Add Shot Frame</span>
          </button>
        </div>
      </div>

      {/* Frame Sequence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {frames.map((frame, index) => (
          <div
            key={frame.id}
            className="studio-card overflow-hidden border border-[#1e2330] hover:border-amber-500/40 transition-all flex flex-col justify-between"
          >
            {/* Visual Frame Image */}
            <div className="relative h-48 bg-[#0b0d13] overflow-hidden group">
              <img
                src={frame.image_url}
                alt={`Shot #${frame.sequence_index}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/80 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold text-amber-400 border border-amber-500/30 backdrop-blur-sm">
                <span>SHOT #{frame.sequence_index}</span>
                <span className="text-slate-400">• {frame.duration_seconds}s</span>
              </div>

              {/* Order buttons overlay */}
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/80 p-1 rounded-md border border-[#2a3144] backdrop-blur-sm">
                <button
                  disabled={index === 0}
                  onClick={() => moveFrame(index, 'up')}
                  className="p-1 text-slate-300 hover:text-white disabled:opacity-30"
                  title="Move Up"
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  disabled={index === frames.length - 1}
                  onClick={() => moveFrame(index, 'down')}
                  className="p-1 text-slate-300 hover:text-white disabled:opacity-30"
                  title="Move Down"
                >
                  <ArrowDown size={13} />
                </button>
              </div>
            </div>

            {/* Frame Metadata Body */}
            <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                {/* Camera Framing & Movement Badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {frame.camera_framing}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    {frame.camera_movement}
                  </span>
                </div>

                {/* Paired Dialogue */}
                {frame.dialogue_text && (
                  <div className="p-2.5 rounded-lg bg-[#0b0d13] border border-[#1e2330]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5 flex items-center gap-1">
                      <MessageSquare size={11} className="text-amber-400" />
                      <span>Dialogue</span>
                    </p>
                    <p className="text-xs text-slate-200 font-screenplay">{frame.dialogue_text}</p>
                  </div>
                )}

                {/* Director Notes */}
                <p className="text-xs text-slate-400 leading-relaxed">{frame.director_notes}</p>
              </div>

              {/* Bottom Actions */}
              <div className="pt-2 border-t border-[#1e2330] flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-500 font-mono">SFX: {frame.sound_effects || 'Natural Room Tone'}</span>
                <button
                  onClick={() => onDeleteFrame(frame.id)}
                  className="text-slate-500 hover:text-red-400 p-1"
                  title="Delete Shot Frame"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
