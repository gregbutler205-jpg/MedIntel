export default function Sidebar({ tabs, activeTabId, onTabSelect }) {
  return (
    <nav style={{
      width: '220px',
      minWidth: '220px',
      height: '100vh',
      background: '#0d1526',
      borderRight: '1px solid #1e2d4a',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* Logo / App title */}
      <div style={{
        padding: '20px 16px 16px',
        borderBottom: '1px solid #1e2d4a',
      }}>
        <div style={{
          fontSize: '18px',
          fontWeight: '700',
          color: '#60a5fa',
          letterSpacing: '0.5px',
        }}>
          IntelliTrax
        </div>
        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
          Personal Health Dashboard
        </div>
      </div>

      {/* Nav items */}
      <ul style={{ listStyle: 'none', padding: '8px 0', flex: 1 }}>
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId
          return (
            <li key={tab.id}>
              <button
                onClick={() => onTabSelect(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '10px 16px',
                  background: isActive ? '#1e3a5f' : 'transparent',
                  border: 'none',
                  borderLeft: isActive ? '3px solid #60a5fa' : '3px solid transparent',
                  color: isActive ? '#e2e8f0' : '#94a3b8',
                  fontSize: '13px',
                  fontWeight: isActive ? '600' : '400',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#162032'
                    e.currentTarget.style.color = '#cbd5e1'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#94a3b8'
                  }
                }}
              >
                <span style={{ fontSize: '15px' }}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
