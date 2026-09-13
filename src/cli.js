import { createCommitment, verifyCommitment } from './commitment.js';
import { runAgents } from './runner.js';

export function printHelp() {
  console.log(`
Lockbox - Isolated Agent Runner & Simultaneous Commit-Reveal Engine

Usage:
  lockbox <command> [options]

Commands:
  run <agent-scripts...>   Run agent scripts isolated, lock commitments, and reveal simultaneously.
  commit <answer>          Generate SHA-256 commitment hash and salt for an answer.
  verify <commitment> <answer> <salt>
                           Verify if an answer and salt match the commitment hash.

Options:
  --prompt, -p <text>      Prompt input passed to agents in 'run' command.
  --json                   Output results as formatted JSON.
  --help, -h               Show help information.
  --version, -v            Show CLI version.

Examples:
  $ lockbox run agent1.js agent2.js --prompt "What is 2+2?"
  $ lockbox commit "My secret answer"
  $ lockbox verify 1a2b3c... "My secret answer" 4d5e6f...
`);
}

export async function cli(args) {
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log('0.1.0');
    return;
  }

  const jsonOutput = args.includes('--json');
  const filteredArgs = args.filter((arg) => arg !== '--json');
  const command = filteredArgs[0];

  switch (command) {
    case 'commit': {
      const answer = filteredArgs[1];
      if (!answer) {
        console.error('Error: Please provide an answer string to commit.');
        process.exitCode = 1;
        return;
      }
      const result = createCommitment(answer);
      if (jsonOutput) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`Commitment: ${result.commitment}`);
        console.log(`Salt:       ${result.salt}`);
        console.log(`Answer:     ${result.answer}`);
      }
      break;
    }

    case 'verify': {
      const commitment = filteredArgs[1];
      const answer = filteredArgs[2];
      const salt = filteredArgs[3];

      if (!commitment || !answer || !salt) {
        console.error('Error: Usage: lockbox verify <commitment> <answer> <salt>');
        process.exitCode = 1;
        return;
      }

      const isValid = verifyCommitment(commitment, answer, salt);
      if (jsonOutput) {
        console.log(JSON.stringify({ verified: isValid }, null, 2));
      } else {
        if (isValid) {
          console.log('✅ Commitment Verified: VALID');
        } else {
          console.log('❌ Commitment Verification FAILED: INVALID');
          process.exitCode = 1;
        }
      }
      break;
    }

    case 'run': {
      let prompt = '';
      const promptIdx = filteredArgs.findIndex((a) => a === '--prompt' || a === '-p');

      const agentPaths = [];
      for (let i = 1; i < filteredArgs.length; i++) {
        if (i === promptIdx) {
          prompt = filteredArgs[i + 1] || '';
          i++; // skip value
        } else if (filteredArgs[i].startsWith('--prompt=')) {
          prompt = filteredArgs[i].slice('--prompt='.length);
        } else {
          agentPaths.push(filteredArgs[i]);
        }
      }

      if (agentPaths.length === 0) {
        console.error('Error: Please specify at least one agent script path to run.');
        process.exitCode = 1;
        return;
      }

      if (!jsonOutput) {
        console.log(`🔒 Initializing Lockbox execution for ${agentPaths.length} agent(s)...`);
        if (prompt) console.log(`💬 Prompt: "${prompt}"`);
        console.log('--------------------------------------------------');
      }

      try {
        const results = await runAgents(agentPaths, { prompt });

        if (jsonOutput) {
          console.log(JSON.stringify(results, null, 2));
          return;
        }

        console.log('\n🔓 Phase 1 & Phase 2 Complete: Simultaneous Reveals\n');
        let allValid = true;

        results.forEach((res, index) => {
          console.log(`Agent #${index + 1}: ${res.agent}`);
          console.log(`  Status:     ${res.verified ? '✅ VERIFIED' : '❌ INVALID/FAILED'}`);
          console.log(`  Commitment: ${res.commitment || 'N/A'}`);
          console.log(`  Answer:     ${res.answer !== null ? JSON.stringify(res.answer) : 'N/A'}`);
          console.log(`  Salt:       ${res.salt || 'N/A'}`);
          if (res.error) console.log(`  Error:      ${res.error}`);
          console.log('--------------------------------------------------');

          if (!res.verified) allValid = false;
        });

        if (!allValid) {
          process.exitCode = 1;
        }
      } catch (err) {
        console.error(`Error running agents: ${err.message}`);
        process.exitCode = 1;
      }
      break;
    }

    default: {
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exitCode = 1;
      break;
    }
  }
}
