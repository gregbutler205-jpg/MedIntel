// ── Numeric-validator unit list — AI_SESSION_SPEC v0.3 Sec 9 ─────────────────
// (DEC-C-TBD-3.) Maintained DATA, same governance pattern as
// monitoredAnalytes.js: the validator engine contains no unit vocabulary of
// its own; everything it detects comes from this file. Owner and review tier
// are [CONFIRM] items in the spec — until resolved, treat every change here
// as founder-reviewed.
//
// CONTENTS ARE PROVISIONAL (v0.1) — drafted for founder approval, flagged in
// the session report. Additions widen what the validator can catch; removals
// let numbers through unchecked. Err wide: a false detection costs a blocked
// response, a missed unit costs an unvalidated clinical number.
//
// Shape: canonical unit → accepted surface forms (matched case-insensitively,
// word-bounded, adjacent to a numeral). Canonical names are what claims are
// normalized to; two values compare only within the SAME canonical unit —
// cross-unit conversion is prohibited by DEC-C-TBD-1, so "2 g" is NOT
// licensed by a 2000 mg claim.

export const UNIT_LIST_VERSION = "0.1-provisional";

export const UNITS = {
  mg:      ["mg", "milligram", "milligrams"],
  g:       ["g", "gram", "grams"],
  mcg:     ["mcg", "µg", "ug", "microgram", "micrograms"],
  ml:      ["ml", "milliliter", "milliliters", "millilitre", "millilitres"],
  l:       ["l", "liter", "liters", "litre", "litres"],
  "ng/ml": ["ng/ml"],
  meq:     ["meq"],
  mmhg:    ["mmhg"],
  degF:    ["°f", "degrees f", "degrees fahrenheit", "fahrenheit"],
  degC:    ["°c", "degrees c", "degrees celsius", "celsius"],
  tablet:  ["tablet", "tablets", "tab", "tabs"],
  capsule: ["capsule", "capsules", "cap", "caps"],
  pill:    ["pill", "pills"],
  dose:    ["dose", "doses"],
  drop:    ["drop", "drops"],
  puff:    ["puff", "puffs"],
  unit:    ["unit", "units"],
  hour:    ["hour", "hours", "hr", "hrs"],
  day:     ["day", "days"],
  week:    ["week", "weeks"],
  minute:  ["minute", "minutes", "min", "mins"],
  second:  ["second", "seconds", "sec", "secs"],
  time:    ["time", "times"],          // "2 to 3 times a day"
  kg:      ["kg", "kilogram", "kilograms"],
  lb:      ["lb", "lbs", "pound", "pounds"],
  bpm:     ["bpm"],
  percent: ["%", "percent"],
};
