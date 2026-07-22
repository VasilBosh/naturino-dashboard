import { CONFIG } from '../config.js'

export function isConfigured() {
  return Boolean(CONFIG.API_URL)
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

// ── Четене чрез JSONP (доказано работи; поправено срещу грешки) ──
function jsonpGet(params) {
  return new Promise((resolve, reject) => {
    const cb = 'ncb_' + Math.random().toString(36).slice(2)
    let finished = false
    const script = document.createElement('script')

    const finish = (fn, arg) => {
      if (finished) return
      finished = true
      // Оставяме no-op, за да няма "not defined" ако скриптът дойде късно.
      window[cb] = function () {}
      if (script.parentNode) script.parentNode.removeChild(script)
      setTimeout(() => { try { delete window[cb] } catch (e) {} }, 3000)
      fn(arg)
    }

    window[cb] = data => finish(resolve, data)
    script.onerror = () => finish(reject, new Error('Мрежова грешка към скрипта'))
    setTimeout(() => finish(reject, new Error('Времето за връзка изтече')), 25000)

    // &t= пречи на кеширане (важно при повторните проверки).
    script.src = CONFIG.API_URL + '?' + params +
      '&callback=' + cb + '&t=' + Date.now()
    document.body.appendChild(script)
  })
}

// Чете статистиката за таблото.
export async function getStats() {
  if (!isConfigured()) throw new Error('NOT_CONFIGURED')
  const data = await jsonpGet('action=stats&token=' + encodeURIComponent(CONFIG.API_TOKEN))
  if (!data.ok) throw new Error(data.error || 'Неуспешно зареждане')
  return data
}

// ── Импорт: no-cors POST (точно като чекаута), после потвърждение ──
export async function importRows(rows) {
  if (!isConfigured()) throw new Error('NOT_CONFIGURED')

  // Кога е бил последният импорт (за да усетим новия).
  let beforeTime = 0
  try {
    const s = await getStats()
    beforeTime = s.lastImport ? s.lastImport.time : 0
  } catch (e) { /* пренебрегваме */ }

  // Изстрелваме файла (не четем отговора — точно като чекаута).
  await fetch(CONFIG.API_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'import', token: CONFIG.API_TOKEN, rows })
  })

  // Потвърждаваме чрез статистиката (до ~4.5 мин — за много големи файлове).
  for (let i = 0; i < 90; i++) {
    await sleep(3000)
    try {
      const s = await getStats()
      const t = s.lastImport ? s.lastImport.time : 0
      if (t && t !== beforeTime) {
        return { ok: true, ...s.lastImport }
      }
    } catch (e) { /* опитваме пак */ }
  }

  throw new Error('Импортът не се потвърди навреме. Провери таблицата „Клиенти" или опитай пак.')
}