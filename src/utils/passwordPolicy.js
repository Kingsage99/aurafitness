// Client-side mirror of Supabase's server-side minimum password length, so
// users get instant feedback instead of a signup round-trip.
//
// UNVERIFIED PLACEHOLDER: 6 is Supabase's historical platform default, but the
// actual enforced minimum is a per-project dashboard setting (Authentication →
// Policies → Password Requirements) not exposed by any MCP tool. Confirm the
// real value there and update this constant before relying on it — if it's
// wrong, this check will either block passwords the server would accept, or
// (worse) let through ones the server rejects, surfacing as a signup error.
export const MIN_PASSWORD_LENGTH = 6

export function validatePassword(password, minLength = MIN_PASSWORD_LENGTH) {
  const value = password || ''
  if (value.length < minLength) {
    return { valid: false, message: `Password must be at least ${minLength} characters.` }
  }
  return { valid: true, message: '' }
}
