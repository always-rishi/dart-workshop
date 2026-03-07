// scripts/supabase-config.js
// Initialize Supabase using provided config. 

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://tborcuteoohfignjvpjl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tpbBrnrsZCfFekN3Odh7SQ_WPHnvNZY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
