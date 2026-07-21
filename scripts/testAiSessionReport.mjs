// ── Conversation-session report tests (2026-07-21 work order Part 2, DEC-042) ─
// Pins the deterministic half of the session model: the context-isolation
// helper (record + current session only — archives never reach the API), the
// section extraction + cross-turn dedup that replaces any AI summary step, the
// verbatim-as-displayed transcript (F-03 filter parity with the screen), and
// the single contact block. Run: npm run test:ai-session

import assert from "node:assert/strict";
import {
  apiMessagesForConv,
  extractQuestionSections,
  consolidateAcrossTurns,
  buildContactBlock,
  buildSessionReportText,
} from "../src/lib/aiSessionReport.js";

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS — " + m); } else { fail++; console.log("FAIL — " + m); } };

// ── Context isolation: archives NEVER enter API context ──────────────────────
{
  const messages = [
    { role: "user", text: "old question", conv: 0 },
    { role: "assistant", text: "old answer", conv: 0 },
    { role: "user", text: "current question", conv: 2 },
    { role: "assistant", text: "current answer", conv: 2 },
    { role: "user", text: "another current", conv: 2 },
  ];
  const api = apiMessagesForConv(messages, 2);
  ok(api.length === 3, `only the current session's turns are sent (got ${api.length} of 5)`);
  ok(!api.some(m => /old/.test(m.content)), "no archived-conversation content reaches the API");
  ok(api[0].role === "user" && api[1].role === "assistant", "roles are mapped for the API shape");
  ok(apiMessagesForConv(messages, 0).length === 2, "the archive is still retrievable by its own id (display), just never mixed in");
}

// ── Section extraction from one assistant turn ───────────────────────────────
{
  const turn = [
    "Your omeprazole was started since the last visit.",
    "",
    "**Questions for your care team**",
    "- I've started omeprazole twice daily since my last visit. Is there anything we need to watch or do differently with my transplant medications?",
    "- My records list colchicine as needed but it's not on my med list. Which of these am I still supposed to be taking?",
    "",
    "**Why you're asking:**",
    "- Omeprazole can raise your tacrolimus levels.",
    "- Omeprazole can reduce how much CellCept your body absorbs.",
    "- If your doctor's answer doesn't cover any of these, ask about that one directly.",
    "",
    "**Bottom line**",
    "Bring both items to your next visit.",
  ].join("\n");
  const { questions, education } = extractQuestionSections(turn);
  ok(questions.length === 2, `extracts both questions (got ${questions.length})`);
  ok(education.length === 2, `extracts education items, EXCLUDING the closing line (got ${education.length})`);
  ok(questions[0].startsWith("I've started omeprazole"), "question text survives verbatim");
  ok(!education.some(e => /doctor's answer doesn't cover/i.test(e)), "the mandated closing line is not treated as an item");
}

// ── Heading variants + section termination ───────────────────────────────────
{
  const plain = extractQuestionSections("Questions for your care team:\n- Q one\n-----\n- stray bullet after divider");
  ok(plain.questions.length === 1 && plain.questions[0] === "Q one", "plain (non-bold) heading parses; ----- divider ends the section");
  const numbered = extractQuestionSections("**Why you're asking**\n1. Fact one\n2. Fact two");
  ok(numbered.education.length === 2, "numbered items parse in the education section");
  const none = extractQuestionSections("Just a factual answer with no sections at all.");
  ok(none.questions.length === 0 && none.education.length === 0, "a turn with no sections yields nothing");
}

