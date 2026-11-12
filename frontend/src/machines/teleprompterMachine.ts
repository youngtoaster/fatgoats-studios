import { StateMachineConfig, ExplicitStateMachine } from './types';

export type TeleprompterState =
  | 'CLOSED'
  | 'READY'
  | 'COUNTDOWN'
  | 'AUTOSCROLLING'
  | 'PAUSED'
  | 'COMPLETED';

export type TeleprompterEvent =
  | { type: 'OPEN' }
  | { type: 'CUE_COUNTDOWN' }
  | { type: 'COUNTDOWN_TICK' }
  | { type: 'ENGAGE_SCROLL' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'REACH_END' }
  | { type: 'RESET_TOP' }
  | { type: 'SET_SPEED'; speed: number }
  | { type: 'SET_FONT_SIZE'; size: number }
  | { type: 'CLOSE' };

export interface TeleprompterContext {
  speed: number;
  fontSize: number;
  countdownValue: number;
  scrollPosition: number;
}

export function createTeleprompterMachine(): ExplicitStateMachine<TeleprompterState, TeleprompterEvent, TeleprompterContext> {
  const config: StateMachineConfig<TeleprompterState, TeleprompterEvent, TeleprompterContext> = {
    id: 'teleprompter_machine',
    name: 'Cast Rehearsal Teleprompter Machine',
    initialState: 'CLOSED',
    initialContext: {
      speed: 2,
      fontSize: 28,
      countdownValue: 3,
      scrollPosition: 0,
    },
    states: {
      CLOSED: {
        description: 'Teleprompter is closed; script in standard reading mode.',
        on: {
          OPEN: {
            target: 'READY',
            action: (ctx) => ({ ...ctx, countdownValue: 3, scrollPosition: 0 }),
            description: 'Mount fullscreen distraction-free teleprompter view.',
          },
        },
      },
      READY: {
        description: 'Teleprompter mounted and queued at start of scene.',
        on: {
          CUE_COUNTDOWN: {
            target: 'COUNTDOWN',
            action: (ctx) => ({ ...ctx, countdownValue: 3 }),
            description: 'Initiate 3..2..1 rehearsal lead-in.',
          },
          ENGAGE_SCROLL: {
            target: 'AUTOSCROLLING',
            description: 'Bypass countdown and start autoscroll immediately.',
          },
          SET_SPEED: {
            target: 'READY',
            action: (ctx, evt) => ({ ...ctx, speed: evt.speed }),
            description: 'Adjust scrolling velocity.',
          },
          SET_FONT_SIZE: {
            target: 'READY',
            action: (ctx, evt) => ({ ...ctx, fontSize: evt.size }),
            description: 'Adjust cast read-through typography scale.',
          },
          CLOSE: {
            target: 'CLOSED',
            description: 'Exit rehearsal mode.',
          },
        },
      },
      COUNTDOWN: {
        description: 'Cast lead-in countdown (3..2..1.. ACTION!).',
        on: {
          COUNTDOWN_TICK: {
            target: 'COUNTDOWN',
            guard: (ctx) => ctx.countdownValue > 1,
            action: (ctx) => ({ ...ctx, countdownValue: ctx.countdownValue - 1 }),
            description: 'Decrement countdown second.',
          },
          ENGAGE_SCROLL: {
            target: 'AUTOSCROLLING',
            action: (ctx) => ({ ...ctx, countdownValue: 0 }),
            description: 'Countdown completed; engage autoscroll.',
          },
          CLOSE: {
            target: 'CLOSED',
            description: 'Cancel rehearsal countdown.',
          },
        },
      },
      AUTOSCROLLING: {
        description: 'Screenplay viewport is actively advancing.',
        on: {
          PAUSE: {
            target: 'PAUSED',
            description: 'Pause autoscrolling for director correction.',
          },
          REACH_END: {
            target: 'COMPLETED',
            description: 'Bottom of scene text reached.',
          },
          SET_SPEED: {
            target: 'AUTOSCROLLING',
            action: (ctx, evt) => ({ ...ctx, speed: evt.speed }),
            description: 'Dynamically tune pacing speed while rolling.',
          },
          CLOSE: {
            target: 'CLOSED',
            description: 'Exit teleprompter mode.',
          },
        },
      },
      PAUSED: {
        description: 'Autoscroll held on active line.',
        on: {
          RESUME: {
            target: 'AUTOSCROLLING',
            description: 'Resume rolling script.',
          },
          RESET_TOP: {
            target: 'READY',
            action: (ctx) => ({ ...ctx, scrollPosition: 0 }),
            description: 'Rewind scene to heading top.',
          },
          CLOSE: {
            target: 'CLOSED',
            description: 'Close rehearsal prompter.',
          },
        },
      },
      COMPLETED: {
        description: 'Scene read-through concluded (FADE OUT / CUT TO:).',
        on: {
          RESET_TOP: {
            target: 'READY',
            action: (ctx) => ({ ...ctx, scrollPosition: 0, countdownValue: 3 }),
            description: 'Rewind for next rehearsal pass.',
          },
          CLOSE: {
            target: 'CLOSED',
            description: 'Close reader.',
          },
        },
      },
    },
  };

  return new ExplicitStateMachine(config);
}
