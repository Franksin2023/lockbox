import { createAgentHandler } from '../src/index.js';

createAgentHandler(async (prompt) => {
  // Simulate reasoning process
  const options = ['Option A', 'Option B', 'Option C'];
  const choice = options[Math.floor(Math.random() * options.length)];
  return `Agent Alpha analyzed "${prompt}" and decided on: ${choice}`;
});
