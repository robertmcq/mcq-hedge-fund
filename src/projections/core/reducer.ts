/**
 * Projection Core — generic reducer engine.
 *
 * applyEvents folds an ordered event list through a reducer
 * into a final state. This is the engine all panel projections use.
 *
 * Discipline rule: this function is pure. No DB calls, no side-effects.
 */

import type { LedgerEvent } from '../../events/ledger/types';

export type Reducer<S> = (state: S, event: LedgerEvent) => S;

export function applyEvents<S>(events: LedgerEvent[], reducer: Reducer<S>, initialState: S): S {
  let state = initialState;
  for (const event of events) {
    try {
      state = reducer(state, event);
    } catch (err) {
      console.error(
        `[applyEvents] Reducer error at seq=${event.seq} type=${event.event_type}:`,
        (err as Error).message
      );
      // Reducer errors do NOT halt replay — bad events are skipped, state preserved
    }
  }
  return state;
}
