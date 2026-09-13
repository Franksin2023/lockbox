import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createCommitment, verifyCommitment, generateSalt } from '../src/commitment.js';

describe('Commitment Engine', () => {
  test('createCommitment generates hash and salt', () => {
    const answer = '42';
    const res = createCommitment(answer);

    assert.ok(res.commitment);
    assert.ok(res.salt);
    assert.strictEqual(res.answer, '42');
    assert.strictEqual(res.commitment.length, 64); // sha256 hex length
  });

  test('verifyCommitment validates correct answer and salt', () => {
    const answer = 'apple';
    const salt = generateSalt();
    const res = createCommitment(answer, salt);

    assert.strictEqual(verifyCommitment(res.commitment, answer, salt), true);
  });

  test('verifyCommitment rejects tampered answer', () => {
    const answer = 'original';
    const res = createCommitment(answer);

    assert.strictEqual(verifyCommitment(res.commitment, 'tampered', res.salt), false);
  });

  test('verifyCommitment rejects invalid salt', () => {
    const answer = 'secret';
    const res = createCommitment(answer);

    assert.strictEqual(verifyCommitment(res.commitment, answer, 'wrongsalt'), false);
  });

  test('handles object payload commitment', () => {
    const obj = { answer: 100, confidence: 0.95 };
    const res = createCommitment(obj);

    assert.strictEqual(res.answer, JSON.stringify(obj));
    assert.strictEqual(verifyCommitment(res.commitment, obj, res.salt), true);
  });
});
