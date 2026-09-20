// [Vite Config] Cấu hình Vite: plugin React, proxy API nếu cần, alias path
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
