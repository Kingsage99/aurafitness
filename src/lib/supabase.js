import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// flowType: 'pkce' — the library default is 'implicit', which puts access/
// refresh tokens directly in the URL fragment after the Google OAuth redirect.
// PKCE exchanges a single-use `code` for tokens via a POST instead, which
// Supabase recommends for SPAs. Email verification/reset now go through
// verifyOtp() directly (see Auth.jsx) and never touch the redirect URL, so
// this only affects the Google sign-in button — test that live after this change.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: 'pkce' },
})
