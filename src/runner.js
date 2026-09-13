import { fork } from 'node:child_process';
import path from 'node:path';
import { verifyCommitment } from './commitment.js';

/**
 * Runs multiple agent scripts in isolation using child processes.
 * Enforces a strict commit-reveal protocol:
 * Phase 1: All agents run in isolation and post their commitment (hash).
 * Phase 2: Once ALL commitments are received and locked, agents are requested to reveal (answer + salt).
 * Phase 3: Revealed answers are verified against locked commitments and returned simultaneously.
 *
 * @param {string[]} agentPaths - List of agent script file paths.
 * @param {object} [options] - Options like prompt string or environment vars.
 * @returns {Promise<Array<{ agent: string, commitment: string, salt: string, answer: string, verified: boolean, error?: string }>>}
 */
export async function runAgents(agentPaths, options = {}) {
  if (!Array.isArray(agentPaths) || agentPaths.length === 0) {
    throw new Error('At least one agent script must be provided.');
  }

  const { prompt = '', timeout = 10000 } = options;

  // Phase 1: Spawn all agent processes in isolation and gather commitments
  const agentInstances = agentPaths.map((agentPath, index) => {
    const fullPath = path.resolve(agentPath);
    const child = fork(fullPath, [], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    return {
      id: index + 1,
      path: agentPath,
      fullPath,
      child,
      stdout,
      stderr,
      commitment: null,
      reveal: null,
      status: 'pending'
    };
  });

  try {
    // 1. Gather Commitments from all agents
    const commitments = await Promise.all(
      agentInstances.map((inst) => getAgentCommitment(inst, prompt, timeout))
    );

    // 2. Lock commitments state
    const lockedCommitments = commitments.map((c) => ({ ...c }));

    // 3. Request Reveals from all agents simultaneously (now that ALL commitments are locked)
    const results = await Promise.all(
      agentInstances.map(async (inst, idx) => {
        const locked = lockedCommitments[idx];
        if (inst.status === 'failed') {
          return {
            agent: inst.path,
            commitment: null,
            salt: null,
            answer: null,
            verified: false,
            error: inst.error || 'Failed during commitment phase'
          };
        }

        try {
          const reveal = await getAgentReveal(inst, timeout);
          const isVerified = verifyCommitment(locked.commitment, reveal.answer, reveal.salt);

          return {
            agent: inst.path,
            commitment: locked.commitment,
            salt: reveal.salt,
            answer: reveal.answer,
            verified: isVerified,
            error: isVerified ? null : 'Commitment verification failed'
          };
        } catch (err) {
          return {
            agent: inst.path,
            commitment: locked.commitment,
            salt: null,
            answer: null,
            verified: false,
            error: err.message
          };
        }
      })
    );

    return results;

  } finally {
    // Cleanup process handles
    for (const inst of agentInstances) {
      if (inst.child && !inst.child.killed) {
        inst.child.kill();
      }
    }
  }
}

function getAgentCommitment(inst, prompt, timeoutMs) {
  return new Promise((resolve) => {
    let timer = setTimeout(() => {
      inst.status = 'failed';
      inst.error = `Timeout waiting for commitment (${timeoutMs}ms)`;
      resolve({ commitment: null, error: inst.error });
    }, timeoutMs);

    inst.child.on('message', function onMessage(msg) {
      if (msg && msg.type === 'commit') {
        clearTimeout(timer);
        inst.commitment = msg.commitment;
        inst.status = 'committed';
        inst.child.removeListener('message', onMessage);
        resolve({ commitment: msg.commitment });
      }
    });

    inst.child.on('error', (err) => {
      clearTimeout(timer);
      inst.status = 'failed';
      inst.error = err.message;
      resolve({ commitment: null, error: err.message });
    });

    inst.child.on('exit', (code) => {
      if (inst.status === 'pending') {
        clearTimeout(timer);
        inst.status = 'failed';
        inst.error = `Process exited prematurely with code ${code}`;
        resolve({ commitment: null, error: inst.error });
      }
    });

    // Initiate execution by sending prompt message to agent process
    inst.child.send({ type: 'start', prompt });
  });
}

function getAgentReveal(inst, timeoutMs) {
  return new Promise((resolve, reject) => {
    let timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for reveal (${timeoutMs}ms)`));
    }, timeoutMs);

    inst.child.on('message', function onMessage(msg) {
      if (msg && msg.type === 'reveal') {
        clearTimeout(timer);
        inst.reveal = { answer: msg.answer, salt: msg.salt };
        inst.status = 'revealed';
        inst.child.removeListener('message', onMessage);
        resolve({ answer: msg.answer, salt: msg.salt });
      }
    });

    // Request agent process to reveal
    inst.child.send({ type: 'request_reveal' });
  });
}

/**
 * Helper utility for writing agent scripts that interact with Lockbox protocol.
 * @param {function(prompt: string): Promise<string>|string} answerFn
 */
export function createAgentHandler(answerFn) {
  let computedAnswer = null;
  let commitmentObj = null;

  process.on('message', async (msg) => {
    if (!msg || !msg.type) return;

    if (msg.type === 'start') {
      try {
        const rawAnswer = await answerFn(msg.prompt || '');
        computedAnswer = rawAnswer;
        const { createCommitment } = await import('./commitment.js');
        commitmentObj = createCommitment(computedAnswer);

        // Send commitment back to orchestrator
        process.send({
          type: 'commit',
          commitment: commitmentObj.commitment
        });
      } catch (err) {
        process.send({
          type: 'error',
          error: err.message
        });
      }
    } else if (msg.type === 'request_reveal') {
      if (!commitmentObj) {
        process.send({
          type: 'error',
          error: 'Reveal requested before commitment made'
        });
        return;
      }

      process.send({
        type: 'reveal',
        answer: commitmentObj.answer,
        salt: commitmentObj.salt
      });
    }
  });
}
