---

# Decision Log Amendment — Precaution Corpus (DEC-P16 … DEC-P42)

*Appended 2026-07-22. Continues the DEC-P sequence, which previously ended at DEC-P15.
Produced from the liver handbook corpus work. Final DEC-NNN assignment happens at merge
into DECISIONS.md. See MASTER_INDEX.md for the open-item list and correction log.*

---

## DEC-P16 — Transplant substance flag table (feature)
**Status:** Accepted
**Decision:** Insina maintains a deterministic table of substances (food, beverage,
supplement, herbal, OTC, Rx) that transplant center patient handbooks tell patients to
avoid, limit, or ask about.
**Rationale:** Narrow, high-acuity rule set a generic PHR won't build for an 850k
population. Surfaces what centers already tell their own patients rather than originating
clinical claims.
**Constraint:** Table is deterministic. AI never originates a flag and never clears one.
Same architecture as the tripwire engine. Extends "flag, don't fix" to substances.

## DEC-P17 — Output is always question-form
**Status:** Accepted (GB)
**Decision:** Insina never phrases a substance flag as an assertion, a prohibition, or a
sourced claim. Every output is a question the patient asks their team. "Should I avoid
grapefruit?"
**Rationale (GB):** Named sources arm the patient to assert borrowed authority at their own
clinician, inverting the relationship and making Insina the authority. Question-form keeps
clinician judgment first. This is what "AI proposes, patient disposes" means operationally.
**Supersedes:** earlier proposals for named sources, source counts, ratios, or a generic
provenance line in the patient UI. All rejected.
**Consequence:** provenance is INTERNAL ONLY. Source registry, DEC, design history file.
Not patient-facing.
**Closes:** true-contradiction handling. A question makes no claim, so there is nothing to
contradict and no adjudication logic to build.

## DEC-P18 — Flags are population-level, never patient-conditioned
**Status:** Accepted
**Decision:** Flags fire on population membership (transplant recipient, organ, phase).
Never conditioned on the patient's own medication list.
**Rationale:** "This interacts with your tacrolimus" is an individualized interaction alert
and drifts toward the CDS boundary that drug-level trend interpretation is deliberately held
behind. Population-level lookup is reference information.

## DEC-P19 — Corpus definition and two-pool separation
**Status:** Accepted
**Selection corpus:** transplant center patient handbooks only. These and only these produce
the N-of-M consensus count.
**Verification tier:** TxPharm COP reference collection, DailyMed labels, LiverTox, MSK
About Herbs, Flockhart CYP450 table, NIH ODS, FDA/CDC food safety booklet, AASLD/AST
guideline. Provides mechanism, aliases, evidence grade, tier validation.
**Rule:** pools never merge into one count. "What transplant centers tell their own
patients" is the regulatory framing and must stay clean.
**Narrow exception to consider:** anything named in a first-line immunosuppressant's FDA
label may enter at Caution regardless of manual count. Not yet accepted.

## DEC-P20 — A source is a CENTER, not a file
**Status:** Accepted
**Decision:** `source_count` = distinct CENTERS naming a substance. Multi-file handbooks
count as one source. Dedupe by hash before mapping files to centers.
**Trigger:** Michigan is 12 chapter files. Counted per file it single-handedly clears any
threshold. `Michigan - ResourcesLiver.pdf` and `UM - ResourcesLiver.pdf` are byte-identical.
**Without this rule the methodology is decorative.**

## DEC-P21 — Union rule
**Status:** Accepted (GB)
**Decision:**
- Every substance in the user's center guide enters at that center's stated strength.
- Every substance in the consensus table enters at its consensus tier.
- The user sees the UNION. Nothing is ever suppressed.
- **Omission is not permission.** A center's silence never removes a consensus flag.
- Consensus never removes a user's-center flag, even at source_count 1.
**Display:** user's center first. As Insina's own paraphrase, never the center's verbatim
text. Per DEC-P17 this surfaces as a question, not an attribution.

## DEC-P22 — Runtime documents are display-only in safety features
**Status:** Accepted
**Decision:** No document uploaded or fetched at runtime participates in flag logic. Tier
assignment happens only in the curated table. Patient uploads land in Documents and, at
most, an admin curation queue.
**Rationale:** extraction recall failures are invisible to human review. They must happen in
a curation pass where they are catchable, never mid-session.

## DEC-P23 — Pre- and post-transplant are separate tables
**Status:** Accepted
**Decision:** Two tables. Separate corpora, separate M, separate consensus counts. No
shared rows. No merge. The lookup resolves table by PHASE before it resolves substance.
**Evidence, not theory:** Michigan permits acetaminophen ≤2 g/day post-transplant as the
recommended analgesic; the ceiling differs in decompensated cirrhosis. Grapefruit's flag is
driven by calcineurin inhibitors a pre-transplant patient isn't taking. Same substance,
opposite guidance.
**Failure mode this prevents:** one bad join, one defaulted field, or one stale phase shows
the inverted flag. Worse than shipping no feature.

