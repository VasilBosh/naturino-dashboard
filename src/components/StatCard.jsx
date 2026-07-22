export default function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5 fade-up">
      <div className="text-sm text-moss">{label}</div>
      <div
        className={
          'font-display text-3xl font-semibold mt-1 ' +
          (accent === 'honey' ? 'text-honey' : 'text-forest')
        }
      >
        {value}
      </div>
      {sub ? <div className="text-xs text-moss mt-1">{sub}</div> : null}
    </div>
  )
}
