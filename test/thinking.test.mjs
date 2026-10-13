import test from 'node:test';
import assert from 'node:assert/strict';
import { wantsThinking, validateThinkingBudget } from '../src/thinking.mjs';

test('thinking detection respects explicit disabled settings', () => {
  for (const body of [{}, { reasoning_effort: 'none' }, { enable_thinking: false },
    { thinking: { type: 'disabled' } }, { reasoning: { effort: 'off' } }]) {
    assert.equal(wantsThinking(body), false);
  }
  for (const body of [{ reasoning_effort: 'high' }, { enable_thinking: true },
    { thinking: { type: 'enabled' } }, { reasoning: { effort: 'medium' } }]) {
    assert.equal(wantsThinking(body), true);
  }
});

test('guarded mode fails closed when max_tokens is missing or too small', () => {
  const settings = { mode: 'guarded', minTokens: 32768 };
  for (const max_tokens of [undefined, null, 8192, 32767, 32768.5, '60000', -1]) {
    assert.match(validateThinkingBudget({ thinking: { type: 'enabled' }, max_tokens }, settings), /max_tokens/);
  }
  assert.equal(validateThinkingBudget({ thinking: { type: 'enabled' }, max_tokens: 32768 }, settings), null);
  assert.equal(validateThinkingBudget({ thinking: { type: 'enabled' }, max_tokens: 60000 }, settings), null);
});

test('plain requests and backwards-compatible opt-in remain unaffected', () => {
  const low = { max_tokens: 64, reasoning_effort: 'high' };
  assert.equal(validateThinkingBudget(low, { mode: 'off' }), null);
  assert.equal(validateThinkingBudget(low, { mode: 'passthrough' }), null);
  assert.equal(validateThinkingBudget({ max_tokens: 64 }, { mode: 'guarded' }), null);
});
