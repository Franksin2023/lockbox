# Lockbox

> A Node.js CLI and framework that runs isolated agents, locks their answers with cryptographic commitments, and reveals them simultaneously.

## Features

- **Isolated Execution**: Runs agents in separate Node child processes to prevent cross-agent communication or influence prior to commitment.
- **Commit-Reveal Security**: Cryptographically locks agent answers using SHA-256 hash commitments and unique salts before any reveals take place.
- **Simultaneous Reveal**: Phase 2 reveal requests are only issued after *all* commitments are collected and locked.
- **Automatic Verification**: Verifies revealed answers against their initial commitments in constant-time to detect tampering or cheating.
- **CLI & Programmatic API**: Use `lockbox` from the command line or integrate directly into JavaScript/TypeScript applications.

---

## Installation

```bash
# Clone the repository and link locally
git clone https://github.com/lockbox/lockbox.git
cd lockbox
npm install
npm link
```

---

## Quick Start (CLI)

### 1. Run Agents in Isolation

```bash
lockbox run examples/agent_alpha.js examples/agent_beta.js --prompt "What is the optimal strategic move?"
```

Output:

```text
🔒 Initializing Lockbox execution for 2 agent(s)...
💬 Prompt: "What is the optimal strategic move?"
--------------------------------------------------

🔓 Phase 1 & Phase 2 Complete: Simultaneous Reveals

Agent #1: examples/agent_alpha.js
  Status:     ✅ VERIFIED
  Commitment: 8f9b...
  Answer:     "Agent Alpha analyzed \"What is the optimal strategic move?\" and decided on: Option A"
  Salt:       a1b2c3d4...
--------------------------------------------------
Agent #2: examples/agent_beta.js
  Status:     ✅ VERIFIED
  Commitment: 3e4f...
  Answer:     "Agent Beta processed \"What is the optimal strategic move?\" with high confidence..."
  Salt:       e5f6g7h8...
--------------------------------------------------
```

### 2. Output as JSON

```bash
lockbox run examples/agent_alpha.js examples/agent_beta.js --prompt "Query" --json
```

### 3. Generate Commitment Manually

```bash
lockbox commit "Secret payload answer"
```

### 4. Verify Commitment Manually

```bash
lockbox verify <commitment-hash> "Secret payload answer" <salt>
```

---

## Writing an Agent

Agents use `createAgentHandler` to handle incoming prompt requests and lock commitments automatically:

```javascript
// my_agent.js
import { createAgentHandler } from 'lockbox';

createAgentHandler(async (prompt) => {
  // Compute answer in isolation
  const answer = computeAnswer(prompt);
  return answer;
});
```

---

## Programmatic Usage

```javascript
import { runAgents, createCommitment, verifyCommitment } from 'lockbox';

// Run agents programmatically
const results = await runAgents(['./agent1.js', './agent2.js'], {
  prompt: 'Choose action'
});

console.log(results);
```

---

## Testing

Run the full test suite:

```bash
npm test
```

---

## License

MIT
