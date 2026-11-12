import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Clock,
  AlertTriangle,
  Users,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  CheckCircle2,
  Filter,
  Trash2,
  Workflow,
} from 'lucide-react';
import { KanbanTask, StudioDatabaseState } from '../types';
import {
  createKanbanPipelineMachine,
  KanbanState,
  KanbanEvent,
} from '../machines/kanbanPipelineMachine';

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

  const columns: Array<{ id: KanbanTask['column_id']; title: string }> = [
    { id: 'backlog', title: 'Backlog' },
    { id: 'scripting', title: 'In scripting' },
    { id: 'animation', title: 'Animation & VFX' },
    { id: 'review', title: 'Review & dailies' },
    { id: 'approved', title: 'Approved' },
  ];

  // Filtering
  const filteredTasks = state.kanban_tasks.filter((task) => {
    if (selectedAssignee !== 'all' && task.assignee_id !== selectedAssignee) return false;
    if (selectedEpisode !== 'all' && task.episode_id !== selectedEpisode) return false;
    return true;
  });

  const getDeadlineStatus = (dueDate: string) => {
    const now = new Date().setHours(0, 0, 0, 0);
    const target = new Date(dueDate).setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target - now) / (1000 * 3600 * 24));

    if (diffDays < 0) {
      return { label: `Overdue (${Math.abs(diffDays)}d)`, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
    }
    if (diffDays <= 3) {
      return { label: `Due soon (${diffDays}d)`, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    }
    return { label: dueDate, color: 'text-slate-400 bg-white/5 border-white/5' };
  };

  // State Machine transition executor
  const handleTransition = (task: KanbanTask, event: KanbanEvent) => {
    const machine = createKanbanPipelineMachine(task);
    const accepted = machine.send(event);
    if (accepted) {
      onSaveTask({
        ...task,
        column_id: machine.getState(),
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#101217] border border-white/5 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#151820] text-slate-400 border border-white/5">
            <CheckSquare size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white tracking-tight">Production kanban</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#151820] text-slate-400 border border-white/5">
                Guarded FSM
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Pipeline workflows, character assignment tags, and deadline warnings</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Assignee filter */}
          <select
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
            className="bg-[#151820] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-white/20"
          >
            <option value="all">All assignees</option>
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
            className="bg-[#151820] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-white/20"
          >
            <option value="all">All episodes</option>
            {state.episodes.map((ep) => (
              <option key={ep.id} value={ep.id}>
                E{ep.episode_number}: {ep.title}
              </option>
            ))}
          </select>

          <button
            onClick={() => onCreateTask('backlog')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-medium text-xs transition-colors"
          >
            <Plus size={14} />
            <span>Add task</span>
          </button>
        </div>
      </div>

      {/* Kanban 5-Column Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 overflow-x-auto min-h-[600px]">
        {columns.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.column_id === col.id);

          return (
            <div
              key={col.id}
              className="bg-[#101217] border border-white/5 rounded-xl p-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/5">
                  <span className="text-xs font-medium text-slate-300">
                    {col.title}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#151820] text-slate-400 border border-white/5 tabular-nums">
                    {colTasks.length}
                  </span>
                </div>

                {/* Task Cards in this column */}
                <div className="space-y-2.5">
                  {colTasks.map((task) => {
                    const deadline = getDeadlineStatus(task.due_date);
                    const taggedChars = state.characters.filter((c) =>
                      task.tagged_character_ids?.includes(c.id)
                    );

                    // Inspect state machine for this specific task
                    const taskMachine = createKanbanPipelineMachine(task);
                    const machineInspection = taskMachine.inspect();
                    const availableTransitions = machineInspection.availableTransitions;

                    return (
                      <div
                        key={task.id}
                        className="p-3 rounded-lg bg-[#151820] border border-white/5 hover:border-white/15 transition-colors space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-medium text-white leading-snug">{task.title}</h4>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                              task.priority === 'Urgent'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : task.priority === 'High'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-white/5 text-slate-400 border border-white/5'
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
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <span className="text-[10px] text-slate-500">Cast:</span>
                            {taggedChars.map((tc) => (
                              <img
                                key={tc.id}
                                src={tc.avatar_url}
                                alt={tc.name}
                                title={`${tc.name} (${tc.role})`}
                                className="w-5 h-5 rounded-full object-cover border border-white/10"
                              />
                            ))}
                          </div>
                        )}

                        {/* Deadline notice & Assignee */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px]">
                          <span className={`px-2 py-0.5 rounded font-mono border ${deadline.color}`}>
                            {deadline.label}
                          </span>
                          <span className="text-slate-400 font-medium truncate max-w-[90px]">
                            {task.assignee_name || 'Unassigned'}
                          </span>
                        </div>

                        {/* Guarded Pipeline Machine Transitions */}
                        <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-1 text-[10px]">
                          <button
                            onClick={() => onDeleteTask(task.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                            title="Delete task"
                          >
                            <Trash2 size={12} />
                          </button>

                          <div className="flex items-center gap-1">
                            {/* Available Guarded Actions */}
                            {availableTransitions.map((tr) => {
                              const evt = tr.event;
                              const isForward =
                                evt === 'START_SCRIPTING' ||
                                evt === 'SEND_TO_ANIMATION' ||
                                evt === 'SUBMIT_FOR_REVIEW' ||
                                evt === 'APPROVE_TASK';

                              const getActionLabel = (e: string) => {
                                switch (e) {
                                  case 'START_SCRIPTING':
                                    return 'Start scripting';
                                  case 'SEND_TO_ANIMATION':
                                    return 'To animation';
                                  case 'SUBMIT_FOR_REVIEW':
                                    return 'Submit review';
                                  case 'APPROVE_TASK':
                                    return 'Approve';
                                  case 'REQUEST_REWORK':
                                    return 'Rework';
                                  case 'REOPEN_TASK':
                                    return 'Reopen';
                                  default:
                                    return e;
                                }
                              };

                              return (
                                <button
                                  key={evt}
                                  onClick={() => handleTransition(task, { type: evt as any })}
                                  className={`px-2 py-0.5 rounded text-[9px] font-medium flex items-center gap-0.5 transition-colors ${
                                    isForward
                                      ? evt === 'APPROVE_TASK'
                                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20'
                                        : 'bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20'
                                      : 'bg-white/5 text-slate-400 border border-white/5 hover:text-slate-200'
                                  }`}
                                  title={`Transition task via FSM: ${evt}`}
                                >
                                  {isForward ? (
                                    evt === 'APPROVE_TASK' ? (
                                      <CheckCircle2 size={10} />
                                    ) : (
                                      <ChevronRight size={10} />
                                    )
                                  ) : (
                                    <ChevronLeft size={10} />
                                  )}
                                  <span>{getActionLabel(evt)}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add card button at column bottom */}
              <button
                onClick={() => onCreateTask(col.id)}
                className="mt-3 w-full py-1.5 rounded-lg border border-dashed border-white/10 hover:border-amber-500/40 text-[11px] text-slate-400 hover:text-amber-400 font-medium transition-colors flex items-center justify-center gap-1"
              >
                <Plus size={12} />
                <span>Add card</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
