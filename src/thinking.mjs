// Deterministic, local preflight policy for the upstream's reasoning variant.
// It cannot cap upstream reasoning tokens; guarded mode only rejects requests
// whose total output budget is known to be too small.
export const THINKING_MODES = Object.freeze(['off', 'guarded', 'passthrough']);

export function wantsThinking(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const effort = payload.reasoning_effort ?? payload.reasoning?.effort;
  if (typeof effort === 'string') {
    if (!['none', 'off', 'disabled'].includes(effort.toLowerCase())) return true;
  } else if (effort !== undefined && effort !== null && effort !== false) {
    return true;
  }
  if (payload.reasoning === true || payload.enable_thinking === true) return true;
  if (payload.thinking === true) return true;
  if (payload.thinking && typeof payload.thinking === 'object') {
    return payload.thinking.type === 'enabled' || payload.thinking.enabled === true;
  }
  return false;
}

export function validateThinkingBudget(payload, { mode = 'off', minTokens = 32768 } = {}) {
  if (mode !== 'guarded' || !wantsThinking(payload)) return null;
  const tokens = payload.max_tokens;
  if (Number.isSafeInteger(tokens) && tokens >= minTokens) return null;
  return `Thinking in guarded mode requires an explicit max_tokens >= ${minTokens}; got ${JSON.stringify(tokens ?? null)}. Raise max_tokens or set CNB2API_THINKING_MODE=passthrough. This is a precaution, not a guarantee that the upstream will finish reasoning.`;
}
