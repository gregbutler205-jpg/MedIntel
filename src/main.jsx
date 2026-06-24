import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import CompanionApp from './components/companion/CompanionApp.jsx'
import './index.css'

// Companion renders for its own path (/companion/) or the legacy ?companion=1 query.
const isCompanion =
  /(^|\/)companion(\/|$)/.test(window.location.pathname) ||
  new URLSearchParams(window.location.search).has('companion')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isCompanion ? <CompanionApp /> : <App />}
  </StrictMode>,
)
