// ── Onboarding configuration constants (ONBOARDING_SPEC v1.1) ────────────────
// Single config file for every deterministic threshold the onboarding flow
// uses. High-consequence logic (§4.5 staleness, §5.2 confirmation matrix,
// §6 artifact triggers) must be driven by these named constants — never by
// literals scattered through components.

// §4.5 Document staleness rule (medications and conditions only).
// ≤ WARN months: no flag. WARN–HISTORICAL: staleness badge. > HISTORICAL or
// null doc_date: badge + medication status defaults to Historical.
export const STALE_WARN_MONTHS = 12;
export const STALE_HISTORICAL_MONTHS = 24;

// §3.3 / §4.2 file intake limits.
export const MAX_FILE_MB = 50;
export const MAX_FILES_PER_BATCH = 20;
export const PASTE_CHAR_CAP = 100_000;

// §4.3 vision path.
export const VISION_MAX_IMAGES_PER_DOC = 6;
export const VISION_LONGEST_EDGE_PX = 2000;
export const VISION_JPEG_QUALITY = 0.8;
export const SCANNED_PDF_TEXT_YIELD_CHARS_PER_PAGE = 200; // below this average → vision fallback
export const SCANNED_PDF_FALLBACK_PAGE_CAP = 20;

// §4.4 confidence presentation bands (presentation metadata only — never
// changes §5.2 confirmation requirements).
export const CONFIDENCE_HIGH = 0.85;
export const CONFIDENCE_LOW = 0.5;

// §5.1 rejected staged items: soft-delete retention before purge.
export const REJECT_RETENTION_DAYS = 30;

// §5.2 confirmation matrix (binding). perItem: every item needs explicit
// individual confirmation; bulk: "Accept all high-confidence" allowed.
// Medications, allergies, and conditions may NEVER be bulk-accepted (C3).
export const CONFIRMATION_MATRIX = {
  medication:   { perItem: true,  bulk: false },
  allergy:      { perItem: true,  bulk: false },
  condition:    { perItem: true,  bulk: false },
  lab:          { perItem: false, bulk: true },
  vital:        { perItem: false, bulk: true },
  procedure:    { perItem: false, bulk: true },
  immunization: { perItem: false, bulk: true },
  care_team:    { perItem: false, bulk: true },
};

// §3.4 fixed category review order — high-consequence first.
export const CATEGORY_REVIEW_ORDER = [
  "medication", "allergy", "condition", "care_team", "lab", "procedure", "immunization",
];

// §7 task engine display cap.
export const MAX_VISIBLE_TASKS = 4;
