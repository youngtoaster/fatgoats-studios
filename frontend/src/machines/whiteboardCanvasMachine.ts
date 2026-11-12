import { ExplicitStateMachine, StateMachineConfig } from './types';
import { StudioMachineRegistry } from './index';

export type CanvasState = 'IDLE' | 'PANNING' | 'DRAGGING_NODE' | 'LOCKED';

export type CanvasEvent =
  | { type: 'START_PAN' }
  | { type: 'START_DRAG_NODE'; nodeId: string }
  | { type: 'STOP_INTERACTION' }
  | { type: 'LOCK' }
  | { type: 'UNLOCK' };

export interface CanvasContext {
  boardId?: string;
  isLocked: boolean;
  activeNodeId: string | null;
}

export function createWhiteboardCanvasMachine(boardId?: string, isLocked: boolean = false) {
  const config: StateMachineConfig<CanvasState, CanvasEvent, CanvasContext> = {
    id: `whiteboard-canvas-${boardId || 'default'}`,
    name: 'Whiteboard Spatial Canvas Engine',
    initialState: isLocked ? 'LOCKED' : 'IDLE',
    initialContext: {
      boardId,
      isLocked,
      activeNodeId: null,
    },
    states: {
      IDLE: {
        description: 'Canvas ready for navigation, panning, or selecting spatial plot beats.',
        on: {
          START_PAN: {
            target: 'PANNING',
            guard: (ctx) => !ctx.isLocked,
          },
          START_DRAG_NODE: {
            target: 'DRAGGING_NODE',
            guard: (ctx) => !ctx.isLocked,
            action: (ctx, evt) => ({
              ...ctx,
              activeNodeId: evt.type === 'START_DRAG_NODE' ? evt.nodeId : null,
            }),
          },
          LOCK: {
            target: 'LOCKED',
            action: (ctx) => ({
              ...ctx,
              isLocked: true,
            }),
          },
        },
      },
      PANNING: {
        description: 'User or viewport navigator is panning the infinite studio whiteboard canvas.',
        on: {
          STOP_INTERACTION: {
            target: 'IDLE',
          },
          LOCK: {
            target: 'LOCKED',
            action: (ctx) => ({
              ...ctx,
              isLocked: true,
            }),
          },
        },
      },
      DRAGGING_NODE: {
        description: 'Repositioning plot node, character sticky note, or concept art card.',
        on: {
          STOP_INTERACTION: {
            target: 'IDLE',
            action: (ctx) => ({
              ...ctx,
              activeNodeId: null,
            }),
          },
          LOCK: {
            target: 'LOCKED',
            action: (ctx) => ({
              ...ctx,
              isLocked: true,
              activeNodeId: null,
            }),
          },
        },
      },
      LOCKED: {
        description: 'Whiteboard is locked against accidental repositioning or live edits.',
        on: {
          UNLOCK: {
            target: 'IDLE',
            action: (ctx) => ({
              ...ctx,
              isLocked: false,
            }),
          },
        },
      },
    },
  };

  const machine = new ExplicitStateMachine(config);
  StudioMachineRegistry.register(machine.id, machine);
  return machine;
}
