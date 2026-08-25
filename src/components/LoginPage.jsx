import { useState } from 'react'
import { login } from '../lib/api.js'

function LeafMark() {
  return (
    <div className="w-14 h-14 rounded-2xl bg-mist flex items-center justify-center shadow-card">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 20c0-8 6-14 16-16C18 12 12 20 4 20z" fill="#3a7d44" />
        <path d="M4 20C7 15 11 12 16 10" stroke="#2f6b3a" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export default function LoginPage({ onSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    if (!username.trim() || !password) return

    setLoading(true)
    setError('')
    try {
      await login(username.trim(), password)
      setPassword('')
      onSuccess()
    } catch (err) {
      setError(err.message || 'Входът не беше успешен.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen px-5 py-10 flex items-center justify-center login-backdrop">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-soft border border-mist p-7 sm:p-9 fade-up">
        <div className="flex justify-center"><LeafMark /></div>
        <div className="text-center mt-5">
          <h1 className="font-display text-3xl font-semibold text-forest">Naturino Kids</h1>
          <p className="text-sm text-moss mt-1">Защитено табло за клиенти и напомняния</p>
        </div>

        <form onSubmit={submit} className="mt-8">
          <label htmlFor="username" className="block text-sm font-semibold text-bark mb-2">
            Потребителско име
          </label>
          <input
            id="username"
            value={username}
            onChange={event => setUsername(event.target.value)}
            autoComplete="username"
            autoFocus
            required
            className="w-full rounded-xl border border-sage/60 bg-cream/50 px-4 py-3 text-bark outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/15"
          />

          <label htmlFor="password" className="block text-sm font-semibold text-bark mt-5 mb-2">
            Парола
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={event => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-sage/60 bg-cream/50 px-4 py-3 pr-20 text-bark outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/15"
            />
            <button
              type="button"
              onClick={() => setShowPassword(value => !value)}
              className="absolute inset-y-0 right-3 text-xs font-medium text-moss hover:text-forest"
            >
              {showPassword ? 'Скрий' : 'Покажи'}
            </button>
          </div>

          {error && (
            <div role="alert" className="mt-4 rounded-xl border border-honey/40 bg-honey/10 px-4 py-3 text-sm text-bark">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 rounded-full bg-leaf px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-forest disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? 'Проверка…' : 'Влез в таблото'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-moss">
          <span aria-hidden="true">🔒</span>
          Данните се зареждат само след успешен вход
        </div>
      </div>
    </main>
  )
}
