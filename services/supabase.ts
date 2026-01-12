
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yfeqddbvvhioyllkcnca.supabase.co';
const supabaseAnonKey = 'sb_publishable_wXpZdqfj7wBjJSRREWbMFg_tHT2fUBq';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
