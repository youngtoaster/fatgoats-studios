import React from 'react';
import { BarChart3, PieChart, Clock, MessageSquare, FileText, ArrowLeft } from 'lucide-react';
import { Scene, Character } from '../types';

interface ScriptAnalyticsProps {
  scenes: Scene[];
  characters: Character[];
  onBackToEditor: () => void;
}

export const ScriptAnalytics: React.FC<ScriptAnalyticsProps> = ({
  scenes,
  characters,
  onBackToEditor,
}) => {
  // Aggregate character speaking counts and word counts
  const analytics = React.useMemo(() => {
    let totalDialogueLines = 0;
    let totalWords = 0;
    const charStats: Record<string, { lines: number; words: number; scenesCount: Set<string> }> = {};

    characters.forEach((c) => {
      charStats[c.name] = { lines: 0, words: 0, scenesCount: new Set() };
    });

    scenes.forEach((scene) => {
      const lines = scene.content.split('\n');
      totalWords += scene.content.split(/\s+/).filter(Boolean).length;

      let currentSpeaker: string | null = null;
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (
          trimmed === trimmed.toUpperCase() &&
          trimmed.length > 1 &&
          trimmed.length < 35 &&
          !trimmed.startsWith('EXT.') &&
          !trimmed.startsWith('INT.')
        ) {
          // Check if matches known character
          const matchedChar = characters.find(
            (c) =>
              trimmed.includes(c.name.toUpperCase()) ||
              trimmed.includes(c.name.split(' ')[0].toUpperCase()) ||
              trimmed.includes(c.name.split(' ').slice(-1)[0].toUpperCase())
          );
          currentSpeaker = matchedChar ? matchedChar.name : trimmed;
          if (!charStats[currentSpeaker]) {
            charStats[currentSpeaker] = { lines: 0, words: 0, scenesCount: new Set() };
          }
        } else if (currentSpeaker && trimmed && !trimmed.startsWith('(')) {
          charStats[currentSpeaker].lines += 1;
          charStats[currentSpeaker].words += trimmed.split(/\s+/).filter(Boolean).length;
          charStats[currentSpeaker].scenesCount.add(scene.id);
          totalDialogueLines += 1;
          currentSpeaker = null;
        }
      });
    });

    const characterRanks = Object.entries(charStats)
      .map(([name, stat]) => ({
        name,
        lines: stat.lines,
        words: stat.words,
        scenesCount: stat.scenesCount.size,
        percentage: totalDialogueLines > 0 ? Math.round((stat.lines / totalDialogueLines) * 100) : 0,
      }))
      .filter((c) => c.lines > 0)
      .sort((a, b) => b.lines - a.lines);

    return {
      totalWords,
      totalDialogueLines,
      totalScenes: scenes.length,
      totalPages: scenes.reduce((acc, s) => acc + s.page_length, 0),
      characterRanks,
    };
  }, [scenes, characters]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#101217] border border-white/5 rounded-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToEditor}
            className="p-2 rounded-lg bg-[#151820] hover:bg-[#1a1e28] text-slate-300 hover:text-white border border-white/10 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">Script analytics</h2>
            <p className="text-xs text-slate-400 mt-0.5">Dialogue frequency, character speaking share, and script pacing metrics</p>
          </div>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-[#101217] border border-white/5 rounded-xl p-4">
          <p className="text-[11px] text-slate-400 font-medium">Estimated script pages</p>
          <p className="text-2xl font-semibold text-white mt-1 tabular-nums">{analytics.totalPages.toFixed(1)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">~{Math.round(analytics.totalPages * 1.0)} screen minutes</p>
        </div>
        <div className="bg-[#101217] border border-white/5 rounded-xl p-4">
          <p className="text-[11px] text-slate-400 font-medium">Total word count</p>
          <p className="text-2xl font-semibold text-white mt-1 tabular-nums">{analytics.totalWords.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Across {analytics.totalScenes} scenes</p>
        </div>
        <div className="bg-[#101217] border border-white/5 rounded-xl p-4">
          <p className="text-[11px] text-slate-400 font-medium">Dialogue exchanges</p>
          <p className="text-2xl font-semibold text-white mt-1 tabular-nums">{analytics.totalDialogueLines}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Spoken line blocks</p>
        </div>
        <div className="bg-[#101217] border border-white/5 rounded-xl p-4">
          <p className="text-[11px] text-slate-400 font-medium">Active speaking cast</p>
          <p className="text-2xl font-semibold text-white mt-1 tabular-nums">{analytics.characterRanks.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Identified speakers</p>
        </div>
      </div>

      {/* Speaking Share Distribution Table */}
      <div className="bg-[#101217] border border-white/5 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <h3 className="text-xs font-medium text-slate-300">Cast line share</h3>
          <span className="text-[10px] text-slate-500 font-mono">Dialogue %</span>
        </div>

        <div className="space-y-2.5">
          {analytics.characterRanks.map((char) => (
            <div key={char.name} className="p-3 rounded-lg bg-[#0a0b0e] border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-200">{char.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400">
                    {char.lines} lines • {char.words} words • {char.scenesCount} scenes
                  </span>
                  <span className="font-mono text-xs font-medium text-amber-400 tabular-nums">{char.percentage}%</span>
                </div>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{ width: `${char.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