## DEC-P24 — Phase is a required field with no safe default
**Status:** Accepted in principle (GB: "it needs to")
**Decision:** Tier 0 captures an explicit pre/post gate. Phase is never inferred. Transition
is an explicit user action with confirmation.
**Consequence:** pre-transplant users are a SEGMENT EXPANSION. The pilot cohort is
post-transplant. Pre-transplant may be a post-pilot segment even though its corpus is built
now.
**Open:** transition UX, and whether pre-transplant is in the pilot at all.

## DEC-P25 — Bucket assignment
**Status:** Accepted (GB)
| Bucket | Contents | Feeds |
|---|---|---|
| A | Liver recipient post-transplant center handbooks | Post-tx consensus table |
| B | Liver pre-transplant center guides | Pre-tx content + separate table |
| C | Living donor guides | Donor Q&A. Never flag material. |
| D | Society/advocacy | Education link-out, eval fixtures |
| X | Kidney-pancreas, non-liver | Excluded |
"Out of the consensus count" is not "out of the app." C and D ship; they just never vote.

## DEC-P26 — Adequacy gate replaces recency cutoff
**Status:** Proposed. **GB decision required.**
**Decision:** Corpus eligibility turns on whether a document contains actual substance
guidance, not on its date. Recency is a tiebreaker WITHIN the adequate set, not a gate.
**Evidence that killed the recency cutoff:**
- OSU pre-transplant brochure, rev. Mar 2026, newest file in the set: zero mentions of
 tacrolimus, grapefruit, or any drug.
- Penn State, 70 pages, Sep 2023: zero mentions of grapefruit.
- Stanford 2004, the document a cutoff was designed to exclude: among the richest.
Both new-but-empty documents clear a 2018 cutoff and add nothing but denominator, which is
the same suppression mechanism the cutoff was meant to prevent.
**Corollary:** only UF states a revision date inside the document. Content markers
(Envarsus, Mavyret, REMS, pomelo) are better currency evidence than any date field.
**Open:** the gate's operational definition.

## DEC-P27 — Tiebreaker: Michigan
**Status:** Accepted, pre-registered criteria
**Scope:** explanation and mechanism WORDING at extraction time only. Never overrides a flag.
**Criteria:** (1) dedicated medications chapter, (2) dedicated diet/nutrition chapter,
(3) mechanisms stated rather than bare lists, (4) current content.
**Determination:** Michigan. Only verified center meeting all four, and the only document in
the corpus carrying the current regimen (Envarsus XR, Mavyret/Epclusa, mycophenolate REMS,
pomelo).

## DEC-P28 — Source registry and update cadence
**Status:** Accepted
**Registry:** one row per source. Center, document, version/date, verified, **terms**
(stated reproduction/permission language), URL, hash, bucket, which table entries cite it.
**Table versioning:** like the CSC (v1.0, v1.1) with a changelog. Any flag shown to any
patient traces to a table version and its source versions.
**Cadence:** quarterly admin review against the registry; annual full re-check. DailyMed
label-change feeds may be automated early at near-zero cost. Everything else manual.
**Update workflow:** new version → re-extract → diff against current table → changed rows
go through the same disposition review as new rows → increment table version. **Never
hot-patch a live safety table.**

## DEC-P29 — Corpus read path
**Status:** Accepted (GB saves to computer)
**Decision:** Reads pin to ONE tree by folder ID. GB maintains the local PC folder, so reads
pin to the Drive for Desktop **backup mirror**. Writes go to My Drive > Insina.
**RETRACTED:** earlier instruction to delete or archive the second tree. It is a computer
backup; deleting from it can remove local files. Never delete a backup mirror.

## DEC-P30 — Copyright posture
**Status:** Accepted; questions routed to existing attorney review
**Principle:** copyright protects expression, not facts. Extract facts, publish an original
table (our normalization, our one-liners, our tier arithmetic, our organ tags).
**Method constraints (do not relax under time pressure — they are the whole position):**
paraphrase under 15 words, citations not excerpts, never reproduce manual text.
**RETRACTED:** (a) curated center-guide library hosting complete copyrighted works;
(b) "show the center's language first" read as verbatim text.
**Note:** Stanford's manual carries an explicit no-reproduction-without-permission notice.
Assume others do until verified. Public posting is not a license to redistribute.
**Survives:** link out rather than host; patient's own upload stays in the patient's own
storage (non-custodial architecture is load-bearing here); drop the admin queue step that
promoted an upload into a distributable library copy.
**Gates:** hosting, display wording, distribution. **Does NOT gate extraction.**
**Attorney questions:** (1) does fact extraction into an original database create exposure,
and does attribution mitigate or aggravate; (2) can we display a paraphrase attributed to a
named center without a license; (3) status of a patient-uploaded copy under non-custodial
storage; (4) do publisher TDM/AI-training reservations bind us if we never ingest the text.

## DEC-P31 — Model routing for corpus extraction
**Status:** Accepted
**Decision:** Extraction and tier judgment run on the most capable model (Fable). Not
settled implementation work.
**Rationale:** human review catches wrong rows but cannot catch MISSING ones. Recall failure
is invisible to review. High consequence-of-error. One-time corpus build over \~6-10
documents; cost savings are noise against one missed contraindication.
**Sonnet 5:** evaluation list for runtime phrasing (low consequence, fixed fields) after
fixtures exist, and for Code execution of settled specs.
**Migration note if adopted in the proxy:** new tokenizer produces \~30% more tokens for the
same text, and non-default sampling parameters are rejected. Check proxy config before
swapping model strings.
**Method (from MGB/JAMA, Apr 2026):** evaluate stepwise per stage, not averaged accuracy.
Averaging masks the weak stage. Applies to the Haiku/Sonnet routing evals.

