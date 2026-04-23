import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['bugjournal.local'],
  },
})


//Please copy the link below in order to open the application in your browser:
//http://bugjournal.local:5173