import { createAgentHandler } from '../src/index.js';

createAgentHandler(async (prompt) => {
  return `Agent Beta processed "${prompt}" with high confidence. Final consensus score: 98.5%`;
});