// ── Cross-turn consolidation + dedup ─────────────────────────────────────────
{
  const convMessages = [
    { role: "user", text: "turn 1", ts: "2026-07-21T14:00:00Z" },
    { role: "assistant", ts: "2026-07-21T14:00:30Z", text: "**Questions for your care team**\n- I've started omeprazole since my last visit. Is there anything we need to do differently?\n\n**Why you're asking**\n- Omeprazole can raise your tacrolimus levels." },
    { role: "user", text: "turn 2", ts: "2026-07-21T14:05:00Z" },
    { role: "assistant", ts: "2026-07-21T14:05:30Z", text: "**Questions for your care team**\n- I've started omeprazole since my last visit. Is there anything we need to do differently?\n- My med lists don't match. Which of these am I supposed to be taking?\n\n**Why you're asking**\n- Omeprazole can raise your Tacrolimus levels.\n- Magnesium supplements can interact with the timing of your other medications." },
  ];
  const { questions, education } = consolidateAcrossTurns(convMessages);
  ok(questions.length === 2, `duplicate question across turns collapses (got ${questions.length})`);
  ok(education.length === 2, `education dedup is case-insensitive ("tacrolimus" vs "Tacrolimus") (got ${education.length})`);
  ok(questions[0].includes("omeprazole") && questions[1].includes("med lists"), "first-appearance order preserved");
}

// ── Contact block: deterministic, 24-hr line first, single instance ──────────
{
  const team = [
    { name: "R. Patel MD", role: "Primary Care", phone: "555-0177" },
    { name: "M. Chen MD", specialty: "Hepatology", phone: "555-0100", phone24: "555-0142" },
    { name: "K. Jones RN", role: "Transplant Coordinator", phone: "555-0155" },
  ];
  const block = buildContactBlock(team);
  const lines = block.split("\n");
  ok(lines[1].includes("M. Chen") && lines[1].includes("24 hr: 555-0142"), "24-hour line ranks first with its number");
  ok(lines[2].includes("Coordinator"), "coordinator ranks second");
  ok(buildContactBlock([]).includes("No care team members are on file"), "empty care team gets an explicit fallback");
}

// ── Full report: header, per-turn timestamps, verbatim + F-03 parity ─────────
{
  const convMessages = [
    { role: "user", conv: 3, ts: "2026-07-21T14:00:00Z", text: "Should I worry about my new med?" },
    { role: "assistant", conv: 3, ts: "2026-07-21T14:00:45Z", mode: "standard", text: "Here is context.\n\nYou should increase your dose to 5 mg.\n\n**Questions for your care team**\n- I've started a new medication. Is there anything we need to do differently?\n\n**Why you're asking**\n- The new medication can affect your existing levels." },
  ];
  const report = buildSessionReportText({
    convMessages,
    careTeam: [{ name: "M. Chen MD", specialty: "Hepatology", phone24: "555-0142" }],
    startedAt: "2026-07-21T13:59:00Z",
    endedAt: "2026-07-21T14:10:00Z",
  });
  ok(report.startsWith("**AI Conversation Report**"), "report opens with the header");
  ok(report.includes("Session: July 21, 2026") , "header carries the session date/time");
  ok((report.match(/\(July 21, 2026/g) || []).length === 2, "every turn carries its own timestamp (one per turn; header stamps separately)");
  ok(report.includes("Should I worry about my new med?"), "user turns are verbatim");
  ok(!report.includes("increase your dose to 5 mg") && report.includes("Insina Health removed a line"),
    "assistant turns are verbatim-AS-DISPLAYED: the F-03 filter's redaction appears exactly as it did on screen");
  ok(report.includes("**Questions for your care team**") && report.includes("I've started a new medication"),
    "consolidated questions section present");
  ok(report.includes("**Why you're asking**") && report.includes("ask about that one directly"),
    "consolidated education section present with the single closing line");
  ok((report.match(/Contact your care team/g) || []).length === 1, "exactly one contact block");
  ok(report.indexOf("Contact your care team") > report.indexOf("Why you're asking"), "contact block is last");
}

// ── No-questions conversation still produces a well-formed report ────────────
{
  const report = buildSessionReportText({
    convMessages: [
      { role: "user", ts: "2026-07-21T14:00:00Z", text: "What date was my last ALT?" },
      { role: "assistant", ts: "2026-07-21T14:00:10Z", text: "Your last ALT was drawn July 15, 2026." },
    ],
    careTeam: [],
  });
  ok(report.includes("No care-team questions were generated"), "explicit no-questions fallback");
  ok(!report.includes("**Why you're asking**"), "empty education section is omitted entirely");
}

console.log(`\n${pass} passed, ${fail} failed (ai-session-report)`);
process.exit(fail ? 1 : 0);