## DEC-P32 — Extraction cadence
**Status:** Accepted
**Decision:** One center per session. Extract to a structured file, write it back to Drive,
move on. Merge pass operates on extracted tables, never on source PDFs.
**Rationale:** batching manuals to save sessions is the same error as routing to a cheaper
model. Context pressure produces recall failures, and recall failures are invisible.

---

## Open, requiring GB decision before extraction

| Ref | Item |
|---|---|
| DEC-P26 | Adequacy gate operational definition |
| — | Stanford 2004: rich content vs. superseded guidance |
| — | THRESHOLD_AVOID / THRESHOLD_CAUTION against final M(A). **Set before extraction.** |
| — | M(B): confirm option (b), citation-only pre-transplant display. M(B)=3 at best. |
| DEC-P24 | Phase transition UX; pre-transplant in pilot or not |
| — | Written permission requests to centers (not blocking; changes posture if granted) |

## Parked

- Caregiver as second user persona. Insina has no caregiver concept. Record even a
 "not in pilot" decision.
- Consultation Prep boundary. Patient-carried, clinician-read. Assertive form, NOT
 question-form. Do not let DEC-P17 leak into it, or its form leak back.
- Behavioral don'ts (raw food handling, gardening, cat litter). V2 educational checklist,
 not a lookup. V1 is ingestibles only.
- CSC rule 10 remains parked and out of scope.

---

## DEC-P33 — LiverTox: scope restricted to one mechanism category

**Status:** Accepted
**Source:** LiverTox, NIH/NIDDK, NCBI Bookshelf. Public domain (US government work).
1,707 drug entries, 157 herbal/dietary supplement entries. Structured master list
available as XLSX.

### Decision
The LiverTox **Likelihood Score** (A–E) populates **graft and organ toxicity rows only**.
This is category 2 of the four-category mechanism taxonomy.

It is **never** used for:
- Tier assignment across the table
- Interaction risk (category 1)
- Infection risk (category 3)
- Immune stimulation (category 4)
- OTC safety for transplant patients

Applies to **both** the pre- and post-transplant tables.

### Rationale
LiverTox measures probability of drug-induced liver injury. It does not measure
interaction with immunosuppressants, and it has no knowledge that it is describing
transplant recipients. Using the score as a general tier produces confident inversions:

| Substance | LiverTox | Actual post-transplant guidance |
|---|---|---|
| Acetaminophen | **A** (well-established hepatotoxin) | **Recommended** analgesic; Michigan permits ≤2 g/day |
| Pseudoephedrine | **E** (unlikely injury) | **Avoid** — named explicitly by AST |
| Phenylephrine | **E** | **Avoid** — named explicitly by AST |
| St. John's Wort | **E** | **Avoid** — CYP3A4 induction crashes tacrolimus |
| Green tea extract | **A** | Avoid — and **only** LiverTox catches this |
| Echinacea | **D** | Caution — immune stimulation; LiverTox cannot see this |

Wired to tier assignment, the table would tell a transplant patient that Tylenol is
dangerous and Sudafed is safe, with NIH provenance behind it.

### Why LiverTox stays in the post-transplant table
**The graft is a liver.** Hepatotoxins injure a transplanted liver as they injure a native
one. No center handbook names a single botanical, so this category has no other source.
LiverTox supplies rows nothing else would: green tea extract, turmeric, kava, black cohosh,
Polygonum multiflorum, Tinospora (all A); ashwagandha, chaparral, garcinia, ephedra,
kratom (B); high-dose iron, vitamin A, copper (A[HD]); branded weight-loss products.

**Transplant-specific amplification:** herbal DILI in a graft recipient presents as
elevated liver enzymes, which triggers a rejection workup. The harm is diagnostic confusion
on top of direct injury, in a patient whose LFT abnormalities are already being read as
possible rejection.

### Pre-transplant alignment
For pre-transplant the hepatotoxicity axis is largely the correct axis, and LiverTox may
serve as the **primary** source for that axis rather than a verification layer. This is a
candidate resolution to the M(B) blocker (see DEC-P26 open items) and would remove the
need for handbook consensus on the hepatotoxicity axis specifically.

Three caveats that survive into pre-transplant:
1. **Scores measure probability, not consequence.** Derived from cases in patients with
 normal hepatic reserve. A score of E is not clearance for a decompensated cirrhotic.
2. **Acetaminophen still over-flags.** Remains the preferred analgesic in cirrhosis at a
 reduced ceiling. The number comes from AASLD guidance and pre-transplant handbooks,
 not from LiverTox.
3. **No visibility into decompensation.** Sodium/ascites, encephalopathy, variceal bleeding,
 hepatorenal risk. LiverTox knows none of it. Second axis required.

