import { createClient } from '@supabase/supabase-js';

// Use env vars in production; fallback to defaults for local dev without .env
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL   
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY  

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
