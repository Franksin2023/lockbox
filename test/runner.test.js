import { test, describe } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import { runAgents } from '../src/runner.js';

const fixture = (file) => path.join('test', 'fixtures', file);

describe('Isolated Agent Runner', () => {
  test('runs multiple agents in isolation and returns verified reveals', async () => {
    const results = await runAgents(
      [fixture('agent1.js'), fixture('agent2.js')],
      { prompt: 'What is capital of France?' }
    );

    assert.strictEqual(results.length, 2);

    assert.strictEqual(results[0].verified, true);
    assert.strictEqual(results[0].answer, 'Agent1 response to: What is capital of France?');
    assert.ok(results[0].commitment);
    assert.ok(results[0].salt);

    assert.strictEqual(results[1].verified, true);
    assert.strictEqual(results[1].answer, 'Agent2 answer');
    assert.ok(results[1].commitment);
    assert.ok(results[1].salt);
  });

  test('detects and flags cheating agent whose reveal does not match commitment', async () => {
    const results = await runAgents([fixture('cheating_agent.js')]);

    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].verified, false);
    assert.strictEqual(results[0].error, 'Commitment verification failed');
    assert.strictEqual(results[0].answer, 'cheated answer');
  });

  test('throws error if no agent paths provided', async () => {
    await assert.rejects(
      async () => {
        await runAgents([]);
      },
      /At least one agent script must be provided/
    );
  });
});