### Additional permitted uses
- Herbal identity, botanical names, and aliases (feeds the alias table)
- Evidence-grade confirmation that a documented case literature exists
- Interaction facts **from entry narrative prose only**, never from the score. St. John's
 Wort's entry mentions interactions 19 times and induction 22 times while scoring E.

### Data quality notes
- Brand-name column gives *a* brand, not the primary one (cyclosporine listed as Sangcya,
 rifampin as IsonaRif). Usable for alias seeding, not authoritative.
- Classification is by therapeutic class, not by interaction mechanism. It will not sort
 the four mechanism categories.

---

## DEC-P34 — Source freshness monitoring

**Status:** Accepted (GB)
**Supersedes:** the cadence provisions of DEC-P28, which assumed a single manual
quarterly review across all sources. Registry schema and update workflow from DEC-P28
are unchanged.

### Decision
Three monitoring tiers, because sources fail in different ways.

#### Tier 1 — Programmatic, quarterly
| Source | Endpoint | Notes |
|---|---|---|
| LiverTox changelog | `/books/n/livertox/updates/` | Dated entries, \~monthly batches |
| LiverTox master list | XLSX linked from `/books/n/livertox/masterlistintro/` | **Resolve the link each run.** Filename encodes date (`masterlist02-26.xlsx`) and changes on release; a hardcoded URL will break silently. |
| FDA labels | DailyMed label-change feeds | First-line immunosuppressants only |

**Known lag:** the XLSX trails the site. Header read "Last Update: January 30, 2026" while
the changelog ran through July 7, 2026. **Diff the XLSX for structured changes, but read the
changelog for what is actually new.** The spreadsheet alone silently misses months.

#### Tier 2 — Manual, quarterly (GB)
Center handbooks. **Check the center's patient-education page, not the stored PDF URL.**

Observed failure mode is silent URL death, not content revision: UCSF's handbook URL 404s,
Methodist Dallas is dead, Hopkins sits behind Cloudflare and cannot be fetched
programmatically. A stored URL returning nothing tells you nothing about whether the
handbook changed.

Registry records `last_verified` date and `url_status` per source. A dead URL is a registry
flag; it does not alter the table.

#### Tier 3 — Opportunistic
Patient uploads. When a patient uploads their center's guide, compare against the registry
version. If newer, it enters the admin curation queue.

This makes users the freshness signal for their own center, which is the only reliable
mechanism for centers that do not publish. It does not change the table directly; curation
still runs per DEC-P22 (runtime documents are display-only in safety features).

### Rules on change handling
1. **A score downgrade never auto-removes a row.** It flags for human disposition. "AI never
 clears a flag" applies to source changes, not only to runtime. LiverTox moving a
 substance from A to C is a review trigger, not a deletion.
2. **New source entries land in the holding queue, not production.**
3. **Changed rows go through the same disposition review as new rows.**
4. **Table version increments only after human disposition.**
5. **Never hot-patch a live safety table.** (Restates DEC-P28.)

### Date semantics
The registry records **publication or revision date, never date received.** Ochsner's
handbook is © 2017 and 172 pages; GB received it in January 2025. Those are different
facts and only the first belongs in the registry. This applies to every guide a patient
uploads.

---

## DEC-P35 — Mandatory inclusion floor

**Status:** Accepted (GB: "Grapefruit is a must include")
**Supersedes:** the open FDA-label-override question in DEC-P19 and the deferred
question in the correction log below.

### Decision
Certain substances enter the table **regardless of consensus count**. Consensus arithmetic
can add rows. It can never remove a mandatory row, and a mandatory row does not need to
clear any threshold.

### Rule 1 — FDA label floor
Any substance named in a first-line immunosuppressant's FDA label (tacrolimus, cyclosporine,
mycophenolate, sirolimus, everolimus) enters the post-transplant table at minimum tier
Caution, irrespective of how many handbooks name it.

### Rule 2 — Mechanism relatives
If a substance is in the table and a second substance shares its documented mechanism, the
second enters at the same tier or one tier lower, even below threshold.

**Worked example.** Grapefruit is in by consensus and by Rule 1 (named in the Prograf label).
Pomelo and Seville/bitter orange share the furanocoumarin CYP3A4 mechanism. Pomelo appears
in only one of five counted centers and Seville orange in none, so consensus alone would
drop both. Rule 2 admits them. This is the intended behavior: the mechanism is identical and
patients do not distinguish the fruits.

### Rationale
Handbook depth varies enormously and consensus counting systematically punishes substances
that only thorough handbooks bother to name. St. John's Wort appears in zero of the five
counted centers despite being the most universally accepted supplement interaction in
transplant pharmacology and being named in the Prograf label. Without a floor, the table
omits the best-established items while including well-covered but less consequential ones.

The floor is defensible because it is **pre-registered and criterion-based**, not curated by
judgment. "Named in the label of a drug the patient is taking" is a rule anyone can audit.
"Greg thinks this one matters" is not.

### Confirmed mandatory members
| Substance | Basis |
|---|---|
| Grapefruit and grapefruit juice | Rule 1 (Prograf label) + consensus |
| Pomelo | Rule 2 (furanocoumarin/CYP3A4) |
| Seville / bitter orange | Rule 2 (furanocoumarin/CYP3A4) |
| St. John's Wort | Rule 1 (Prograf label) |

