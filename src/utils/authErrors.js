// Maps a Supabase Auth error to user-facing copy. Prefers the stable
// error.code (see @supabase/auth-js/src/lib/error-codes.ts) over message-string
// matching, since Supabase's exact wording can change between versions.
//
// The rule: only replace a message when showing it verbatim would leak
// information the user has no legitimate need for (e.g. "this email is
// already registered" on signup — confirms account existence to an attacker).
// Anything actionable (weak password, invalid email, rate limited) passes
// through unchanged so the user can actually fix it.
export function mapAuthError(error, { context } = {}) {
  if (!error) return ''
  const code = error.code
  const message = error.message || 'Something went wrong. Please try again.'

  if (context === 'signup') {
    if (code === 'user_already_exists' || code === 'email_exists') {
      return "Something went wrong creating your account. If you already have one, try logging in instead."
    }
    return message
  }

  if (context === 'signin') {
    // Supabase returns the same generic message for "wrong password" and
    // "email not found" — preserved exactly as before, no regression.
    return message === 'Invalid login credentials' ? 'Incorrect email or password.' : message
  }

  if (context === 'verify' || context === 'recovery') {
    if (code === 'otp_expired') return "That code expired — request a new one."
    return "That code isn't valid. Check it and try again."
  }

  return message
}
