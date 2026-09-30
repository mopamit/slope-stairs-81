const assert = require('node:assert/strict');
const { stages, banks, key, createDealer } = require('../questions.js');
assert.equal(banks.length, 8);
const all = new Set();
banks.forEach((bank, stage) => {
  assert.equal(bank.length, 40);
  bank.forEach(q => {
    assert.ok(q.a.concat(q.b).every(n => Number.isInteger(n) && n >= -5 && n <= 5));
    const dx=q.b[0]-q.a[0],dy=q.b[1]-q.a[1];
    assert.ok(dx || dy); assert.ok(stages[stage].accepts(dx,dy));
    assert.ok(!all.has(key(q))); all.add(key(q));
  });
});
let seed=82347;
const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const dealer=createDealer(random), seen=stages.map(()=>new Set());
let last;
for(let round=0;round<40;round++){
  const run=dealer.drawRun();
  run.forEach((q,i)=>{assert.ok(!seen[i].has(key(q)));seen[i].add(key(q));});last=run;
}
const fresh=dealer.drawRun();fresh.forEach((q,i)=>assert.notEqual(key(q),key(last[i])));
const restored=createDealer(random,dealer.previous()).drawRun();restored.forEach((q,i)=>assert.notEqual(key(q),key(fresh[i])));
assert.equal(all.size,320);
console.log('PASS: 320 unique exercises, stage constraints, 40 draws without repetition, refill and refresh exclusion.');