The list is not closed. Rules 1 and 2 govern; membership follows from them.

### Constraints
1. **Post-transplant table only.** The pre-transplant table has a different mechanism axis
 (DEC-P33); grapefruit's flag is driven by calcineurin inhibitors a pre-transplant
 patient is not taking. Mandatory membership does not cross phases.
2. **Output form is unchanged.** Mandatory rows surface as questions like every other row
 (DEC-P17). "Must include" governs presence in the table, not assertiveness in the UI.
3. **Mandatory rows survive re-extraction.** A quarterly check that finds fewer handbooks
 naming grapefruit does not demote or remove it. Verified explicitly in the quarterly run
 sheet.
4. **Rule 2 requires a documented shared mechanism**, not a superficial resemblance. Citrus
 generally is not a furanocoumarin relative; sweet oranges and lemons do not qualify.

---

## Amendment to DEC-P28
Registry gains two columns: `url_status` (live / dead / blocked) and `last_verified`.
The `terms` column (stated reproduction/permission language) is unchanged.
Cadence provisions are superseded by DEC-P34.

---

## Correction log

Recorded so the reasoning behind current source rankings is auditable.

**AST TxPharm COP Reference Collection — earlier characterization was wrong.**
Previously described as "professional-grade transplant pharmacy reference material," "the
anchor of the verification layer," and "arguably ahead of MSK." It is an **annotated
bibliography of research literature**. The Liver chapter is 75 pages and 24,000 words with
204 mentions of tacrolimus and **zero** mentions of grapefruit, zero CYP3A4, and two of
"herbal." Useful for tracking the literature. Not a source for a substance table.
**Removed from the verification tier.**

**Starzl Network medications resource — pediatric.** 22 pages, December 2020, 21 references
to "your child." Rich on grapefruit (15) and pomelo (6), no named botanicals. Retain as
verification tier with the pediatric caveat recorded.

**AST Safe OTC Medications handout — retained, pediatric-framed.** Two pages. Names specific
decongestant ingredients (pseudoephedrine, phenylephrine, oxymetazoline), NSAIDs, aspirin,
acetaminophen, diphenhydramine. Herbals handled as a class. Structured as a **safe list**
rather than an avoid list, which is a distinct and possibly more useful data shape.

**Grapefruit consensus alarm — retracted.** An earlier finding that grapefruit appeared in
only 1 of 5 handbooks was an artifact of sampling whichever PDFs were publicly downloadable.
Of those five, only one was an adequate post-transplant handbook. With Ochsner and UW added,
grapefruit appears in 3 of 5 (and in Michigan, which is not in the counted set). The
FDA-label override question raised on that basis is now **closed by DEC-P35**, which
adopts a mandatory inclusion floor rather than a count-based override.

---

## DEC-P36 — Rule 3: class-implied inclusion

**Status:** Accepted (GB: "If it's just generic reference, I think we should include those
from Michigan")

### Decision
A named item enters the table at single-source count when both hold:
1. The item falls inside a class that other sources flag at class level, and
2. No source contradicts it.

**Class-level silence is corroboration, not dissent.**

### Rationale, with evidence
Michigan names St. John's Wort as an example inside its own class statement. Ochsner,
Oregon, and others carry the same class statement without naming examples. They are not
disagreeing about St. John's Wort; their class statement covers it. The difference is
granularity, not position.

**The decisive evidence is that Michigan is the source of both artifacts.** Michigan's
patient handbook says do not use herbal or dietary supplements without consulting the team.
Michigan researchers published "Estimated Exposure to 6 Potentially Hepatotoxic Botanicals
in US Adults" (Likhitsup et al., *JAMA Network Open*, Aug 2024,
DOI 10.1001/jamanetworkopen.2024.25822) naming turmeric, green tea, ashwagandha, black
cohosh, Garcinia cambogia, and red yeast rice.

The same institution holds both the class statement and the specific list. The class
statement is therefore a choice about what belongs in a patient handbook, not evidence of
ignorance. Rule 3 formalizes that reading.

### Effect
Generalizes past St. John's Wort. Any named supplement found in any adequate handbook enters
by the same route, because every adequate handbook carries the herbal class statement.

---

## DEC-P37 — Rows are named by form, not by substance

**Status:** Proposed. **Constraint is factual; formal acceptance required.**

### Decision
Every row is named by its **form of preparation**. Any row whose name is also a common food
or beverage requires an explicit form qualifier before it ships.

- "Green tea extract or green tea supplements" — never "green tea"
- "Turmeric or curcumin supplements" — never "turmeric"
- "Garlic supplements" — never "garlic"

`form` becomes a required extraction field.

### Trigger
LiverTox's entry is titled **Green Tea** and scores **A**. The entry states plainly that
drinking green tea has **not** been associated with liver injury or aminotransferase
elevations, and that cross-sectional studies associate regular consumption with *lower* ALT
and AST. The A score belongs to green tea **extract**, concentrated catechins, appearing
largely in weight-loss products (Hydroxycut, Dexatrim, SlimQuick, Green Tea Fat Burner;
Exolise was withdrawn in Spain and France in 2003).

