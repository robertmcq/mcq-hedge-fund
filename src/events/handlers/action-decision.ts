/**
 * Handler: ActionDecision
 * Routes approve/modify/reject through Panel 5 workflow and optionally emits TradeExecuted.
 */

import { bus } from '../bus';
import { ActionDecisionPayload, DomainEvent } from '../types';

bus.subscribe<ActionDecisionPayload>(
  'ActionDecision',
  async (event: DomainEvent<ActionDecisionPayload>) => {
    const { action_id, decision, user_id } = event.payload;
    console.log(`[ActionDecision] action=${action_id} decision=${decision} by=${user_id}`);
    // TODO: applyApprovalDecision(state, req)
    // TODO: if approved and trade payload -> emit TradeExecuted or route to execution adapter
  }
);
