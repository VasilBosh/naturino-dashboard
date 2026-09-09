import { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'
import { getStats } from '../lib/api.js'
import StatCard from './StatCard.jsx'

// Един цвят = едно нещо, навсякъде в таблото:
const C_REVENUE = '#3a7d44'   // пари от продукта
const C_SHIPPING = '#d9a441'  // пари за доставка
const C_ORDERS = '#7fb069'    // брой поръчки
const PIE_COLORS = [C_REVENUE, C_ORDERS]

const money = v =>
  Number(v || 0).toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

const moneyShort = v => {
  const n = Number(v || 0)
  return n >= 1000 ? Math.round(n / 100) / 10 + 'к' : String(Math.round(n))
}

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

  const revenue = stats.revenue || {}
  const shipping = stats.shipping || {}
  const byMonth = stats.byMonth || []

  const pieData = [
    { name: '1 брой', value: stats.single || 0 },
    { name: '2+ броя', value: stats.multi || 0 }
  ]

  const quota = stats.emailQuotaLeft ?? null
  const lastImport = stats.lastImport?.time
    ? new Date(stats.lastImport.time).toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'няма данни'
  const generatedAt = stats.generatedAt
    ? new Date(stats.generatedAt).toLocaleString('bg-BG', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null

  const tooltipStyle = { borderRadius: 12, border: '1px solid #eef3ee', fontSize: 13 }

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

      <div className="flex flex-wrap items-center gap-3 mb-6">
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

      {/* ───────── ЧИСТ ОБОРОТ ───────── */}
      <div className="mb-3">
        <h2 className="font-display text-lg text-forest font-semibold">Чист оборот</h2>
        <div className="text-xs text-moss">само продуктът, без парите за доставка</div>
      </div>

      <div className="bg-white rounded-2xl shadow-card p-6 fade-up">
        <div className="text-sm text-moss">Общо за целия период</div>
        <div className="font-display text-4xl font-semibold text-forest mt-1">{money(revenue.total)}</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4">
        <StatCard size="sm" label="Вчера" value={money(revenue.yesterday)} />
        <StatCard size="sm" label="7 дни" value={money(revenue.w1)} />
        <StatCard size="sm" label="14 дни" value={money(revenue.w2)} />
        <StatCard size="sm" label="30 дни" value={money(revenue.m1)} />
        <StatCard size="sm" label="3 месеца" value={money(revenue.m3)} />
        <StatCard size="sm" label="12 месеца" value={money(revenue.y1)} />
      </div>

      <div className="bg-white rounded-2xl shadow-card p-5 mt-4 fade-up">
        <div className="font-display text-lg text-forest font-semibold mb-1">Оборот по ден</div>
        <div className="text-xs text-moss mb-3">последните 30 дни, € без доставка</div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={stats.revenueDaily || []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C_REVENUE} stopOpacity={0.3} />
                <stop offset="100%" stopColor={C_REVENUE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef3ee" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#5c6b5e' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: '#5c6b5e' }} tickLine={false} axisLine={false} width={44} tickFormatter={moneyShort} />
            <Tooltip contentStyle={tooltipStyle} formatter={v => [money(v), 'Оборот']} />
            <Area type="monotone" dataKey="sum" stroke={C_REVENUE} strokeWidth={2} fill="url(#gRev)" name="Оборот" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ───────── ДОСТАВКИ ───────── */}
      <div className="mb-3 mt-8">
        <h2 className="font-display text-lg text-forest font-semibold">Пари за доставка</h2>
        <div className="text-xs text-moss">частта от наложения платеж, която отива за куриера</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Доставки общо" value={money(shipping.total)} accent="honey" />
        <StatCard label="Последните 30 дни" value={money(shipping.m1)} accent="honey" />
        <StatCard label="Последните 7 дни" value={money(shipping.w1)} accent="honey" />
        <StatCard
          label="Дял от наложения платеж"
          value={
            (revenue.total + shipping.total) > 0
              ? Math.round(shipping.total / (revenue.total + shipping.total) * 100) + '%'
              : '—'
          }
          accent="honey"
        />
      </div>

      {byMonth.length > 0 && (
        <>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="bg-white rounded-2xl shadow-card p-5 fade-up">
              <div className="font-display text-lg text-forest font-semibold mb-1">Оборот по месеци</div>
              <div className="text-xs text-moss mb-3">€ без доставка</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byMonth} barCategoryGap="22%" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef3ee" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5c6b5e' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#5c6b5e' }} tickLine={false} axisLine={false} width={44} tickFormatter={moneyShort} />
                  <Tooltip cursor={{ fill: '#eef3ee' }} contentStyle={tooltipStyle} formatter={v => [money(v), 'Оборот']} />
                  <Bar dataKey="revenue" fill={C_REVENUE} radius={[4, 4, 0, 0]} maxBarSize={44} name="Оборот" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl shadow-card p-5 fade-up">
              <div className="font-display text-lg text-forest font-semibold mb-1">Доставки по месеци</div>
              <div className="text-xs text-moss mb-3">€ за куриера</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byMonth} barCategoryGap="22%" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef3ee" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5c6b5e' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#5c6b5e' }} tickLine={false} axisLine={false} width={44} tickFormatter={moneyShort} />
                  <Tooltip cursor={{ fill: '#eef3ee' }} contentStyle={tooltipStyle} formatter={v => [money(v), 'Доставка']} />
                  <Bar dataKey="shipping" fill={C_SHIPPING} radius={[4, 4, 0, 0]} maxBarSize={44} name="Доставка" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Таблица с точните числа по месеци */}
          <div className="bg-white rounded-2xl shadow-card p-5 mt-4 fade-up">
            <div className="font-display text-lg text-forest font-semibold mb-3">Месец по месец</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[420px]">
                <thead>
                  <tr className="text-moss text-xs uppercase tracking-wide">
                    <th className="text-left font-medium py-2">Месец</th>
                    <th className="text-right font-medium py-2">Поръчки</th>
                    <th className="text-right font-medium py-2">Оборот</th>
                    <th className="text-right font-medium py-2">Доставка</th>
                  </tr>
                </thead>
                <tbody>
                  {byMonth.slice().reverse().map(m => (
                    <tr key={m.key} className="border-t border-mist">
                      <td className="py-2 text-bark">{m.label}</td>
                      <td className="py-2 text-right text-moss">{m.orders}</td>
                      <td className="py-2 text-right font-medium text-forest">{money(m.revenue)}</td>
                      <td className="py-2 text-right font-medium text-honey">{money(m.shipping)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-mist font-semibold">
                    <td className="py-2 text-bark">Общо</td>
                    <td className="py-2 text-right text-moss">{stats.totalOrders ?? '—'}</td>
                    <td className="py-2 text-right text-forest">{money(revenue.total)}</td>
                    <td className="py-2 text-right text-honey">{money(shipping.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ───────── КЛИЕНТИ И ПОРЪЧКИ ───────── */}
      <div className="mb-3 mt-8">
        <h2 className="font-display text-lg text-forest font-semibold">Клиенти и поръчки</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Общо клиенти" value={stats.total} />
        <StatCard label="Общо поръчки" value={stats.totalOrders ?? '—'} sub="вкл. повторните" />
        <StatCard label="Върнали се" value={stats.returning} sub={stats.returningPct + '% от всички'} />
        <StatCard label="Поръчки (30 дни)" value={stats.orders30d} sub={'вчера: ' + stats.ordersYesterday} />
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-4">
        <div className="md:col-span-2 bg-white rounded-2xl shadow-card p-5 fade-up">
          <div className="font-display text-lg text-forest font-semibold mb-1">Поръчки по ден</div>
          <div className="text-xs text-moss mb-3">последните 30 дни</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.daily || []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gOrd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C_ORDERS} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={C_ORDERS} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef3ee" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#5c6b5e' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#5c6b5e' }} tickLine={false} axisLine={false} width={30} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => [v, 'Поръчки']} />
              <Area type="monotone" dataKey="count" stroke={C_ORDERS} strokeWidth={2} fill="url(#gOrd)" name="Поръчки" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-card p-5 fade-up">
          <div className="font-display text-lg text-forest font-semibold mb-1">Количество</div>
          <div className="text-xs text-moss mb-3">по последна поръчка</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2} stroke="#fff" strokeWidth={2}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 text-xs text-moss">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[0] }} />1 брой ({stats.single})</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[1] }} />2+ броя ({stats.multi})</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        <StatCard label="Напомняния" value={stats.remindersSent} sub="изпратени общо" />
        <StatCard label="Поръчки (7 дни)" value={stats.orders7d} />
        <StatCard label="Без имейл (за Viber)" value={stats.noEmail} accent="honey" />
        <StatCard label="Заключени клиенти" value={stats.locked ?? 0} sub="стари — без напомняния" />
      </div>
    </div>
  )
}