A small number of injury cases involve green tea "infusions," but the cited examples are
concentrated tonic preparations taken on a weekly or biweekly schedule, not ordinary tea.

**Matching on the LiverTox entry name would tell a transplant recipient to stop drinking
tea, contradicted by the source being cited.**

### Not isolated
| Entry name | Hazardous form | Harmless form |
|---|---|---|
| Green Tea | concentrated extract, weight-loss products | brewed tea |
| Turmeric | concentrated curcumin supplements | spice in food |
| Garlic | supplement doses | cooking |
| Licorice | concentrated extract | most candy |

### Why it matters beyond accuracy
Trust asymmetry. A missed row is invisible. A ridiculous row is memorable and discredits
every other flag in the app.

---

## DEC-P38 — Supplement rows are a recognizer, not a risk table

**Status:** **ACCEPTED (GB, 2026-07-22).**

### Question that prompted it
GB: "Should we just say 'Before taking any supplements, consult your transplant team' and
leave it at that."

That option is defensible: it is what 5 of 6 handbooks actually say, it is the strongest
consensus in the dataset, it costs nothing to maintain, and it cannot be wrong about any
specific substance.

### The gap it leaves
The class statement assumes a conversation that is not happening. Likhitsup's finding is
that clinicians do not necessarily ask about supplement use and most users start on their
own. The patient reads "consult your team before any supplement" and does not, because they
do not classify turmeric as a supplement. It is a spice, it is for their joints, it is
natural. **The recognition step fails before the consultation step.**

### Proposal
Keep the class statement as the safety content. Demote the item list from a risk table to a
**recognizer**. Output is not a stronger warning, it is the same disposition triggered by a
name the patient would not have self-classified:

> **Turmeric supplements** — this counts as a supplement. Should I stop taking it?

The claim is "turmeric is a supplement," not "turmeric is hepatotoxic." Much weaker claim,
and the one actually supportable.

### Consequences (now in force)
1. **Mislabeling stops mattering.** Fontana's \~50% label-mismatch finding breaks a risk
 claim about turmeric. It does not touch a recognition claim, which holds regardless of
 bottle contents.
2. **LiverTox scores leave the patient-facing layer entirely.** Internal prioritization
 only: which names to include, which to surface first. The DEC-P33 inversion trap
 becomes largely unreachable because nothing patient-facing reads a score.
3. **The supplement table simplifies to a name list.** No tiers, no consensus counting, no
 mechanism one-liners for supplements. LiverTox's 157 HDS entries become an alias list.
 Large reduction against what was specced.

### Honest cost
Still a name list to maintain, still quarterly LiverTox monitoring, still curation. If the
goal is genuinely zero maintenance, the class-statement-only option is the answer and the
accepted cost is that turmeric users will not self-identify.

### Line to hold either way
**Do not let the item list become a risk-grading table.** That is where both the regulatory
exposure and the maintenance burden live, and where the sources disagree most.

---

## DEC-P39 — Clinician disposition layer

**Status:** Accepted in principle (GB: "I really like that")
**Design not settled.**

### Decision
When a deterministic flag fires and the patient takes it to their team, the team's response
is captured against that row: who said it, when, and what they said in the patient's own
words. Future flags on that row respect the stored disposition.

### It is one primitive, not several features
Flag fires on population default → patient asks team → team gives patient-specific guidance
→ guidance stored → future flags respect it.

Labs and substances are two instances. So is "your center's guide doesn't mention this."
**Build as a layer over the tripwire engine, not per-feature.**

### Worked example (GB, real)
Tacrolimus flagged low at 3.2 against a lab reference of 5–20. Dr. Zapata's target for GB is
**3–5**. Without the stored range the app reads every result against the lab's generic band.
GB's most recent tac was 5.8, which reads differently against 3–5 than against 5–20.

### This is the moat, stated plainly
Not the storage architecture. Not the flags. The accumulated set of clinician dispositions
that no EHR holds in structured form and that makes every subsequent flag more accurate. A
competitor copies the substance table in a weekend. They cannot copy two years of a team's
answers. This is the patient-curated reconciled record layer the existing framing already
names as the actual differentiation.

### Four constraints, all required before build
1. **Bounded override.** A stored range shifts the reference band; it never disables the
 tripwire. A target of 3–5 makes 3.2 unremarkable. It must not make 0.8 unremarkable.
 Emergency thresholds stay with the deterministic engine; a disposition narrows the normal
 band *inside* them. Otherwise a stored answer becomes a way to silence the thing that
 exists not to be silenced. Cross-reference: both ends of a critical range can be
 life-threatening.
2. **Dispositions expire.** Michigan's own chapter states target levels and doses change
 over time. A target captured at 18 months post-transplant may be wrong at four years.
 Every disposition carries a date and a re-confirm prompt, and the app shows its age
 rather than presenting it as current fact.
3. **Provenance and source type.** Patient-reported (heard in conversation) is not the same
 as document-sourced (after-visit summary, clinical note). Both usable, not equally
 reliable. A misremembered conversation silently suppressing flags is exactly what
 "flag, don't fix" exists to prevent.
