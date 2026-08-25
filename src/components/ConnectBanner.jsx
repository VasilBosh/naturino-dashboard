export default function ConnectBanner() {
  return (
    <div className="max-w-6xl mx-auto px-5 mt-6">
      <div className="bg-white border border-honey/40 rounded-2xl shadow-card p-6 fade-up">
        <div className="font-display text-lg font-semibold text-forest">
          Таблото още не е свързано с таблицата
        </div>
        <p className="text-sm text-moss mt-2 leading-relaxed">
          За да виждаш данните, отвори <code className="bg-mist px-1.5 py-0.5 rounded">src/config.js</code>{' '}
          и попълни адреса на твоя Apps Script Web App. Входът се настройва от менюто на Google таблицата. Стъпките са в{' '}
          <code className="bg-mist px-1.5 py-0.5 rounded">README.md</code>.
        </p>
      </div>
    </div>
  )
}
