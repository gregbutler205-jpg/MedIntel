import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import CompanionApp from './components/companion/CompanionApp.jsx'
import { runMigrations } from './lib/migrations.js'
import { runTripwireEvaluation } from './lib/tripwire.js'
import { installInterception, hasVault, isDemoMode } from './lib/secureStorage.js'
import './index.css'

// P-02: install the localStorage interception before anything else touches
// mi_* keys. Locked reads of managed keys fail safe (return null) from the
// very first line, rather than only once LockScreen's unlock() runs — no
// stray boot-time code can see raw ciphertext.
// Demo installs (fictional dataset, no vault) keep plaintext storage: with the
// interception active and no DEK, every mi_* read returns null and the demo
// renders an empty record. isDemoMode() is false whenever a real vault exists.
if (!isDemoMode()) installInterception()

// A-08: run schema migrations once, synchronously, before either entry point
// renders — both the full app and the companion read/write the same mi_*
// record, so this must happen above the isCompanion branch, not inside it.
// P-02/A-12: ONLY when no vault exists (legacy plaintext installs, first
// run). With a vault present the record is locked here, every managed key
// reads null, and a data migration (A-12's mi_readings normalization
// onward) would silently no-op yet still stamp its version — permanently
// skipping itself. Encrypted installs migrate in LockScreen's afterUnlock()
// instead, once the record is actually readable.
if (!hasVault()) runMigrations()

// A-01: importing tripwire.js registers its mi-data-synced listener (module
// load side effect) so it evaluates on every future lab write regardless of
// which tab is open. Also run once now so the envelope reflects the current
// record immediately at boot, not only after the next write.
runTripwireEvaluation()

// Companion renders for its own path (/companion/) or the legacy ?companion=1 query.
const isCompanion =
  /(^|\/)companion(\/|$)/.test(window.location.pathname) ||
  new URLSearchParams(window.location.search).has('companion')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isCompanion ? <CompanionApp /> : <App />}
  </StrictMode>,
)