4. **Whose disposition.** A transplant hepatologist setting a tacrolimus target is
 authoritative; a PCP would not be, on that. Record who said it and make it visible.
 **The app does not adjudicate.**

---

## DEC-P40 — Capture hierarchy

**Status:** Accepted in principle. Ordering proposed.

### Routes, strongest provenance first
1. **Clinical note or after-visit summary.** Document-sourced. Available under Cures Act
 information-blocking rules without delay. Already in the import pipeline; this is
 pointing an existing capability at flagged questions.
2. **Ask the clinician to document it.** "Could you put my target range in the after-visit
 summary?" Costs seconds, creates a durable record in both systems, no consent question,
 no audio, no transcription. **Insina prompts the patient to ask for the answer to be
 documented.** Arguably better than recording.
3. **Patient recording with consent** (DEC-P41). Catches what was said but not
 documented.
4. **Post-visit typed or dictated capture.** Weakest provenance, no dependencies.

### No route is universally available
GB's care spans Ochsner, SCRMC, Hattiesburg Clinic, and Pine Belt Dermatology — four
systems, different tooling, different individual habits. Dr. Zapata does not use an ambient
scribe. **The disposition layer cannot depend on any single route.**

**Therefore route 4 is the floor, not the fallback, and it has to be good.**

Two things make it good enough:
- **Capture immediately.** Prompt on the way out, not that evening. Memory decay is the main
 weakness and timing is most of the fix.
- **Confirm at the next visit.** "You noted her target for you is 3–5. Still current?"
 Upgrades patient-reported to confirmed over time and handles expiry naturally.

Note: GB's 3–5 range survived to this conversation on memory alone with no tooling.
Post-visit capture is not a downgrade from recording; it is what is already happening, given
somewhere to live.

### Correction recorded
An earlier claim that ambient scribes make route 1 broadly automatic was wrong. Ambient
scribes are a documentation *method*, not documentation. Clinicians write notes regardless,
and a transplant hepatologist would routinely document a target trough. Route 1 is not
automatic but is not dead.

---

## DEC-P41 — Recording consent

**Status:** Accepted (GB directed)

### Decision
**Consent is asked contemporaneously, every time. Permission is never stored as a standing
grant.**

History affects phrasing only:
| Prior state | Prompt |
|---|---|
| Never asked | "Would it be alright if I record, so I get the instructions right?" |
| Previously yes | "Is it still ok if I record our visit?" |
| Previously no | Fresh ask, no presumption of prior permission |

**Invariant: the app never records without a contemporaneous yes.**

### Rationale (GB)
Two-party statutes require awareness at the time of recording. A stored yes from March is
not consent in July; it is a record that consent once existed. Policies shift underneath:
the hospital adopts a media policy, the practice joins a system, the clinician has one bad
experience. Storing permission would have Insina asserting something it cannot know.

### Supporting requirements
- **Script the ask.** "Can I record this?" reads as litigious. "Can I record so I get the
 instructions right?" reads as a patient trying to comply. Supplying the phrasing is a
 feature.
- **Fallback ask if declined:** "Could you summarize what we decided so I can record just
 that part?" Smaller ask, more often granted, less incidental content, and the clinician
 speaks deliberately.
- **Put the consent exchange at the head of the recording.** Self-documenting; the artifact
 that matters if the question ever arises.
- **Graceful third path** when both asks are declined: route 4 of DEC-P40.

### Recording is a memory backstop, not a primary source (GB)
It is a fallback when patient and clinician memory fail or disagree. It does not replace the
clinical note or patient memory.

### OPEN — GB decision required
**Store-and-replay vs transcribe-and-propose.**
- *Store-and-replay* matches GB's stated framing and carries almost no risk. The audio is
 the artifact; the patient listens.
- *Transcribe-and-propose* is more convenient and reintroduces the misheard-range problem.
 A proposed "5 to 10" that the patient clicks through is wrong in exactly the invisible way.
- **If transcribe-and-propose is chosen, the guardrail is that any AI-proposed disposition
 links to its timestamp in the audio, so confirmation means listening rather than
 accepting.**

### Deferred to legal (existing scope)
- MS/LA recording consent, already on the legal list. **Cohort dimension is new:** a pilot
 spreads across states with different rules, and health systems have their own policies
 regardless of state law.
- Proxy exposure. A full audio transcript of a clinical encounter is a different order of
 sensitivity than a lab value and contains material the patient never intended to store.
 Must be settled before any audio or transcript leaves the device.

---

## DEC-P42 — Retire the single-center tiebreaker (DEC-P27)

**Status:** PROPOSED. **GB decision required.**

### Proposal
Retire the Michigan tiebreaker designation. Write mechanism one-liners from the **union** of
stated mechanisms across sources. Where mechanisms conflict, record both. Where a mechanism
needs grounding beyond the handbooks, use the verification tier (FDA label for interaction,
LiverTox for hepatotoxicity), not another handbook.

### Three arguments
1. **Michigan won a two-horse race.** At the time of designation the verified pool was
 Michigan, Stanford (2004), UT Southwestern (a marketing page), and file metadata for
 everything else. It was a default, not a determination.
