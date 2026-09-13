import { createAgentHandler } from '../src/index.js';

createAgentHandler(async (prompt) => {
  const actions = ['Action A', 'Action B', 'Action C'];

  // Selection strategy: Calculate sum of character codes in prompt
  let charSum = 0;
  for (let i = 0; i < prompt.length; i++) {
    charSum += prompt.charCodeAt(i);
  }

  // Pick action based on charSum modulo 3
  const choiceIndex = actions.length > 0 ? charSum % actions.length : 0;
  const selectedAction = actions[choiceIndex];

  return {
    agent: 'agent_lockbox_demo_2',
    strategy: 'character_code_hash',
    prompt,
    selectedAction,
    options: actions,
    timestamp: new Date().toISOString()
  };
});
