import { StateMachineConfig, ExplicitStateMachine } from './types';

export type ArchivePortabilityState =
  | 'IDLE'
  | 'PACKAGING_ZIP'
  | 'EXPORT_READY'
  | 'VALIDATING_SCHEMA'
  | 'RESTORING_TABLES'
  | 'RESTORE_SUCCESS'
  | 'ERROR';

export type ArchivePortabilityEvent =
  | { type: 'START_EXPORT' }
  | { type: 'PACKAGE_COMPLETE'; downloadUrl: string; filename: string }
  | { type: 'START_IMPORT'; file: File }
  | { type: 'SCHEMA_VALID' }
  | { type: 'RESTORE_COMPLETE' }
  | { type: 'FAIL'; error: string }
  | { type: 'RESET' };

export interface ArchivePortabilityContext {
  downloadUrl: string | null;
  filename: string | null;
  importedFile: File | null;
  errorMessage: string | null;
}

export function createArchivePortabilityMachine(): ExplicitStateMachine<ArchivePortabilityState, ArchivePortabilityEvent, ArchivePortabilityContext> {
  const config: StateMachineConfig<ArchivePortabilityState, ArchivePortabilityEvent, ArchivePortabilityContext> = {
    id: 'archive_portability_machine',
    name: 'Workspace Archive Portability & Integrity Machine',
    initialState: 'IDLE',
    initialContext: {
      downloadUrl: null,
      filename: null,
      importedFile: null,
      errorMessage: null,
    },
    states: {
      IDLE: {
        description: 'Standby for backup export or archive restoration.',
        on: {
          START_EXPORT: {
            target: 'PACKAGING_ZIP',
            description: 'Serialize relational schemas and Fountain files into ZIP.',
          },
          START_IMPORT: {
            target: 'VALIDATING_SCHEMA',
            action: (ctx, evt) => ({ ...ctx, importedFile: evt.file }),
            description: 'Inspect uploaded backup file.',
          },
        },
      },
      PACKAGING_ZIP: {
        description: 'Generating ZIP archive with relational state and media manifests.',
        on: {
          PACKAGE_COMPLETE: {
            target: 'EXPORT_READY',
            action: (ctx, evt) => ({ ...ctx, downloadUrl: evt.downloadUrl, filename: evt.filename }),
            description: 'Archive generated and ready for direct download.',
          },
          FAIL: {
            target: 'ERROR',
            action: (ctx, evt) => ({ ...ctx, errorMessage: evt.error }),
            description: 'Compression or serialization failed.',
          },
        },
      },
      EXPORT_READY: {
        description: 'Archive ready and delivered to client.',
        on: {
          RESET: {
            target: 'IDLE',
            action: () => ({ downloadUrl: null, filename: null, importedFile: null, errorMessage: null }),
            description: 'Return to standby.',
          },
        },
      },
      VALIDATING_SCHEMA: {
        description: 'Unzipping and verifying fatgoats_database_state.json integrity.',
        on: {
          SCHEMA_VALID: {
            target: 'RESTORING_TABLES',
            description: 'Schema signature confirmed; proceeding with database restore.',
          },
          FAIL: {
            target: 'ERROR',
            action: (ctx, evt) => ({ ...ctx, errorMessage: evt.error }),
            description: 'Archive corrupted or schema mismatched.',
          },
        },
      },
      RESTORING_TABLES: {
        description: 'Applying relational records into SQLite backend.',
        on: {
          RESTORE_COMPLETE: {
            target: 'RESTORE_SUCCESS',
            description: 'All 16 tables populated successfully.',
          },
          FAIL: {
            target: 'ERROR',
            action: (ctx, evt) => ({ ...ctx, errorMessage: evt.error }),
            description: 'Database transaction failed during restore.',
          },
        },
      },
      RESTORE_SUCCESS: {
        description: 'Workspace restored and active in session.',
        on: {
          RESET: {
            target: 'IDLE',
            action: () => ({ downloadUrl: null, filename: null, importedFile: null, errorMessage: null }),
            description: 'Acknowledge restore and return to standby.',
          },
        },
      },
      ERROR: {
        description: 'Portability operation failed.',
        on: {
          RESET: {
            target: 'IDLE',
            action: (ctx) => ({ ...ctx, errorMessage: null }),
            description: 'Dismiss error.',
          },
        },
      },
    },
  };

  return new ExplicitStateMachine(config);
}
