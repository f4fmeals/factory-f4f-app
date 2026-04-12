import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yprzrrnjnodvtanimzcr.supabase.co'
const supabaseKey = 'sb_publishable_rTMZW2h2AKeji3QsOWUErQ_VYv6IbbF'

export const supabase = createClient(supabaseUrl, supabaseKey)