import { useState, useEffect, useCallback, useMemo, DependencyList } from 'react';
import { ExplicitStateMachine, StateMachineConfig, AgentInspectionReport } from './types';

export interface MachineSnapshot<TState extends string, TContext> {
  state: TState;
  context: TContext;
}

export type UseExplicitMachineReturn<TState extends string, TEvent extends { type: string }, TContext> = {
  state: TState;
  context: TContext;
  send: (event: TEvent) => boolean;
  can: (eventType: TEvent['type'], eventPayload?: any) => boolean;
  inspect: () => AgentInspectionReport;
  machine: ExplicitStateMachine<TState, TEvent, TContext>;
  [Symbol.iterator](): Generator<
    | MachineSnapshot<TState, TContext>
    | ((event: TEvent) => boolean)
    | ((eventType: TEvent['type'], eventPayload?: any) => boolean)
    | (() => AgentInspectionReport)
    | ExplicitStateMachine<TState, TEvent, TContext>,
    void,
    unknown
  >;
};

export function useExplicitMachine<TState extends string, TEvent extends { type: string }, TContext>(
  configOrFactory:
    | StateMachineConfig<TState, TEvent, TContext>
    | ExplicitStateMachine<TState, TEvent, TContext>
    | (() => ExplicitStateMachine<TState, TEvent, TContext>),
  deps: DependencyList = []
): [
  MachineSnapshot<TState, TContext>,
  (event: TEvent) => boolean,
  (eventType: TEvent['type'], eventPayload?: any) => boolean,
  () => AgentInspectionReport,
  ExplicitStateMachine<TState, TEvent, TContext>
] & {
  state: TState;
  context: TContext;
  send: (event: TEvent) => boolean;
  can: (eventType: TEvent['type'], eventPayload?: any) => boolean;
  inspect: () => AgentInspectionReport;
  machine: ExplicitStateMachine<TState, TEvent, TContext>;
} {
  const machine = useMemo(() => {
    if (typeof configOrFactory === 'function') {
      return configOrFactory();
    }
    if (configOrFactory instanceof ExplicitStateMachine) {
      return configOrFactory;
    }
    return new ExplicitStateMachine(configOrFactory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const [state, setState] = useState<TState>(machine.getState());
  const [context, setContext] = useState<TContext>(machine.getContext());

  useEffect(() => {
    setState(machine.getState());
    setContext(machine.getContext());

    return machine.subscribe((nextState, nextContext) => {
      setState(nextState);
      setContext(nextContext);
    });
  }, [machine]);

  const send = useCallback(
    (event: TEvent) => {
      return machine.send(event);
    },
    [machine]
  );

  const can = useCallback(
    (eventType: TEvent['type'], eventPayload?: any) => {
      return machine.can(eventType, eventPayload);
    },
    [machine]
  );

  const inspect = useCallback((): AgentInspectionReport => {
    return machine.inspect();
  }, [machine]);

  const snapshot: MachineSnapshot<TState, TContext> = useMemo(
    () => ({ state, context }),
    [state, context]
  );

  const result: any = {
    state,
    context,
    send,
    can,
    inspect,
    machine,
    *[Symbol.iterator]() {
      yield snapshot;
      yield send;
      yield can;
      yield inspect;
      yield machine;
    },
  };

  return result;
}
