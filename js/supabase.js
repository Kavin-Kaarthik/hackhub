import { createClient } from '@supabase/supabase-js';

// Use env vars in production; fallback to defaults for local dev without .env
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://rtprwjcnqftmcvonedty.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0cHJ3amNucWZ0bWN2b25lZHR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NDMwODIsImV4cCI6MjA4NzMxOTA4Mn0.6gsNwKL8XvfGKjcJLj2U1veZnT5yTRJIs2U2VseNLIU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
