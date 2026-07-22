import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' прави пътищата относителни, за да работи на GitHub Pages
// без значение какво е името на хранилището (repo).
export default defineConfig({
  plugins: [react()],
  base: './'
})
