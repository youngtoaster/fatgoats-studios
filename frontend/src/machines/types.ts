/**
 * FatGoats Studios Explicit Finite State Machine System
 * Elevating:
 * - UX: Prevents invalid/impossible UI states and ensures deterministic feedback
 * - DX: Type-safe transitions, action dispatchers, self-documenting workflows
 * - AX (Agent Experience): Introspectable state schemas allowing autonomous agents
 *      to query current state and discover all valid transitions at any moment.
 */

export interface TransitionRule<TState extends string, TEvent extends { type: string }, TContext> {
  target: TState;
  guard?: (context: TContext, event: any) => boolean;
  action?: (context: TContext, event: any) => TContext;
  description?: string;
}

export interface StateNode<TState extends string, TEvent extends { type: string }, TContext> {
  description: string;
  on?: {
    [K in TEvent['type']]?: TransitionRule<TState, TEvent, TContext> | TState;
  };
}

export interface StateMachineConfig<TState extends string, TEvent extends { type: string }, TContext> {
  id: string;
  name: string;
  initialState: TState;
  initialContext: TContext;
  states: Record<TState, StateNode<TState, TEvent, TContext>>;
}

export interface AgentInspectionReport {
  machineId: string;
  machineName: string;
  currentState: string;
  states: string[];
  context: any;
  availableTransitions: Array<{
    event: string;
    targetState: string;
    isGuarded: boolean;
    description: string;
  }>;
}

export class ExplicitStateMachine<TState extends string, TEvent extends { type: string }, TContext> {
  public id: string;
  public name: string;
  private state: TState;
  private context: TContext;
  private config: StateMachineConfig<TState, TEvent, TContext>;
  private listeners: Array<(state: TState, context: TContext, event?: TEvent) => void> = [];

  constructor(config: StateMachineConfig<TState, TEvent, TContext>) {
    this.id = config.id;
    this.name = config.name;
    this.config = config;
    this.state = config.initialState;
    this.context = config.initialContext;
  }

  public getState(): TState {
    return this.state;
  }

  public getContext(): TContext {
    return this.context;
  }

  public subscribe(listener: (state: TState, context: TContext, event?: TEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public can(eventType: TEvent['type'], eventPayload?: any): boolean {
    const currentStateNode = this.config.states[this.state];
    if (!currentStateNode || !currentStateNode.on) return false;
    const rule = currentStateNode.on[eventType];
    if (!rule) return false;
    if (typeof rule === 'string') return true;
    return rule.guard ? rule.guard(this.context, eventPayload) : true;
  }

  public send(event: TEvent): boolean {
    const currentStateNode = this.config.states[this.state];
    if (!currentStateNode || !currentStateNode.on) {
      console.warn(`[Machine: ${this.id}] No transitions defined for state ${this.state}`);
      return false;
    }

    const rule = currentStateNode.on[event.type as TEvent['type']];
    if (!rule) {
      console.warn(`[Machine: ${this.id}] Event ${event.type} not allowed in state ${this.state}`);
      return false;
    }

    let targetState: TState;
    let nextContext = this.context;

    if (typeof rule === 'string') {
      targetState = rule as TState;
    } else {
      if (rule.guard && !rule.guard(this.context, event)) {
        console.warn(`[Machine: ${this.id}] Transition ${event.type} blocked by guard in state ${this.state}`);
        return false;
      }
      targetState = rule.target;
      if (rule.action) {
        nextContext = rule.action(this.context, event);
      }
    }

    this.state = targetState;
    this.context = nextContext;
    this.listeners.forEach((l) => l(this.state, this.context, event));
    return true;
  }

  /**
   * Agent Inspection API (AX):
   * Programmatic inspection of available actions and state semantics for AI Agents.
   */
  public inspect(): AgentInspectionReport {
    const currentStateNode = this.config.states[this.state];
    const availableTransitions: AgentInspectionReport['availableTransitions'] = [];

    if (currentStateNode && currentStateNode.on) {
      for (const [evt, rule] of Object.entries(currentStateNode.on)) {
        if (!rule) continue;
        if (typeof rule === 'string') {
          availableTransitions.push({
            event: evt,
            targetState: rule,
            isGuarded: false,
            description: `Transition to ${rule}`,
          });
        } else {
          const ruleObj = rule as TransitionRule<TState, TEvent, TContext>;
          availableTransitions.push({
            event: evt,
            targetState: ruleObj.target,
            isGuarded: Boolean(ruleObj.guard),
            description: ruleObj.description || `Transition to ${ruleObj.target}`,
          });
        }
      }
    }

    return {
      machineId: this.id,
      machineName: this.name,
      currentState: this.state,
      states: Object.keys(this.config.states),
      context: this.context,
      availableTransitions,
    };
  }
}
