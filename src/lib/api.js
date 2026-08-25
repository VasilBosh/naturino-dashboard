import { CONFIG } from '../config.js'

const SESSION_KEY = 'naturino.dashboard.session.v1'
export const AUTH_EXPIRED_EVENT = 'naturino:auth-expired'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

class ApiError extends Error {
  constructor(message, code = 'API_ERROR') {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

export function isConfigured() {
  return Boolean(CONFIG.API_URL)
}

function readSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const value = JSON.parse(raw)
    if (!value?.token || !value?.expiresAt || value.expiresAt <= Date.now()) {
      clearSession()
      return null
    }
    return value
  } catch {
    clearSession()
    return null
  }
}

function saveSession(session) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY)
  } catch {
    // Няма какво друго да направим, ако браузърът блокира localStorage.
  }
}

export function hasSession() {
  return Boolean(readSession())
}

function expireSession() {
  clearSession()
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))
}

async function apiRequest(action, payload = {}, options = {}) {
  if (!isConfigured()) throw new ApiError('Връзката с таблицата не е настроена.', 'NOT_CONFIGURED')

  const timeoutMs = options.timeoutMs ?? 60000
  const retries = options.retries ?? 2
  const needsSession = action !== 'login'
  const stored = needsSession ? readSession() : null

  if (needsSession && !stored) {
    expireSession()
    throw new ApiError('Сесията е изтекла. Влез отново.', 'UNAUTHORIZED')
  }

  const body = {
    action,
    ...payload,
    ...(needsSession ? { session: stored.token } : {})
  }

  let lastError = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        redirect: 'follow',
        cache: 'no-store',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(body),
        signal: controller.signal
      })

      const text = await response.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error('Google Apps Script върна невалиден отговор.')
      }

      if (!data?.ok) {
        const error = new ApiError(data?.error || 'Заявката не беше изпълнена.', data?.code)
        if (error.code === 'UNAUTHORIZED') expireSession()
        throw error
      }

      return data
    } catch (error) {
      if (error instanceof ApiError) throw error

      lastError = error?.name === 'AbortError'
        ? new Error('Връзката с таблицата отне твърде дълго време.')
        : new Error('Временен проблем при връзката с таблицата.')

      if (attempt < retries) {
        await sleep(attempt === 0 ? 1200 : 2800)
      }
    } finally {
      window.clearTimeout(timer)
    }
  }

  throw lastError || new Error('Неуспешна връзка с таблицата.')
}

export async function login(username, password) {
  const data = await apiRequest('login', { username, password }, { timeoutMs: 60000, retries: 1 })
  saveSession({ token: data.session, expiresAt: Number(data.expiresAt) })
  return data
}

export async function verifySession() {
  if (!hasSession()) return false
  try {
    await apiRequest('session', {}, { timeoutMs: 45000, retries: 1 })
    return true
  } catch (error) {
    if (error?.code === 'UNAUTHORIZED') return false
    throw error
  }
}

export function logout() {
  clearSession()
}

export async function getStats({ force = false } = {}) {
  return apiRequest(force ? 'refreshStats' : 'stats', {}, {
    timeoutMs: force ? 90000 : 60000,
    retries: 2
  })
}

function createRequestId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID()
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)
}

export async function importRows(rows) {
  return apiRequest('import', { rows, requestId: createRequestId() }, {
    timeoutMs: 300000,
    retries: 1
  })
}
