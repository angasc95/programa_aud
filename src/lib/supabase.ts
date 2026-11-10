import { createClient } from '@supabase/supabase-js';

const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const SUPABASE_URL =
  !envUrl || envUrl.includes('your-project')
    ? 'https://ufowtgmpaahyshdxlnlq.supabase.co'
    : envUrl;

export const SUPABASE_ANON_KEY =
  !envKey || envKey.includes('your-anon') || envKey.includes('your-publishable')
    ? 'sb_publishable_p8Gu4e4nS2DgPG-BqS6vAw_V_5owfv4'
    : envKey;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
