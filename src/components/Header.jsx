function Leaf() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20c0-8 6-14 16-16C18 12 12 20 4 20z"
        fill="#3a7d44"
      />
      <path
        d="M4 20C7 15 11 12 16 10"
        stroke="#2f6b3a"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

export default function Header({ tab, setTab, onLogout }) {
  const tabs = [
    { id: 'dashboard', label: 'Табло' },
    { id: 'import', label: 'Импорт' }
  ]

  return (
    <header className="border-b border-mist bg-white/70 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Leaf />
          <div>
            <div className="font-display text-xl font-semibold text-forest leading-none">
              Naturino Kids
            </div>
            <div className="text-xs text-moss mt-0.5">Табло за клиенти и напомняния</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1 bg-mist rounded-full p-1">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={
                  'px-3 sm:px-4 py-1.5 rounded-full text-sm font-medium transition ' +
                  (tab === t.id
                    ? 'bg-white text-forest shadow-card'
                    : 'text-moss hover:text-forest')
                }
              >
                {t.label}
              </button>
            ))}
          </nav>
          <button
            type="button"
            onClick={onLogout}
            className="px-3 py-2 rounded-full text-sm font-medium text-moss hover:text-forest hover:bg-mist transition"
            title="Изход от таблото"
          >
            Изход
          </button>
        </div>
      </div>
    </header>
  )
}
