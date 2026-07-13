import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import CompanionApp from './components/companion/CompanionApp.jsx'
import { runMigrations } from './lib/migrations.js'
import { runTripwireEvaluation } from './lib/tripwire.js'
import { installInterception } from './lib/secureStorage.js'
import './index.css'

// P-02: install the localStorage interception before anything else touches
// mi_* keys. Locked reads of managed keys fail safe (return null) from the
// very first line, rather than only once LockScreen's unlock() runs — no
// stray boot-time code can see raw ciphertext.
installInterception()

// A-08: run schema migrations once, synchronously, before either entry point
// renders — both the full app and the companion read/write the same mi_*
// record, so this must happen above the isCompanion branch, not inside it.
// NOTE (P-02): this runs before any vault unlock, so a future migration that
// touches actual health data (not just metadata like mi_schema_version)
// cannot run here — it would only ever see locked-out nulls. Such a
// migration needs its own post-unlock hook; none of today's migrations
// (including P-02's own, which runs from LockScreen's setup flow, not this
// list) need one yet.
runMigrations()

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
