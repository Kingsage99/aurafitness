import { describe, it, expect } from 'vitest'
import { mapAuthError } from './authErrors'

describe('mapAuthError', () => {
  it('returns empty string for no error', () => {
    expect(mapAuthError(null)).toBe('')
  })

  describe('signup context', () => {
    it('hides account-existence info for user_already_exists', () => {
      const msg = mapAuthError({ code: 'user_already_exists', message: 'User already registered' }, { context: 'signup' })
      expect(msg).not.toMatch(/already registered/i)
      expect(msg).toMatch(/logging in instead/i)
    })

    it('hides account-existence info for email_exists', () => {
      const msg = mapAuthError({ code: 'email_exists', message: 'Email exists' }, { context: 'signup' })
      expect(msg).toMatch(/logging in instead/i)
    })

    it('passes through weak_password unchanged (actionable)', () => {
      const msg = mapAuthError({ code: 'weak_password', message: 'Password is too weak' }, { context: 'signup' })
      expect(msg).toBe('Password is too weak')
    })

    it('passes through over_email_send_rate_limit unchanged (actionable)', () => {
      const msg = mapAuthError({ code: 'over_email_send_rate_limit', message: 'Rate limit exceeded' }, { context: 'signup' })
      expect(msg).toBe('Rate limit exceeded')
    })

    it('passes through email_address_invalid unchanged (actionable)', () => {
      const msg = mapAuthError({ code: 'email_address_invalid', message: 'Invalid email' }, { context: 'signup' })
      expect(msg).toBe('Invalid email')
    })

    it('passes through unrecognized codes unchanged rather than silently hiding them', () => {
      const msg = mapAuthError({ code: 'signup_disabled', message: 'Signups are disabled' }, { context: 'signup' })
      expect(msg).toBe('Signups are disabled')
    })
  })

  describe('signin context (regression: must match existing Auth.jsx behavior exactly)', () => {
    it('maps Invalid login credentials to the existing generic message', () => {
      const msg = mapAuthError({ message: 'Invalid login credentials' }, { context: 'signin' })
      expect(msg).toBe('Incorrect email or password.')
    })

    it('passes through any other sign-in error unchanged', () => {
      const msg = mapAuthError({ message: 'Email not confirmed' }, { context: 'signin' })
      expect(msg).toBe('Email not confirmed')
    })
  })

  describe('verify/recovery context', () => {
    it('gives a friendly expiry message for otp_expired', () => {
      const msg = mapAuthError({ code: 'otp_expired', message: 'Token has expired' }, { context: 'verify' })
      expect(msg).toMatch(/expired/i)
    })

    it('gives a generic invalid-code message for anything else', () => {
      const msg = mapAuthError({ code: 'otp_disabled', message: 'some raw wording' }, { context: 'recovery' })
      expect(msg).not.toBe('some raw wording')
      expect(msg).toMatch(/isn't valid/i)
    })
  })

  it('falls back to the raw message when context is unrecognized', () => {
    expect(mapAuthError({ message: 'raw' }, { context: 'unknown' })).toBe('raw')
  })
})
