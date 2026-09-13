import { createAgentHandler } from '../src/index.js';

createAgentHandler(async (prompt) => {
  const actions = ['Action A', 'Action B', 'Action C'];

  // Selection strategy: Always chooses Action C deterministically
  const selectedAction = 'Action C';

  return {
    agent: 'agent_lockbox_demo_3',
    strategy: 'always_action_c',
    prompt,
    selectedAction,
    options: actions,
    timestamp: new Date().toISOString()
  };
});
