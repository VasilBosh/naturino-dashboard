import { useState } from 'react'
import { readSpreadsheet } from '../lib/excel.js'
import { importRows } from '../lib/api.js'

export default function ImportPanel() {
  const [rows, setRows] = useState(null)
  const [fileName, setFileName] = useState('')
  const [status, setStatus] = useState('idle') // idle | reading | ready | sending | done | error
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  async function handleFile(file) {
    if (!file) return
    setError('')
    setResult(null)
    setStatus('reading')
    setFileName(file.name)
    try {
      const data = await readSpreadsheet(file)
      if (data.length < 2) {
        setError('Файлът изглежда празен или няма редове с данни.')
        setStatus('error')
        return
      }
      setRows(data)
      setStatus('ready')
    } catch (e) {
      setError('Файлът не можа да се прочете: ' + e.message)
      setStatus('error')
    }
  }

  async function send() {
    if (!rows) return
    setStatus('sending')
    setError('')
    try {
      const res = await importRows(rows)
      setResult(res)
      setStatus('done')
      setRows(null)
    } catch (e) {
      setError(e.message)
      setStatus('error')
    }
  }

  function reset() {
    setRows(null); setFileName(''); setStatus('idle'); setResult(null); setError('')
  }

  const dataRowCount = rows ? rows.length - 1 : 0

  return (
    <div className="max-w-3xl mx-auto px-5 py-8">
      <h1 className="font-display text-2xl font-semibold text-forest mb-1">Импорт на дневния файл</h1>
      <p className="text-sm text-moss mb-6">
        Качи файла от фулфилмънта. Таблицата сама разпознава колоните, сравнява по телефон и обновява клиентите.
      </p>

      {/* Зона за качване */}
      {status !== 'done' && (
        <label
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
          className={
            'block border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition ' +
            (dragOver ? 'border-leaf bg-mist' : 'border-sage/50 bg-white hover:bg-mist/50')
          }
        >
          <input
            type="file"
            accept=".xls,.xlsx,.csv"
            className="hidden"
            onChange={e => handleFile(e.target.files[0])}
          />
          <div className="text-forest font-medium">Пусни файла тук или кликни, за да избереш</div>
          <div className="text-xs text-moss mt-1">.xls, .xlsx или .csv</div>
        </label>
      )}

      {/* Прочетен файл — преглед */}
      {status === 'ready' && (
        <div className="bg-white rounded-2xl shadow-card p-5 mt-5 fade-up">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-moss">Файл</div>
              <div className="font-medium text-bark">{fileName}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-moss">Редове с данни</div>
              <div className="font-display text-2xl text-forest font-semibold">{dataRowCount}</div>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button
              onClick={send}
              className="bg-leaf text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-forest transition"
            >
              Обработи и обнови базата
            </button>
            <button onClick={reset} className="text-sm text-moss hover:text-forest px-3">
              Откажи
            </button>
          </div>
        </div>
      )}

      {status === 'reading' && (
        <div className="text-center text-moss py-6">Чета файла…</div>
      )}

      {status === 'sending' && (
        <div className="bg-white rounded-2xl shadow-card p-6 mt-5 fade-up text-center">
          <div className="flex items-center justify-center gap-3 text-forest font-medium">
            <span className="inline-block w-5 h-5 border-2 border-sage border-t-forest rounded-full animate-spin" />
            Обработвам и обновявам базата…
          </div>
          <div className="relative h-2.5 bg-mist rounded-full overflow-hidden mt-4">
            <div className="bar-indeterminate" />
          </div>
          <div className="text-xs text-moss mt-3">
            При голям файл това може да отнеме няколко минути — остави страницата отворена на този таб.
          </div>
        </div>
      )}

      {/* Резултат */}
      {status === 'done' && result && (
        <div className="bg-white rounded-2xl shadow-card p-6 mt-5 fade-up">
          <div className="font-display text-lg text-forest font-semibold">Готово ✅</div>
          <div className="grid grid-cols-3 gap-4 mt-4 text-center">
            <div>
              <div className="font-display text-2xl text-forest font-semibold">{result.нови ?? 0}</div>
              <div className="text-xs text-moss">нови клиенти</div>
            </div>
            <div>
              <div className="font-display text-2xl text-forest font-semibold">{result.повторни ?? 0}</div>
              <div className="text-xs text-moss">повторни поръчки</div>
            </div>
            <div>
              <div className="font-display text-2xl text-honey font-semibold">{result.пропуснати ?? 0}</div>
              <div className="text-xs text-moss">пропуснати (без телефон)</div>
            </div>
          </div>
          <button
            onClick={reset}
            className="mt-5 bg-leaf text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-forest transition"
          >
            Импортирай друг файл
          </button>
        </div>
      )}

      {/* Грешка */}
      {status === 'error' && (
        <div className="bg-white border border-honey/40 rounded-2xl shadow-card p-5 mt-5 fade-up">
          <div className="font-medium text-forest">Нещо не се получи</div>
          <p className="text-sm text-moss mt-1">{error}</p>
          <button onClick={reset} className="mt-3 text-sm text-leaf hover:text-forest">Опитай пак</button>
        </div>
      )}
    </div>
  )
}
