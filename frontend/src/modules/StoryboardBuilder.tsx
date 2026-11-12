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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#101217] border border-white/5 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#151820] text-slate-400 border border-white/5">
            <Film size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">Storyboard sequence</h2>
            <p className="text-xs text-slate-400 mt-0.5">Shot-by-shot frame planning, camera direction, and animatic blocking</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Episode selector */}
          <select
            value={selectedEpisodeId}
            onChange={(e) => setSelectedEpisodeId(e.target.value)}
            className="bg-[#151820] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-white/20"
          >
            {state.episodes.map((ep) => (
              <option key={ep.id} value={ep.id}>
                E{ep.episode_number}: {ep.title}
              </option>
            ))}
          </select>

          <button
            onClick={onCreateFrame}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-medium text-xs transition-colors"
          >
            <Plus size={14} />
            <span>Add shot</span>
          </button>
        </div>
      </div>

      {/* Frame Sequence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {frames.map((frame, index) => (
          <div
            key={frame.id}
            className="bg-[#101217] rounded-xl overflow-hidden border border-white/5 hover:border-white/15 transition-colors flex flex-col justify-between"
          >
            {/* Visual Frame Image */}
            <div className="relative h-48 bg-[#0a0b0e] overflow-hidden group">
              <img
                src={frame.image_url}
                alt={`Shot #${frame.sequence_index}`}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
              />
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/80 px-2.5 py-1 rounded-md text-[11px] font-mono text-slate-200 border border-white/10 backdrop-blur-sm">
                <span className="font-medium">Shot {frame.sequence_index}</span>
                <span className="text-slate-400">• {frame.duration_seconds}s</span>
              </div>

              {/* Order buttons overlay */}
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/80 p-1 rounded-md border border-white/10 backdrop-blur-sm">
                <button
                  disabled={index === 0}
                  onClick={() => moveFrame(index, 'up')}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                  title="Move Up"
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  disabled={index === frames.length - 1}
                  onClick={() => moveFrame(index, 'down')}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                  title="Move Down"
                >
                  <ArrowDown size={13} />
                </button>
              </div>
            </div>

            {/* Frame Metadata Body */}
            <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2.5">
                {/* Camera Framing & Movement Badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-slate-300 border border-white/10">
                    {frame.camera_framing}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-slate-300 border border-white/10">
                    {frame.camera_movement}
                  </span>
                </div>

                {/* Paired Dialogue */}
                {frame.dialogue_text && (
                  <div className="p-2.5 rounded-lg bg-[#0a0b0e] border border-white/5">
                    <p className="text-[10px] font-medium text-slate-400 mb-1 flex items-center gap-1">
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
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-500 font-mono">SFX: {frame.sound_effects || 'Natural room tone'}</span>
                <button
                  onClick={() => onDeleteFrame(frame.id)}
                  className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                  title="Delete shot frame"
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
