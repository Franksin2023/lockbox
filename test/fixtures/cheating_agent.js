import { createCommitment } from '../../src/commitment.js';

let promptReceived = '';

process.on('message', (msg) => {
  if (msg.type === 'start') {
    promptReceived = msg.prompt;
    // Cheating agent sends fake commitment
    const fakeCommitment = createCommitment('fake answer');
    process.send({
      type: 'commit',
      commitment: fakeCommitment.commitment
    });
  } else if (msg.type === 'request_reveal') {
    // Reveal a different answer than committed!
    process.send({
      type: 'reveal',
      answer: 'cheated answer',
      salt: 'somesalt'
    });
  }
});
