import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Clock,
  AlertTriangle,
  Users,
  ChevronRight,
  Filter,
  Trash2,
} from 'lucide-react';
import { KanbanTask, StudioDatabaseState } from '../types';

interface KanbanBoardProps {
  state: StudioDatabaseState;
  onSaveTask: (task: KanbanTask) => void;
  onDeleteTask: (taskId: string) => void;
  onCreateTask: (columnId: KanbanTask['column_id']) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  state,
  onSaveTask,
  onDeleteTask,
  onCreateTask,
}) => {
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [selectedEpisode, setSelectedEpisode] = useState<string>('all');

  const columns: Array<{ id: KanbanTask['column_id']; title: string; color: string }> = [
    { id: 'backlog', title: 'Backlog', color: 'border-slate-500' },
    { id: 'scripting', title: 'In Scripting', color: 'border-amber-500' },
    { id: 'animation', title: 'Animation & VFX', color: 'border-sky-500' },
    { id: 'review', title: 'Review & Dailies', color: 'border-purple-500' },
    { id: 'approved', title: 'Approved', color: 'border-emerald-500' },
  ];

  // Filtering
  const filteredTasks = state.kanban_tasks.filter((task) => {
    if (selectedAssignee !== 'all' && task.assignee_id !== selectedAssignee) return false;
    if (selectedEpisode !== 'all' && task.episode_id !== selectedEpisode) return false;
    return true;
  });

  const moveTaskColumn = (task: KanbanTask, nextCol: KanbanTask['column_id']) => {
    onSaveTask({ ...task, column_id: nextCol });
  };

  const getDeadlineStatus = (dueDate: string) => {
    const now = new Date().setHours(0, 0, 0, 0);
    const target = new Date(dueDate).setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target - now) / (1000 * 3600 * 24));

    if (diffDays < 0) {
      return { label: `Overdue (${Math.abs(diffDays)}d)`, color: 'text-red-400 bg-red-950/40 border-red-500/30' };
    }
    if (diffDays <= 3) {
      return { label: `Due soon (${diffDays}d)`, color: 'text-amber-400 bg-amber-950/40 border-amber-500/30' };
    }
    return { label: dueDate, color: 'text-slate-400 bg-[#161922] border-[#2a3144]' };
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f1117] border border-[#1e2330] p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <CheckSquare size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Tasks & Production Kanban</h2>
            <p className="text-xs text-slate-400">Pipeline workflows, character assignment tags, and deadline warnings</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Assignee filter */}
          <select
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
            className="bg-[#161922] border border-[#2a3144] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
          >
            <option value="all">All Assignees</option>
            {state.team_members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Episode filter */}
          <select
            value={selectedEpisode}
            onChange={(e) => setSelectedEpisode(e.target.value)}
            className="bg-[#161922] border border-[#2a3144] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
          >
            <option value="all">All Episodes</option>
            {state.episodes.map((ep) => (
              <option key={ep.id} value={ep.id}>
                E{ep.episode_number}: {ep.title}
              </option>
            ))}
          </select>

          <button
            onClick={() => onCreateTask('backlog')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs transition-colors"
          >
            <Plus size={14} />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Kanban 5-Column Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto min-h-[600px]">
        {columns.map((col, colIdx) => {
          const colTasks = filteredTasks.filter((t) => t.column_id === col.id);

          return (
            <div
              key={col.id}
              className="studio-card p-3 flex flex-col justify-between bg-[#0b0d13] border-t-2"
              style={{ borderTopColor: col.color.replace('border-', '') }}
            >
              <div>
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#1e2330]">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    {col.title}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#161922] text-slate-400 font-bold border border-[#2a3144]">
                    {colTasks.length}
                  </span>
                </div>

                {/* Task Cards in this column */}
                <div className="space-y-3">
                  {colTasks.map((task) => {
                    const deadline = getDeadlineStatus(task.due_date);
                    const taggedChars = state.characters.filter((c) =>
                      task.tagged_character_ids?.includes(c.id)
                    );

                    return (
                      <div
                        key={task.id}
                        className="p-3 rounded-xl bg-[#0f1117] border border-[#1e2330] hover:border-[#2e374d] transition-all space-y-2.5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-white leading-snug">{task.title}</h4>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono uppercase ${
                              task.priority === 'Urgent'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : task.priority === 'High'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-[#161922] text-slate-400 border border-[#2a3144]'
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                          {task.description}
                        </p>

                        {/* Character Dossier Tagging */}
                        {taggedChars.length > 0 && (
                          <div className="flex items-center gap-1.5 pt-1">
                            <span className="text-[10px] text-slate-500">Cast:</span>
                            {taggedChars.map((tc) => (
                              <img
                                key={tc.id}
                                src={tc.avatar_url}
                                alt={tc.name}
                                title={`${tc.name} (${tc.role})`}
                                className="w-5 h-5 rounded-full object-cover border border-amber-500/40"
                              />
                            ))}
                          </div>
                        )}

                        {/* Deadline notice & Assignee */}
                        <div className="flex items-center justify-between pt-2 border-t border-[#1e2330] text-[10px]">
                          <span className={`px-2 py-0.5 rounded font-mono border ${deadline.color}`}>
                            {deadline.label}
                          </span>
                          <span className="text-slate-400 font-medium truncate max-w-[90px]">
                            {task.assignee_name || 'Unassigned'}
                          </span>
                        </div>

                        {/* Column Progression Button */}
                        <div className="flex items-center justify-between pt-1 text-[10px]">
                          <button
                            onClick={() => onDeleteTask(task.id)}
                            className="text-slate-500 hover:text-red-400"
                            title="Delete Task"
                          >
                            <Trash2 size={12} />
                          </button>
                          {colIdx < columns.length - 1 && (
                            <button
                              onClick={() => moveTaskColumn(task, columns[colIdx + 1].id)}
                              className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-0.5"
                            >
                              <span>Next</span>
                              <ChevronRight size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add card button at column bottom */}
              <button
                onClick={() => onCreateTask(col.id)}
                className="mt-3 w-full py-1.5 rounded-lg border border-dashed border-[#2a3144] hover:border-amber-500/50 text-[11px] text-slate-400 hover:text-amber-400 font-medium transition-colors flex items-center justify-center gap-1"
              >
                <Plus size={12} />
                <span>Add Card</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
