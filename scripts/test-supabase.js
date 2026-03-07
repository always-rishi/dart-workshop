import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tborcuteoohfignjvpjl.supabase.co';
const supabaseKey = 'sb_publishable_tpbBrnrsZCfFekN3Odh7SQ_WPHnvNZY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    // 1. Check if 'participants' exists
    let { data: d1, error: e1 } = await supabase.from('participants').select('*').limit(1);
    console.log("lowercase participants table:", e1 ? e1.message : "Exists, columns: " + (d1[0] ? Object.keys(d1[0]) : "empty but valid"));

    // 2. Check if 'Participants' exists
    let { data: d2, error: e2 } = await supabase.from('Participants').select('*').limit(1);
    console.log("Uppercase Participants table:", e2 ? e2.message : "Exists, columns: " + (d2[0] ? Object.keys(d2[0]) : "empty but valid"));

    // If we can insert, let's try an insert and see the error to get the exact schema issues
    let { error: e3 } = await supabase.from('Participants').insert([{ test: 1 }]);
    console.log("Insert error (to reveal columns):", e3 ? e3.message : "Success");
}

test();
