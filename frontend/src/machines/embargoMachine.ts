import { StateMachineConfig, ExplicitStateMachine } from './types';

export type EmbargoState =
  | 'UNLOCKED'
  | 'LOCKED_COUNTDOWN'
  | 'TIME_EXPIRED'
  | 'OVERRIDDEN';

export type EmbargoEvent =
  | { type: 'APPLY_EMBARGO'; lockedUntil: string }
  | { type: 'TICK'; currentTime?: number }
  | { type: 'ADMIN_OVERRIDE'; role: string }
  | { type: 'UNSEAL_SCENE' }
  | { type: 'REMOVE_LOCK' };

export interface EmbargoContext {
  lockedUntil: string | null;
  remainingMs: number;
  formattedCountdown: string;
  isOverridden: boolean;
}

export function formatRemaining(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((ms % (1000 * 60)) / 1000);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function createEmbargoMachine(initialLockedUntil?: string | null): ExplicitStateMachine<EmbargoState, EmbargoEvent, EmbargoContext> {
  const isInitiallyLocked = Boolean(initialLockedUntil && new Date(initialLockedUntil).getTime() > Date.now());
  const initialRemaining = initialLockedUntil ? Math.max(0, new Date(initialLockedUntil).getTime() - Date.now()) : 0;

  const config: StateMachineConfig<EmbargoState, EmbargoEvent, EmbargoContext> = {
    id: 'embargo_machine',
    name: 'Spoiler & Embargo Time-Lock Machine',
    initialState: isInitiallyLocked ? 'LOCKED_COUNTDOWN' : 'UNLOCKED',
    initialContext: {
      lockedUntil: initialLockedUntil || null,
      remainingMs: initialRemaining,
      formattedCountdown: formatRemaining(initialRemaining),
      isOverridden: false,
    },
    states: {
      UNLOCKED: {
        description: 'Scene is openly readable and editable by writers room.',
        on: {
          APPLY_EMBARGO: {
            target: 'LOCKED_COUNTDOWN',
            guard: (_ctx, evt) => new Date(evt.lockedUntil).getTime() > Date.now(),
            action: (_ctx, evt) => {
              const rem = new Date(evt.lockedUntil).getTime() - Date.now();
              return {
                lockedUntil: evt.lockedUntil,
                remainingMs: rem,
                formattedCountdown: formatRemaining(rem),
                isOverridden: false,
              };
            },
            description: 'Apply future embargo timestamp to lock spoilers.',
          },
        },
      },
      LOCKED_COUNTDOWN: {
        description: 'Scene content is shielded behind an active countdown timer.',
        on: {
          TICK: {
            target: 'LOCKED_COUNTDOWN',
            action: (ctx) => {
              if (!ctx.lockedUntil) return ctx;
              const rem = Math.max(0, new Date(ctx.lockedUntil).getTime() - Date.now());
              return {
                ...ctx,
                remainingMs: rem,
                formattedCountdown: formatRemaining(rem),
              };
            },
            description: 'Update remaining time tick.',
          },
          UNSEAL_SCENE: {
            target: 'TIME_EXPIRED',
            guard: (ctx) => ctx.remainingMs <= 0,
            description: 'Embargo timestamp reached zero.',
          },
          ADMIN_OVERRIDE: {
            target: 'OVERRIDDEN',
            guard: (_ctx, evt) => evt.role === 'Super Admin',
            action: (ctx) => ({ ...ctx, isOverridden: true }),
            description: 'Super Admin emergency override.',
          },
          REMOVE_LOCK: {
            target: 'UNLOCKED',
            action: () => ({
              lockedUntil: null,
              remainingMs: 0,
              formattedCountdown: '00:00:00',
              isOverridden: false,
            }),
            description: 'Manually remove embargo and open scene.',
          },
        },
      },
      TIME_EXPIRED: {
        description: 'Embargo duration reached zero; ready for final unsealing.',
        on: {
          REMOVE_LOCK: {
            target: 'UNLOCKED',
            action: () => ({
              lockedUntil: null,
              remainingMs: 0,
              formattedCountdown: '00:00:00',
              isOverridden: false,
            }),
            description: 'Acknowledge expiration and clear lock.',
          },
        },
      },
      OVERRIDDEN: {
        description: 'Embargo temporarily bypassed by Super Admin authority.',
        on: {
          REMOVE_LOCK: {
            target: 'UNLOCKED',
            action: () => ({
              lockedUntil: null,
              remainingMs: 0,
              formattedCountdown: '00:00:00',
              isOverridden: false,
            }),
            description: 'Revert to standard open draft.',
          },
        },
      },
    },
  };

  return new ExplicitStateMachine(config);
}
