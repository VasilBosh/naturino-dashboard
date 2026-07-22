/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Ботаническа палитра на Naturino
        forest:  '#2f6b3a',   // основно тъмнозелено
        leaf:    '#3a7d44',   // зелено (като бутоните в имейлите)
        sage:    '#8fb89a',   // меко градинско зелено
        mist:    '#eef3ee',   // много светъл зелен фон
        cream:   '#f6f8f4',   // топло бяло (фон на страницата)
        bark:    '#2c3e2f',   // тъмен текст
        moss:    '#5c6b5e',   // приглушен текст
        honey:   '#d9a441'    // топъл акцент (пестеливо)
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        soft: '0 4px 18px rgba(47, 107, 58, 0.08)',
        card: '0 2px 10px rgba(44, 62, 47, 0.06)'
      }
    }
  },
  plugins: []
}
