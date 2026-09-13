import crypto from 'node:crypto';

/**
 * Generate a cryptographically secure random salt.
 * @param {number} bytes - Number of random bytes (default 16).
 * @returns {string} Hex string representation of the salt.
 */
export function generateSalt(bytes = 16) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Compute SHA-256 commitment hash for a given answer and salt.
 * @param {string|object} answer - The answer payload to commit.
 * @param {string} [salt] - Optional salt string. Generated if not provided.
 * @returns {{ commitment: string, salt: string, answer: string }} Commitment result object.
 */
export function createCommitment(answer, salt = generateSalt()) {
  const normalizedAnswer = typeof answer === 'object' && answer !== null
    ? JSON.stringify(answer)
    : String(answer);

  const hash = crypto.createHash('sha256');
  hash.update(`${salt}:${normalizedAnswer}`);
  const commitment = hash.digest('hex');

  return {
    commitment,
    salt,
    answer: normalizedAnswer
  };
}

/**
 * Verify if an answer and salt match a given commitment hash.
 * @param {string} commitment - The commitment hash to verify against.
 * @param {string|object} answer - The answer payload to test.
 * @param {string} salt - The salt used during commitment creation.
 * @returns {boolean} True if commitment is valid, false otherwise.
 */
export function verifyCommitment(commitment, answer, salt) {
  if (!commitment || !salt || answer === undefined || answer === null) {
    return false;
  }

  const { commitment: expectedCommitment } = createCommitment(answer, salt);

  if (typeof commitment !== 'string' || commitment.length !== expectedCommitment.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(commitment, 'hex'),
      Buffer.from(expectedCommitment, 'hex')
    );
  } catch {
    return false;
  }
}
