import { StateMachineConfig, ExplicitStateMachine } from './types';

export type ConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED_IDLE'
  | 'SYNCING_BATCH'
  | 'OFFLINE_BACKLOG';

export type ConnectionEvent =
  | { type: 'START_CONNECT' }
  | { type: 'CONNECTION_SUCCESS' }
  | { type: 'CONNECTION_FAILURE'; error?: string }
  | { type: 'QUEUE_MUTATION'; mutation: any }
  | { type: 'START_SYNC' }
  | { type: 'SYNC_SUCCESS' }
  | { type: 'SYNC_FAILURE'; error?: string }
  | { type: 'DISCONNECT' };

export interface ConnectionContext {
  backlogCount: number;
  lastConnectedAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
}

export const connectionMachineConfig: StateMachineConfig<ConnectionState, ConnectionEvent, ConnectionContext> = {
  id: 'connection_sync_machine',
  name: 'Offline Resilience & Realtime Sync Machine',
  initialState: 'CONNECTED_IDLE',
  initialContext: {
    backlogCount: 0,
    lastConnectedAt: new Date().toISOString(),
    lastSyncAt: new Date().toISOString(),
    lastError: null,
  },
  states: {
    CONNECTED_IDLE: {
      description: 'Connected to Rust backend and WebSocket broadcast channel with empty backlog.',
      on: {
        DISCONNECT: {
          target: 'DISCONNECTED',
          description: 'Network drop or server shutdown detected.',
        },
        QUEUE_MUTATION: {
          target: 'CONNECTED_IDLE',
          action: (ctx) => ({ ...ctx, backlogCount: ctx.backlogCount + 1 }),
          description: 'Queue mutation and persist to database.',
        },
        START_SYNC: {
          target: 'SYNCING_BATCH',
          description: 'Trigger full state synchronization.',
        },
      },
    },
    CONNECTING: {
      description: 'Attempting to establish HTTP/WebSocket connection to backend.',
      on: {
        CONNECTION_SUCCESS: {
          target: 'CONNECTED_IDLE',
          action: (ctx) => ({
            ...ctx,
            lastConnectedAt: new Date().toISOString(),
            lastError: null,
          }),
          description: 'Successfully established connection.',
        },
        CONNECTION_FAILURE: {
          target: 'OFFLINE_BACKLOG',
          action: (ctx, evt) => ({ ...ctx, lastError: evt.error || 'Connection failed' }),
          description: 'Backend unreachable; fall back to offline cache.',
        },
      },
    },
    DISCONNECTED: {
      description: 'Network or backend offline; client operating in read/write local cache mode.',
      on: {
        START_CONNECT: {
          target: 'CONNECTING',
          description: 'Probe connection with heartbeat ping.',
        },
        QUEUE_MUTATION: {
          target: 'OFFLINE_BACKLOG',
          action: (ctx) => ({ ...ctx, backlogCount: ctx.backlogCount + 1 }),
          description: 'Store edit in local backlog queue.',
        },
      },
    },
    OFFLINE_BACKLOG: {
      description: 'Offline backlog holds pending mutations awaiting transmission to Rust database.',
      on: {
        START_CONNECT: {
          target: 'CONNECTING',
          description: 'Probe connection on network online event.',
        },
        QUEUE_MUTATION: {
          target: 'OFFLINE_BACKLOG',
          action: (ctx) => ({ ...ctx, backlogCount: ctx.backlogCount + 1 }),
          description: 'Increment backlog queue.',
        },
        START_SYNC: {
          target: 'SYNCING_BATCH',
          guard: (ctx) => ctx.backlogCount > 0,
          description: 'Begin transmission of queued items.',
        },
      },
    },
    SYNCING_BATCH: {
      description: 'Actively flushing queued mutations and receiving updated state from Rust server.',
      on: {
        SYNC_SUCCESS: {
          target: 'CONNECTED_IDLE',
          action: (ctx) => ({
            ...ctx,
            backlogCount: 0,
            lastSyncAt: new Date().toISOString(),
            lastError: null,
          }),
          description: 'All backlog items accepted by SQLite database.',
        },
        SYNC_FAILURE: {
          target: 'OFFLINE_BACKLOG',
          action: (ctx, evt) => ({ ...ctx, lastError: evt.error || 'Sync failed' }),
          description: 'Transmission failed; retain backlog items for next retry.',
        },
      },
    },
  },
};

export const globalConnectionMachine = new ExplicitStateMachine(connectionMachineConfig);
