export default function StatCard({ label, value, sub, accent, size }) {
  const valueSize = size === 'sm' ? 'text-2xl' : 'text-3xl'

  return (
    <div className="bg-white rounded-2xl shadow-card p-5 fade-up">
      <div className="text-sm text-moss">{label}</div>
      <div
        className={
          'font-display font-semibold mt-1 whitespace-nowrap ' + valueSize + ' ' +
          (accent === 'honey' ? 'text-honey' : 'text-forest')
        }
      >
        {value}
      </div>
      {sub ? <div className="text-xs text-moss mt-1">{sub}</div> : null}
    </div>
  )
}
