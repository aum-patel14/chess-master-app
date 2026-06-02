import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase env credentials VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing. Please define them inside your .env configuration.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;
