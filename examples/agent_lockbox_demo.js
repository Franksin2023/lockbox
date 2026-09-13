import { createAgentHandler } from '../src/index.js';

createAgentHandler(async (prompt) => {
  const actions = ['Action A', 'Action B', 'Action C'];
  // Select choice deterministically or randomly based on prompt
  const choiceIndex = prompt ? Math.abs(prompt.length) % actions.length : 0;
  const selectedAction = actions[choiceIndex];

  return {
    prompt,
    selectedAction,
    options: actions,
    timestamp: new Date().toISOString()
  };
});
