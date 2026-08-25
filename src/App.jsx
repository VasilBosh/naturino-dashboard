import { useCallback, useEffect, useState } from 'react'
import Header from './components/Header.jsx'
import Dashboard from './components/Dashboard.jsx'
import ImportPanel from './components/ImportPanel.jsx'
import ConnectBanner from './components/ConnectBanner.jsx'
import LoginPage from './components/LoginPage.jsx'
import {
  AUTH_EXPIRED_EVENT,
  clearSession,
  hasSession,
  isConfigured,
  logout,
  verifySession
} from './lib/api.js'

function ConnectionScreen({ message, onRetry, onReset }) {
  return (
    <main className="min-h-screen px-5 py-10 flex items-center justify-center login-backdrop">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-soft border border-mist p-8 text-center fade-up">
        <div className="font-display text-2xl font-semibold text-forest">Връзката не се установи</div>
        <p className="text-sm text-moss mt-3">{message}</p>
        <button onClick={onRetry} className="w-full mt-6 rounded-full bg-leaf px-5 py-3 text-sm font-semibold text-white hover:bg-forest transition">
          Опитай отново
        </button>
        <button onClick={onReset} className="mt-4 text-sm text-moss hover:text-forest">
          Върни ме към входа
        </button>
      </div>
    </main>
  )
}

export default function App() {
  const configured = isConfigured()
  const [tab, setTab] = useState('dashboard')
  const [authState, setAuthState] = useState(() => (hasSession() ? 'checking' : 'signed-out'))
  const [connectionError, setConnectionError] = useState('')

  const checkExistingSession = useCallback(async () => {
    if (!configured || !hasSession()) {
      setAuthState('signed-out')
      return
    }

    setAuthState('checking')
    setConnectionError('')
    try {
      const valid = await verifySession()
      setAuthState(valid ? 'authenticated' : 'signed-out')
    } catch (error) {
      setConnectionError(error.message || 'Временен проблем при връзката с таблицата.')
      setAuthState('connection-error')
    }
  }, [configured])

  useEffect(() => {
    if (configured && hasSession()) checkExistingSession()

    const handleExpired = () => {
      setTab('dashboard')
      setAuthState('signed-out')
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired)
  }, [configured, checkExistingSession])

  function handleLogout() {
    logout()
    setTab('dashboard')
    setAuthState('signed-out')
  }

  if (!configured) {
    return (
      <div className="min-h-screen">
        <ConnectBanner />
        <div className="max-w-3xl mx-auto px-5 py-10 text-sm text-moss">
          Добави адреса на Apps Script Web App в <code>src/config.js</code>.
        </div>
      </div>
    )
  }

  if (authState === 'checking') {
    return (
      <main className="min-h-screen flex items-center justify-center login-backdrop text-moss">
        <div className="flex items-center gap-3">
          <span className="inline-block w-5 h-5 border-2 border-sage border-t-forest rounded-full animate-spin" />
          Проверявам защитения достъп…
        </div>
      </main>
    )
  }

  if (authState === 'connection-error') {
    return (
      <ConnectionScreen
        message={connectionError}
        onRetry={checkExistingSession}
        onReset={() => { clearSession(); setAuthState('signed-out') }}
      />
    )
  }

  if (authState !== 'authenticated') {
    return <LoginPage onSuccess={() => setAuthState('authenticated')} />
  }

  return (
    <div className="min-h-screen">
      <Header tab={tab} setTab={setTab} onLogout={handleLogout} />

      {tab === 'dashboard' && <Dashboard />}
      {tab === 'import' && <ImportPanel />}

      <footer className="max-w-6xl mx-auto px-5 py-8 text-center text-xs text-moss">
        Naturino Kids · защитено вътрешно табло
      </footer>
    </div>
  )
}
