import test from 'node:test';
import assert from 'node:assert/strict';
import { wantsThinking, validateThinkingBudget } from '../src/thinking.mjs';
import { fromAnthropicRequest } from '../src/anthropic.mjs';

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

test('Anthropic Thinking is checked after conversion to the upstream shape', () => {
  const original = {
    model: 'mock-model',
    max_tokens: 8192,
    thinking: { type: 'enabled', budget_tokens: 4096 },
    messages: [{ role: 'user', content: 'hello' }],
  };
  const enabled = fromAnthropicRequest(original, { allowThinking: true });
  assert.equal(enabled.thinking.type, 'enabled');
  assert.match(validateThinkingBudget(enabled, { mode: 'guarded', minTokens: 32768 }), /max_tokens/);
  assert.equal(validateThinkingBudget({ ...enabled, max_tokens: 60000 }, { mode: 'guarded' }), null);
  const disabled = fromAnthropicRequest(original, { allowThinking: false });
  assert.equal(disabled.thinking, undefined);
  assert.equal(validateThinkingBudget(disabled, { mode: 'off' }), null);
});
