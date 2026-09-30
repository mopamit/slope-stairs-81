/* A separate bank for each pedagogical stage; usable in the browser and tests. */
(function (root) {
  'use strict';
  const stages = [
    { id: 'positive', title: 'שיפוע חיובי', accepts: (dx, dy) => dx > 0 && dy > 0 && dy < dx },
    { id: 'negative', title: 'שיפוע שלילי', accepts: (dx, dy) => dx > 0 && dy < 0 },
    { id: 'left', title: 'צועדים שמאלה', accepts: (dx, dy) => dx < 0 && dy > 0 },
    { id: 'horizontal', title: 'ישר אופקי', accepts: (dx, dy) => dx !== 0 && dy === 0 },
    { id: 'vertical', title: 'ישר אנכי', accepts: (dx, dy) => dx === 0 && dy !== 0 },
    { id: 'steep', title: 'שיפוע גדול מאחת', accepts: (dx, dy) => dx > 0 && dy > dx },
    { id: 'both-negative', title: 'שני שינויים שליליים', accepts: (dx, dy) => dx < 0 && dy < 0 },
    { id: 'fraction', title: 'מסכמים עם שבר', accepts: (dx, dy) => dx > 0 && dy < 0 && -dy < dx }
  ];
  const key = q => [...q.a, ...q.b].join(',');
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  const used = new Set();
  // Interleave slope groups so each bank varies both position and slope.
  const banks = stages.map(stage => {
    const groups = new Map();
    for (let ax = -4; ax <= 4; ax++) for (let ay = -4; ay <= 4; ay++) {
      for (let bx = -4; bx <= 4; bx++) for (let by = -4; by <= 4; by++) {
        const dx = bx - ax, dy = by - ay;
        if ((!dx && !dy) || !stage.accepts(dx, dy)) continue;
        // Avoid tiny segments; keep diagrams legible even on phones.
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 3) continue;
        const q = { a: [ax, ay], b: [bx, by], title: stage.title, stageId: stage.id };
        if (used.has(key(q))) continue;
        const divisor = gcd(Math.abs(dx), Math.abs(dy));
        const slope = dx === 0 ? 'vertical' : `${dy / divisor * Math.sign(dx)}:${Math.abs(dx / divisor)}`;
        if (!groups.has(slope)) groups.set(slope, []);
        groups.get(slope).push(q);
      }
    }
    const pool = [], queues = [...groups.values()];
    // Evenly spread choices across each group's coordinate arrangements.
    for (let round = 0; pool.length < 40; round++) {
      for (const group of queues) {
        if (pool.length === 40) break;
        const index = Math.floor(group.length * ((round * 0.61803398875) % 1));
        const q = group[index];
        if (q && !used.has(key(q))) { pool.push(q); used.add(key(q)); }
      }
    }
    return Object.freeze(pool.map(q => Object.freeze({ ...q, a: Object.freeze(q.a), b: Object.freeze(q.b) })));
  });
  function createDealer(random = Math.random, previous = {}) {
    const decks = banks.map(() => []);
    return {
      drawRun() {
        return banks.map((pool, i) => {
          if (!decks[i].length) {
            decks[i] = [...pool];
            for (let j = decks[i].length - 1; j > 0; j--) {
              const k = Math.floor(random() * (j + 1));
              [decks[i][j], decks[i][k]] = [decks[i][k], decks[i][j]];
            }
            if (key(decks[i].at(-1)) === previous[stages[i].id]) {
              [decks[i][0], decks[i][decks[i].length - 1]] = [decks[i].at(-1), decks[i][0]];
            }
          }
          const q = decks[i].pop();
          previous[stages[i].id] = key(q);
          return { ...q, a: [...q.a], b: [...q.b] };
        });
      },
      previous() { return { ...previous }; }
    };
  }
  const api = { stages, banks, createDealer, key };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SlopeQuestions = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
