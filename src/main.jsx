import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import CompanionApp from './components/companion/CompanionApp.jsx'
import { runMigrations } from './lib/migrations.js'
import './index.css'

// A-08: run schema migrations once, synchronously, before either entry point
// renders — both the full app and the companion read/write the same mi_*
// record, so this must happen above the isCompanion branch, not inside it.
runMigrations()

// Companion renders for its own path (/companion/) or the legacy ?companion=1 query.
const isCompanion =
  /(^|\/)companion(\/|$)/.test(window.location.pathname) ||
  new URLSearchParams(window.location.search).has('companion')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isCompanion ? <CompanionApp /> : <App />}
  </StrictMode>,
)
