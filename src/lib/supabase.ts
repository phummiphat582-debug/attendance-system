import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://hrglhnddjbxxmlhbeysm.supabase.co';
const defaultKey = 'sb_publishable_wGkBqfguJmgMIArQWRVdtA_2Vcsv_Je';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseUrl.includes('your-project')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : createClient('https://mock-supabase-project.supabase.co', 'mock-anon-key');

export { supabaseUrl, supabaseAnonKey };
