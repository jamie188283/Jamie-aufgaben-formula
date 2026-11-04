import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.VITE_APP_TARGET === 'android' ? './' : '/Jamie-aufgaben-formula/',
  plugins: [react()],
})
