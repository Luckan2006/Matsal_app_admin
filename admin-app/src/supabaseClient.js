import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://oxqkyajcuiqkkzbitufo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cWt5YWpjdWlxa2t6Yml0dWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMjY1NTksImV4cCI6MjA3OTgwMjU1OX0.bCabibJpB50tKr0jLssB6zmFFx8cTaAbUBitIeziiIg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
