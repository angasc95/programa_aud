import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), 'supabase.env') });
dotenv.config({ override: true });

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
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
    },
  };
});
