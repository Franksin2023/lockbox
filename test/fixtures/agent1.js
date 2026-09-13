import { createAgentHandler } from '../../src/runner.js';

createAgentHandler(async (prompt) => {
  return `Agent1 response to: ${prompt}`;
});
