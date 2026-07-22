import { useState } from 'react'
import Header from './components/Header.jsx'
import Dashboard from './components/Dashboard.jsx'
import ImportPanel from './components/ImportPanel.jsx'
import ConnectBanner from './components/ConnectBanner.jsx'
import { isConfigured } from './lib/api.js'

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const configured = isConfigured()

  return (
    <div className="min-h-screen">
      <Header tab={tab} setTab={setTab} />

      {!configured && <ConnectBanner />}

      {configured && tab === 'dashboard' && <Dashboard />}
      {configured && tab === 'import' && <ImportPanel />}

      {!configured && (
        <div className="max-w-6xl mx-auto px-5 py-10 text-sm text-moss">
          След като попълниш връзката, тук ще се появят таблото и импортът.
        </div>
      )}

      <footer className="max-w-6xl mx-auto px-5 py-8 text-center text-xs text-moss">
        Naturino Kids · вътрешно табло
      </footer>
    </div>
  )
}
