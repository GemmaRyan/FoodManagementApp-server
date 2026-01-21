import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseKey) {
  console.error('Missing SUPABASE_APIKEY in environment variables'); // error codes
}

export const supabase = createClient(supabaseUrl, supabaseKey);
