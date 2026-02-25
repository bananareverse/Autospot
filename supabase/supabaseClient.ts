import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://madjdyyjkjqkotxqwlof.supabase.co";
const SUPABASE_KEY = "sb_publishable_nBrv80JdGjA8nL4hADmvNA_nO4-va_v";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);