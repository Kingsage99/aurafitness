import { describe, it, expect } from 'vitest'
import { validatePassword, MIN_PASSWORD_LENGTH } from './passwordPolicy'

describe('validatePassword', () => {
  it('rejects a password one character below the minimum', () => {
    const short = 'a'.repeat(MIN_PASSWORD_LENGTH - 1)
    const { valid, message } = validatePassword(short)
    expect(valid).toBe(false)
    expect(message).toMatch(new RegExp(`${MIN_PASSWORD_LENGTH}`))
  })

  it('accepts a password exactly at the minimum length', () => {
    const exact = 'a'.repeat(MIN_PASSWORD_LENGTH)
    expect(validatePassword(exact).valid).toBe(true)
  })

  it('accepts a password above the minimum length', () => {
    expect(validatePassword('a'.repeat(MIN_PASSWORD_LENGTH + 10)).valid).toBe(true)
  })

  it('rejects an empty password', () => {
    expect(validatePassword('').valid).toBe(false)
  })

  it('rejects a missing password without throwing', () => {
    expect(validatePassword(undefined).valid).toBe(false)
  })

  it('respects an explicit minLength override', () => {
    expect(validatePassword('12345', 10).valid).toBe(false)
    expect(validatePassword('1234567890', 10).valid).toBe(true)
  })
})
