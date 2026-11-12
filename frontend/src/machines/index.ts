export * from './types';
export * from './useExplicitMachine';
export * from './connectionMachine';
export * from './embargoMachine';
export * from './audioRecorderMachine';
export * from './teleprompterMachine';
export * from './kanbanPipelineMachine';
export * from './archivePortabilityMachine';
export * from './whiteboardCanvasMachine';

import { globalConnectionMachine } from './connectionMachine';
import { AgentInspectionReport } from './types';

/**
 * Global Studio Machine Registry
 * Enables AI Agents (AX) and developers (DX) to query active state machines,
 * valid transitions, and execution constraints across the studio suite.
 */
export class StudioMachineRegistry {
  private static registeredMachines: Map<string, { id?: string; inspect: () => AgentInspectionReport }> = new Map();

  static {
    this.register('connection_sync', globalConnectionMachine);
  }

  public static register(
    idOrMachine: string | { id: string; inspect: () => AgentInspectionReport },
    maybeMachine?: { inspect: () => AgentInspectionReport }
  ) {
    if (typeof idOrMachine === 'string' && maybeMachine) {
      this.registeredMachines.set(idOrMachine, maybeMachine);
    } else if (typeof idOrMachine === 'object' && idOrMachine.id) {
      this.registeredMachines.set(idOrMachine.id, idOrMachine);
    }
  }

  public static unregister(id: string) {
    this.registeredMachines.delete(id);
  }

  public static inspectAll(): AgentInspectionReport[] {
    const reports: AgentInspectionReport[] = [];
    for (const machine of this.registeredMachines.values()) {
      reports.push(machine.inspect());
    }
    return reports;
  }

  public static inspectMap(): Record<string, AgentInspectionReport> {
    const map: Record<string, AgentInspectionReport> = {};
    for (const [id, machine] of this.registeredMachines.entries()) {
      map[id] = machine.inspect();
    }
    return map;
  }
}

// Expose on window for runtime AI agent and debugging inspection
if (typeof window !== 'undefined') {
  (window as any).__FATGOATS_MACHINES__ = StudioMachineRegistry;
}
