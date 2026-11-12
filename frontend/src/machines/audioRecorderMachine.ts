import { StateMachineConfig, ExplicitStateMachine } from './types';

export type AudioRecorderState =
  | 'IDLE'
  | 'REQUESTING_MIC'
  | 'RECORDING'
  | 'PAUSED'
  | 'REVIEWING'
  | 'SAVING'
  | 'ERROR';

export type AudioRecorderEvent =
  | { type: 'START_RECORD' }
  | { type: 'MIC_GRANTED'; stream: any }
  | { type: 'MIC_DENIED'; error: string }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STOP_RECORD'; blob: Blob; audioUrl: string; duration: number }
  | { type: 'DISCARD' }
  | { type: 'COMMIT_SAVE' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'RESET' };

export interface AudioRecorderContext {
  audioBlob: Blob | null;
  audioUrl: string | null;
  durationSeconds: number;
  errorMessage: string | null;
}

export function createAudioRecorderMachine(id: string = 'studio_audio_recorder'): ExplicitStateMachine<AudioRecorderState, AudioRecorderEvent, AudioRecorderContext> {
  const config: StateMachineConfig<AudioRecorderState, AudioRecorderEvent, AudioRecorderContext> = {
    id,
    name: 'Studio Audio & Foley Recording Machine',
    initialState: 'IDLE',
    initialContext: {
      audioBlob: null,
      audioUrl: null,
      durationSeconds: 0,
      errorMessage: null,
    },
    states: {
      IDLE: {
        description: 'Standby mode; ready to capture audio take.',
        on: {
          START_RECORD: {
            target: 'REQUESTING_MIC',
            description: 'Request microphone permission and initialize buffer.',
          },
        },
      },
      REQUESTING_MIC: {
        description: 'Requesting microphone hardware stream from host device.',
        on: {
          MIC_GRANTED: {
            target: 'RECORDING',
            description: 'Hardware stream opened; recording begins.',
          },
          MIC_DENIED: {
            target: 'ERROR',
            action: (ctx, evt) => ({ ...ctx, errorMessage: evt.error }),
            description: 'Microphone permission denied or input device missing.',
          },
        },
      },
      RECORDING: {
        description: 'Actively capturing voice take or foley soundbite.',
        on: {
          PAUSE: {
            target: 'PAUSED',
            description: 'Pause recording take.',
          },
          STOP_RECORD: {
            target: 'REVIEWING',
            action: (ctx, evt) => ({
              ...ctx,
              audioBlob: evt.blob,
              audioUrl: evt.audioUrl,
              durationSeconds: evt.duration,
            }),
            description: 'Finish audio capture and enter review mode.',
          },
          RESET: {
            target: 'IDLE',
            description: 'Abort recording and return to idle.',
          },
        },
      },
      PAUSED: {
        description: 'Recording paused on current line.',
        on: {
          RESUME: {
            target: 'RECORDING',
            description: 'Resume recording take.',
          },
          STOP_RECORD: {
            target: 'REVIEWING',
            action: (ctx, evt) => ({
              ...ctx,
              audioBlob: evt.blob,
              audioUrl: evt.audioUrl,
              durationSeconds: evt.duration,
            }),
            description: 'Commit take from paused state.',
          },
          DISCARD: {
            target: 'IDLE',
            action: () => ({ audioBlob: null, audioUrl: null, durationSeconds: 0, errorMessage: null }),
            description: 'Discard take in progress.',
          },
        },
      },
      REVIEWING: {
        description: 'Reviewing waveform take before permanent storage.',
        on: {
          DISCARD: {
            target: 'IDLE',
            action: () => ({ audioBlob: null, audioUrl: null, durationSeconds: 0, errorMessage: null }),
            description: 'Discard take and prepare for re-take.',
          },
          COMMIT_SAVE: {
            target: 'SAVING',
            description: 'Write take to character voice dossier or soundboard.',
          },
        },
      },
      SAVING: {
        description: 'Persisting audio clip into relational database.',
        on: {
          SAVE_SUCCESS: {
            target: 'IDLE',
            action: () => ({ audioBlob: null, audioUrl: null, durationSeconds: 0, errorMessage: null }),
            description: 'Audio persistence confirmed.',
          },
        },
      },
      ERROR: {
        description: 'Hardware or permissions error state.',
        on: {
          RESET: {
            target: 'IDLE',
            action: (ctx) => ({ ...ctx, errorMessage: null }),
            description: 'Dismiss error and reset.',
          },
        },
      },
    },
  };

  return new ExplicitStateMachine(config);
}
