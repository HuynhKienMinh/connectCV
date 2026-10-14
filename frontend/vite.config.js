import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { productionApiBase } from './config/productionApi.js'

export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), 'VITE_');
    productionApiBase(process.env.VITE_API_BASE_URL ?? env.VITE_API_BASE_URL);
  }
  return {
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  };
})
