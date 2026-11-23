// Runs the computer's search in the background (the page stays smooth while it thinks).
import { findBestMove } from '../../src/engine/ai.js';

self.onmessage = (e) => {
  const { fen, level } = e.data;
  const m = findBestMove(fen, level);
  self.postMessage(m ? { from: m.from, to: m.to, promotion: m.promotion ?? null } : null);
};
