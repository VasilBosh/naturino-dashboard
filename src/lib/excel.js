import * as XLSX from 'xlsx'

// Чете .xls / .xlsx / SpreadsheetML файл и връща масив от редове
// (всеки ред е масив от клетки, включително заглавния ред).
export async function readSpreadsheet(file) {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]

  const rows = XLSX.utils.sheet_to_json(ws, {
    header: 1,     // масив от масиви
    raw: false,    // дати и числа като текст (за да пътуват еднакво)
    defval: ''     // празни клетки -> ''
  })

  // Махаме напълно празните редове.
  return rows.filter(r => r.some(c => String(c).trim() !== ''))
}
