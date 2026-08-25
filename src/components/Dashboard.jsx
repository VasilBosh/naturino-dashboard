import { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts'
import { getStats } from '../lib/api.js'
import StatCard from './StatCard.jsx'

const COLORS = ['#3a7d44', '#8fb89a']

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load(force = false) {
    if (stats) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const data = await getStats({ force })
      setStats(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load(false) }, [])

  if (loading) {
    return <div className="max-w-6xl mx-auto px-5 py-16 text-center text-moss">Зареждане…</div>
  }

  if (error && !stats) {
    return (
      <div className="max-w-6xl mx-auto px-5 py-10">
        <div className="bg-white rounded-2xl shadow-card p-6">
          <div className="font-display text-lg text-forest font-semibold">Данните не се заредиха</div>
          <p className="text-sm text-moss mt-2">{error}</p>
          <button
            onClick={() => load(false)}
            className="mt-4 bg-leaf text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-forest transition"
          >
            Опитай отново
          </button>
        </div>
      </div>
    )
  }

  const pieData = [
    { name: '1 брой', value: stats.single || 0 },
    { name: '2+ броя', value: stats.multi || 0 }
  ]
  const revenue = stats.revenue || {}
  const money = value => Number(value || 0).toFixed(2) + ' €'
  const quota = stats.emailQuotaLeft ?? null
  const lastImport = stats.lastImport?.time
    ? new Date(stats.lastImport.time).toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'няма данни'
  const generatedAt = stats.generatedAt
    ? new Date(stats.generatedAt).toLocaleString('bg-BG', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="max-w-6xl mx-auto px-5 py-8">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-2xl font-semibold text-forest">Преглед</h1>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="text-sm text-moss hover:text-forest transition disabled:opacity-50 disabled:cursor-wait"
        >
          {refreshing ? 'Обновяване…' : '↻ Обнови'}
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-honey/40 bg-honey/10 px-4 py-3 text-sm text-bark">
          {error} Показвам последните успешно заредени данни.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="bg-white rounded-full shadow-card px-4 py-2 text-sm flex items-center gap-2">
          <span className="text-moss">📧 Имейли днес:</span>
          <span className={'font-semibold ' + (quota !== null && quota <= 10 ? 'text-honey' : 'text-forest')}>
            {quota !== null ? quota : '—'}/{stats.emailQuotaMax || 100}
          </span>
        </div>
        <div className="bg-white rounded-full shadow-card px-4 py-2 text-sm flex items-center gap-2">
          <span className="text-moss">📥 Последен импорт:</span>
          <span className="font-semibold text-forest">{lastImport}</span>
        </div>
        {generatedAt && (
          <div className="text-xs text-moss ml-auto">Данните са изчислени: {generatedAt}</div>
        )}
      </div>

      <div className="mb-2 mt-1">
        <h2 className="font-display text-lg text-forest font-semibold">Приходи</h2>
        <div className="text-xs text-moss">оборот от продукта (без доставка)</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Общо (целия период)" value={money(revenue.total)} accent="honey" />
        <StatCard label="Последен месец" value={money(revenue.m1)} sub={'3 мес: ' + money(revenue.m3)} />
        <StatCard label="Последна седмица" value={money(revenue.w1)} sub={'2 седм: ' + money(revenue.w2)} />
        <StatCard label="Вчера" value={money(revenue.yesterday)} />
      </div>

      <div className="bg-white rounded-2xl shadow-card p-5 mt-4 fade-up">
        <div className="font-display text-lg text-forest font-semibold mb-1">Приходи (30 дни)</div>
        <div className="text-xs text-moss mb-3">оборот по ден, €</div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={stats.revenueDaily || []}>
            <defs>
              <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d9a441" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#d9a441" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef3ee" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#5c6b5e' }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: '#5c6b5e' }} width={40} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #eef3ee', fontSize: 13 }}
              formatter={value => [Number(value).toFixed(2) + ' €', 'Оборот']}
            />
            <Area type="monotone" dataKey="sum" stroke="#d9a441" strokeWidth={2} fill="url(#gr)" name="Оборот" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Карти */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <StatCard label="Общо клиенти" value={stats.total} />
        <StatCard label="Общо поръчки" value={stats.totalOrders ?? '—'} sub="вкл. повторните" />
        <StatCard label="Върнали се" value={stats.returning} sub={stats.returningPct + '% от всички'} />
        <StatCard label="Поръчки (30 дни)" value={stats.orders30d} sub={'вчера: ' + stats.ordersYesterday} />
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-4">
        {/* Активност по дни */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow-card p-5 fade-up">
          <div className="font-display text-lg text-forest font-semibold mb-1">Активност (30 дни)</div>
          <div className="text-xs text-moss mb-3">брой поръчки по ден (по последна поръчка)</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.daily || []}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3a7d44" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#3a7d44" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef3ee" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#5c6b5e' }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#5c6b5e' }} width={26} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #eef3ee', fontSize: 13 }}
                labelStyle={{ color: '#2c3e2f' }}
              />
              <Area type="monotone" dataKey="count" stroke="#3a7d44" strokeWidth={2} fill="url(#g)" name="Поръчки" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Пай: 1 брой vs 2+ */}
        <div className="bg-white rounded-2xl shadow-card p-5 fade-up">
          <div className="font-display text-lg text-forest font-semibold mb-1">Количество</div>
          <div className="text-xs text-moss mb-3">по последна поръчка</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #eef3ee', fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 text-xs text-moss">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[0] }} />1 брой ({stats.single})</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[1] }} />2+ броя ({stats.multi})</span>
          </div>
        </div>
      </div>

      {/* Долен ред: допълнителни числа */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
        <StatCard label="Напомняния" value={stats.remindersSent} sub="изпратени общо" />
        <StatCard label="Поръчки (7 дни)" value={stats.orders7d} />
        <StatCard label="Без имейл (за Viber)" value={stats.noEmail} accent="honey" />
      </div>
    </div>
  )
}
