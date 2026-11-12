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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#0f1117] border border-[#1e2330] rounded-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToEditor}
            className="p-2 rounded-lg bg-[#161922] hover:bg-[#202534] text-slate-300 hover:text-white border border-[#2a3144]"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Script Analytics & Screen-Time Metrics</h2>
            <p className="text-xs text-slate-400">Dialogue frequency, character speaking share & script pacing distribution</p>
          </div>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="studio-card p-4">
          <p className="text-[11px] text-slate-400 font-medium">Estimated Script Pages</p>
          <p className="text-2xl font-black text-amber-400 mt-1">{analytics.totalPages.toFixed(1)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">~{Math.round(analytics.totalPages * 1.0)} screen minutes</p>
        </div>
        <div className="studio-card p-4">
          <p className="text-[11px] text-slate-400 font-medium">Total Word Count</p>
          <p className="text-2xl font-black text-white mt-1">{analytics.totalWords.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Across {analytics.totalScenes} scenes</p>
        </div>
        <div className="studio-card p-4">
          <p className="text-[11px] text-slate-400 font-medium">Dialogue Exchanges</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{analytics.totalDialogueLines}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Spoken line blocks</p>
        </div>
        <div className="studio-card p-4">
          <p className="text-[11px] text-slate-400 font-medium">Active Speaking Cast</p>
          <p className="text-2xl font-black text-sky-400 mt-1">{analytics.characterRanks.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Identified speakers</p>
        </div>
      </div>

      {/* Speaking Share Distribution Table */}
      <div className="studio-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">Cast Screen-Time & Line Share</h3>
          <span className="text-[10px] text-slate-400 font-mono">Relative Dialogue %</span>
        </div>

        <div className="space-y-4">
          {analytics.characterRanks.map((char) => (
            <div key={char.name} className="p-3 rounded-lg bg-[#0b0d13] border border-[#1e2330]">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-200">{char.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400">
                    {char.lines} lines • {char.words} words • {char.scenesCount} scenes
                  </span>
                  <span className="font-mono font-bold text-amber-400">{char.percentage}%</span>
                </div>
              </div>
              <div className="w-full h-2 rounded-full bg-[#161922] overflow-hidden">
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
