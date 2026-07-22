// ── Daily question limit tests (OPEN-17a, Greg 2026-07-21: 15/day) ───────────
// Pins the limit value, per-turn counting, the local-midnight reset, and the
// corrupted-state fallback. Run: npm run test:daily-limit

class Storage {
  constructor() { this._m = new Map(); }
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; }
  setItem(k, v) { this._m.set(k, String(v)); }
  removeItem(k) { this._m.delete(k); }
  clear() { this._m.clear(); }
  key(i) { return [...this._m.keys()][i] ?? null; }
  get length() { return this._m.size; }
}
globalThis.Storage = Storage;
globalThis.localStorage = new Storage();

const {
  DAILY_QUESTION_LIMIT,
  questionsUsedToday,
  questionsRemainingToday,
  dailyLimitReached,
  recordQuestionSent,
} = await import("../src/lib/dailyQuestionLimit.js");

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS — " + m); } else { fail++; console.log("FAIL — " + m); } };

const TODAY = new Date("2026-07-21T15:00:00");
const TONIGHT = new Date("2026-07-21T23:59:00");
const TOMORROW = new Date("2026-07-22T00:01:00");

ok(DAILY_QUESTION_LIMIT === 15, "the limit is 15 per day (Greg, 2026-07-21)");

// Fresh day
ok(questionsUsedToday(TODAY) === 0 && questionsRemainingToday(TODAY) === 15 && !dailyLimitReached(TODAY),
  "fresh day: 0 used, 15 remaining, not reached");

// Counting
recordQuestionSent(TODAY);
recordQuestionSent(TODAY);
recordQuestionSent(TODAY);
ok(questionsUsedToday(TODAY) === 3 && questionsRemainingToday(TODAY) === 12, "3 sends → 3 used, 12 remaining");

// Reach the cap
for (let i = 0; i < 12; i++) recordQuestionSent(TODAY);
ok(questionsUsedToday(TONIGHT) === 15 && dailyLimitReached(TONIGHT) && questionsRemainingToday(TONIGHT) === 0,
  "15 sends → limit reached, 0 remaining (same calendar day, late evening)");

// Local-midnight reset
ok(!dailyLimitReached(TOMORROW) && questionsRemainingToday(TOMORROW) === 15,
  "next calendar day: counter resets to a fresh 15");
recordQuestionSent(TOMORROW);
ok(questionsUsedToday(TOMORROW) === 1, "post-reset counting starts over");

// Corrupted state falls back to a fresh day, never a lockout
localStorage.setItem("insina_ai_daily", "{not json");
ok(questionsRemainingToday(TODAY) === 15 && !dailyLimitReached(TODAY), "corrupted counter → treated as fresh day (fail open, proxy caps backstop)");
localStorage.setItem("insina_ai_daily", JSON.stringify({ date: "2026-07-21", count: -5 }));
ok(questionsRemainingToday(TODAY) === 15, "negative/nonsense count → treated as fresh day");

console.log(`\n${pass} passed, ${fail} failed (daily-question-limit)`);
process.exit(fail ? 1 : 0);
