import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

try {
  const jsonConfigPath = path.resolve(process.cwd(), 'supabase.config.json');
  if (fs.existsSync(jsonConfigPath)) {
    const parsed = JSON.parse(fs.readFileSync(jsonConfigPath, 'utf8')) as Record<string, unknown>;
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string' && value.trim() && !process.env[key]) {
        process.env[key] = value.trim();
      }
    }
  }
} catch {
  // ignore
}

dotenv.config({ path: path.resolve(process.cwd(), 'supabase.env'), quiet: true });
dotenv.config({ override: true, quiet: true });

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const supabaseUrl =
    (env.VITE_SUPABASE_URL && !env.VITE_SUPABASE_URL.includes('your-project')
      ? env.VITE_SUPABASE_URL
      : process.env.VITE_SUPABASE_URL && !process.env.VITE_SUPABASE_URL.includes('your-project')
      ? process.env.VITE_SUPABASE_URL
      : 'https://ufowtgmpaahyshdxlnlq.supabase.co'
    ).trim();

  const supabaseAnonKey =
    (env.VITE_SUPABASE_ANON_KEY && !env.VITE_SUPABASE_ANON_KEY.includes('your-anon')
      ? env.VITE_SUPABASE_ANON_KEY
      : process.env.VITE_SUPABASE_ANON_KEY && !process.env.VITE_SUPABASE_ANON_KEY.includes('your-anon')
      ? process.env.VITE_SUPABASE_ANON_KEY
      : 'sb_publishable_p8Gu4e4nS2DgPG-BqS6vAw_V_5owfv4'
    ).trim();

  return {
    plugins: [tailwindcss()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/@supabase')) {
              return 'supabase';
            }
            if (id.includes('/src/lib/')) {
              return 'domain-lib';
            }
            if (
              id.includes('/src/views/auditoriasView') ||
              id.includes('/src/views/programacionView') ||
              id.includes('/src/views/calendarioView') ||
              id.includes('/src/views/resultadoView') ||
              id.includes('/src/views/auditLogModal')
            ) {
              return 'views-audit';
            }
            if (
              id.includes('/src/views/extraView') ||
              id.includes('/src/views/normaView') ||
              id.includes('/src/views/sectorIafView') ||
              id.includes('/src/views/estatusView') ||
              id.includes('/src/views/tipoAuditoriaView') ||
              id.includes('/src/views/metodologiaAuditoriaView') ||
              id.includes('/src/views/certificacionView') ||
              id.includes('/src/views/certificadoView') ||
              id.includes('/src/views/organizacionView') ||
              id.includes('/src/views/auditorView')
            ) {
              return 'views-domains';
            }
            if (id.includes('/src/views/')) {
              return 'views-shell';
            }
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
      hmr: false,
      ws: false,
    },
  };
});
