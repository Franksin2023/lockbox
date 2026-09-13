import { test, describe } from 'node:test';
import assert from 'node:assert';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);
const binPath = path.resolve('bin/lockbox.js');

describe('CLI Integration', () => {
  test('lockbox commit outputs commitment hash and salt', async () => {
    const { stdout } = await execFileAsync('node', [binPath, 'commit', 'hello world']);
    assert.match(stdout, /Commitment:\s+[a-f0-9]{64}/);
    assert.match(stdout, /Salt:\s+[a-f0-9]+/);
    assert.match(stdout, /Answer:\s+hello world/);
  });

  test('lockbox commit --json outputs structured json', async () => {
    const { stdout } = await execFileAsync('node', [binPath, 'commit', 'secret', '--json']);
    const parsed = JSON.parse(stdout);
    assert.ok(parsed.commitment);
    assert.ok(parsed.salt);
    assert.strictEqual(parsed.answer, 'secret');
  });

  test('lockbox verify verifies valid commitment', async () => {
    const commitRes = await execFileAsync('node', [binPath, 'commit', 'test answer', '--json']);
    const { commitment, salt } = JSON.parse(commitRes.stdout);

    const verifyRes = await execFileAsync('node', [binPath, 'verify', commitment, 'test answer', salt]);
    assert.match(verifyRes.stdout, /Commitment Verified: VALID/);
  });

  test('lockbox run executes agents with json output', async () => {
    const agent1 = path.join('test', 'fixtures', 'agent1.js');
    const { stdout } = await execFileAsync('node', [
      binPath,
      'run',
      agent1,
      '--prompt',
      'hello',
      '--json'
    ]);

    const results = JSON.parse(stdout);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].verified, true);
    assert.strictEqual(results[0].answer, 'Agent1 response to: hello');
  });
});