2. **Criterion 4 does not hold.** Michigan's currency was *inferred* from content markers
 (Envarsus, Mavyret, REMS, pomelo). Its revision date remains unlocated and sits in the
 registry as "not stated." UW states 11/2025 on its record page. On the criterion that
 mattered most, the newer source has evidence and the incumbent has inference.
3. **It solves a problem already solved elsewhere.** Mechanism one-liners are Insina's own
 words by copyright rule, so "whose wording wins" was never the question. The merge spec
 already records `mechanism_candidates` as distinct and explicitly does not merge them.
 A tiebreaker would override that — the same shape as the "default to one center"
 precedence rule already corrected earlier in this work.

### Michigan's actual contribution, verified from the full chapter
Not supplements. It names **exactly one**: St. John's Wort, with mechanism, naming all four
affected drugs. Everything else is the same class statement the other centers use.

Its real differentiators:
- **Pomelo** named alongside grapefruit, repeated per drug. Only UW also has it.
- **Explicit hedging on an uncertain trio.** Papaya, pomegranate, star fruit described as
 having very limited information available, with studies suggesting possible fluctuation.
 Not an avoid statement. `strength_as_written` must capture this as distinct, and it is a
 model for how Insina should phrase uncertain rows.
- **Acetaminophen with a number and a permission.** 2,000 mg per 24 hours, explicitly may be
 taken without contacting the team. No other source gives both.
- **NSAIDs with mechanism.** Interaction plus kidney failure, with brand examples. Most
 sources say only "avoid."

Those are food and mechanism strengths. They survive fine as **data contributions** without
Michigan holding authority over everyone else's wording.

---

## Verification tier addition

| Source | Detail |
|---|---|
| **Likhitsup et al., JAMA Network Open, Aug 2024** | "Estimated Exposure to 6 Potentially Hepatotoxic Botanicals in US Adults." DOI 10.1001/jamanetworkopen.2024.25822. NHANES 2017–2020. |

**Cross-referenced against LiverTox:**

| Botanical | LiverTox | 30-day prevalence | Leading reason given |
|---|---|---|---|
| Turmeric | A | 3.46% | joint health / arthritis (26.8% of users) |
| Green tea | A | 1.01% | energy (27.2%) |
| Black cohosh | A | 0.38% | menopausal symptoms |
| Ashwagandha | B | 0.38% | energy |
| Garcinia cambogia | B | 0.27% | weight loss (majority) |
| Red yeast rice | C | 0.19% | cholesterol |

4.7% of adults surveyed took at least one over 30 days; \~15 million adults regularly.
Five of six are LiverTox A or B.

**Turmeric is the highest-yield row in the table.** Most consumed by a wide margin, LiverTox
A, leading reason is joint pain. GB manages gout on allopurinol and colchicine.

**Constraint carried from the same work:** Fontana's analytical chemistry found roughly a
50% mismatch between labeled and actual ingredients. Item-level flagging has a ceiling
because of this, which independently supports keeping the class statement primary and item
rows as an enhancement layer.

**Tone to match.** The authors state they are not creating alarm, only raising awareness
that these products are untested and unproven; the study measured exposure without
establishing causation. Question-form output lands in that register. An avoid-list would
overstate the evidence.

**Caveats for the registry.** Population is US adults generally, not transplant recipients;
prevalence transfers while risk is amplified. The separate 70% increase in
supplement-related liver transplants (2010–2020 vs 1994–2009) is cited secondhand in the
press release and **must be verified at source before use anywhere.**

---

## Not encoded: "reputable brand is fine"

GB's hepatologist advised she is comfortable with herbal tea from a reputable company, and
that the questions lie with unknown or overseas sources. Well-supported: LiverTox has a
dedicated Chinese and Asian herbal medicine subsection with several top-scale entries
(Polygonum multiflorum and Shou Wu Pian at A; Ba Jiao Lian and Sho Saiko To at B), and
adulteration is a real driver of herbal liver injury.

**But it is two axes and the app must not collapse them:**
- **Product integrity** — is it what the label says? Brand reputation genuinely reduces this.
- **Intrinsic pharmacology** — even a correctly labeled product acts. A reputable-brand
 St. John's Wort still induces CYP3A4, arguably more reliably than a mislabeled one.

For brewed herbal tea her answer holds on both axes. For concentrated extracts the second
axis does not care about brand. **Insina must not encode brand reputation as a general
safety rule**, because the app cannot tell which axis a given product sits on.

---

## Open items carried forward

| Ref | Item | Owner |
|---|---|---|
| DEC-P41 | Store-and-replay vs transcribe-and-propose | GB |
| DEC-P42 | Retire the tiebreaker | GB |
| DEC-P37 | Formal acceptance of form-qualifier rule | GB |
| DEC-P26 | Adequacy gate operational definition | GB |
| — | Stanford 2004 eligibility | GB |
| — | Thresholds against final M(A). Set before extraction. | GB |
| DEC-P24 | Phase field: Tier 0 gate, transition UX (GB deferred) | GB |
| — | Verify whether GB's Ochsner notes contain the 3–5 range | GB |
