import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAgents } from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Runs Lockbox agents, collects their verified outputs, and calculates a consensus summary.
 * @param {string} prompt - Prompt passed to agents.
 * @returns {Promise<object>} Consensus summary JSON object.
 */
export async function getConsensus(prompt = '') {
  const agents = [
    path.join(__dirname, 'agent_lockbox_demo.js'),
    path.join(__dirname, 'agent_lockbox_demo_2.js'),
    path.join(__dirname, 'agent_lockbox_demo_3.js')
  ];

  const results = await runAgents(agents, { prompt });

  const votes = {};
  const agentChoices = [];

  for (const res of results) {
    if (!res.verified || !res.answer) {
      continue;
    }

    let parsed = null;
    try {
      parsed = typeof res.answer === 'string' ? JSON.parse(res.answer) : res.answer;
    } catch {
      parsed = { selectedAction: res.answer };
    }

    const action = parsed.selectedAction || 'UNKNOWN';
    const agentName = parsed.agent || path.basename(res.agent);

    agentChoices.push({ agent: agentName, action });
    votes[action] = (votes[action] || 0) + 1;
  }

  // Find majority action
  let majorityAction = null;
  let maxVotes = 0;

  for (const [action, count] of Object.entries(votes)) {
    if (count > maxVotes) {
      maxVotes = count;
      majorityAction = action;
    }
  }

  const agreement = agentChoices.filter((c) => c.action === majorityAction).map((c) => c.agent);
  const dissent = agentChoices.filter((c) => c.action !== majorityAction).map((c) => ({
    agent: c.agent,
    chosenAction: c.action
  }));

  return {
    prompt,
    totalAgents: results.length,
    verifiedAgents: agentChoices.length,
    majorityAction,
    voteTally: votes,
    agreement,
    dissent,
    choices: agentChoices
  };
}

// Support direct CLI invocation
if (process.argv[1] && process.argv[1].endsWith('agent_consensus.js')) {
  const promptArg = process.argv[2] || '';
  getConsensus(promptArg)
    .then((summary) => {
      console.log(JSON.stringify(summary, null, 2));
    })
    .catch((err) => {
      console.error(`Error calculating consensus: ${err.message}`);
      process.exitCode = 1;
    });
}
