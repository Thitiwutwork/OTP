import { createClient } from "@supabase/supabase-js";

const rawUrl = import.meta.env.VITE_SUPABASE_URL || "https://hkytokzaqnxvdrbhskaj.supabase.co";
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhreXRva3phcW54dmRyYmhza2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NjkwNTMsImV4cCI6MjEwNjE0NTA1M30.J0CPgQMm3hLbQrnD-hRO_hFsJtC-PQgyjI7qCyL0-Zg";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
