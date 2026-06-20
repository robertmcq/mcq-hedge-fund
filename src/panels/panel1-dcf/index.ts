/**
 * Panel 1 — Reverse DCF Engine
 * Public API surface for this module.
 */

export { runReverseDCF } from './engine';
export { formatSnapshot, formatBridge } from './formatter';
export type {
  Security,
  Fundamentals,
  ProjectionScenario,
  ReverseDCFConfig,
  ReverseDCFInput,
  ReverseDCFSnapshot,
  ExpectationsBridgeRow,
  HouseProjection,
  DCFEngineResult,
} from './types';
