import { StateMachineConfig, ExplicitStateMachine } from './types';
import { KanbanTask } from '../types';
import { StudioMachineRegistry } from './index';

export type KanbanColumnId = KanbanTask['column_id'];
export type KanbanState = KanbanColumnId;

export type KanbanPipelineEvent =
  | { type: 'START_SCRIPTING' }
  | { type: 'SEND_TO_ANIMATION' }
  | { type: 'SUBMIT_FOR_REVIEW' }
  | { type: 'REQUEST_REWORK'; feedback?: string }
  | { type: 'APPROVE_TASK' }
  | { type: 'REOPEN_TASK' };

export type KanbanEvent = KanbanPipelineEvent;

export interface KanbanPipelineContext {
  task: KanbanTask;
  lastActionMessage: string | null;
}

export function createKanbanPipelineMachine(task: KanbanTask): ExplicitStateMachine<KanbanColumnId, KanbanPipelineEvent, KanbanPipelineContext> {
  const config: StateMachineConfig<KanbanColumnId, KanbanPipelineEvent, KanbanPipelineContext> = {
    id: `kanban_machine_${task.id}`,
    name: 'Production Task Lifecycle Pipeline Machine',
    initialState: task.column_id,
    initialContext: {
      task,
      lastActionMessage: null,
    },
    states: {
      backlog: {
        description: 'Task logged in studio production backlog hopper.',
        on: {
          START_SCRIPTING: {
            target: 'scripting',
            action: (ctx) => ({
              ...ctx,
              task: { ...ctx.task, column_id: 'scripting' },
              lastActionMessage: 'Task moved to In Scripting',
            }),
            description: 'Assign task to writers room.',
          },
        },
      },
      scripting: {
        description: 'Actively in screenplay or dialogue drafting stage.',
        on: {
          SEND_TO_ANIMATION: {
            target: 'animation',
            action: (ctx) => ({
              ...ctx,
              task: { ...ctx.task, column_id: 'animation' },
              lastActionMessage: 'Screenplay draft sent to 3D animators',
            }),
            description: 'Pass draft to visual animatics & layout artists.',
          },
          SUBMIT_FOR_REVIEW: {
            target: 'review',
            action: (ctx) => ({
              ...ctx,
              task: { ...ctx.task, column_id: 'review' },
              lastActionMessage: 'Submitted for dailies review',
            }),
            description: 'Submit written draft directly for director review.',
          },
        },
      },
      animation: {
        description: 'In 3D layout, character rigging, modeling, or visual animatic phase.',
        on: {
          SUBMIT_FOR_REVIEW: {
            target: 'review',
            action: (ctx) => ({
              ...ctx,
              task: { ...ctx.task, column_id: 'review' },
              lastActionMessage: 'Visual shots submitted for supervisor dailies',
            }),
            description: 'Ready for director review.',
          },
        },
      },
      review: {
        description: 'Screened in dailies room awaiting supervisor or director sign-off.',
        on: {
          APPROVE_TASK: {
            target: 'approved',
            action: (ctx) => ({
              ...ctx,
              task: { ...ctx.task, column_id: 'approved' },
              lastActionMessage: 'Task cleared and approved',
            }),
            description: 'Sign off and lock into master production reel.',
          },
          REQUEST_REWORK: {
            target: 'scripting',
            action: (ctx, evt) => ({
              ...ctx,
              task: { ...ctx.task, column_id: 'scripting' },
              lastActionMessage: evt && 'feedback' in evt && evt.feedback ? `Rework: ${evt.feedback}` : 'Returned for revision',
            }),
            description: 'Flag revisions and return to writers or animators.',
          },
        },
      },
      approved: {
        description: 'Cleared and approved into master reel.',
        on: {
          REOPEN_TASK: {
            target: 'review',
            action: (ctx) => ({
              ...ctx,
              task: { ...ctx.task, column_id: 'review' },
              lastActionMessage: 'Reopened for post-production review',
            }),
            description: 'Reopen task if client request requires re-cutting.',
          },
        },
      },
    },
  };

  const machine = new ExplicitStateMachine(config);
  StudioMachineRegistry.register(machine.id, machine);
  return machine;
}
