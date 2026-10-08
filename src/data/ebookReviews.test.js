import { describe, it, expect } from 'vitest'
import { EBOOK_REVIEWS, getAverageRating } from './ebookReviews'

describe('ebookReviews', () => {
  it('has exactly 20 entries', () => {
    expect(EBOOK_REVIEWS.length).toBe(20)
  })

  it('every rating is 4 or 5', () => {
    EBOOK_REVIEWS.forEach(r => expect([4, 5]).toContain(r.rating))
  })

  it('every entry has a unique id, name, and quote', () => {
    const ids = new Set(EBOOK_REVIEWS.map(r => r.id))
    expect(ids.size).toBe(EBOOK_REVIEWS.length)
    EBOOK_REVIEWS.forEach(r => {
      expect(r.name).toBeTruthy()
      expect(r.quote).toBeTruthy()
    })
  })

  it('rounds to the 4.6 average shown on the page', () => {
    expect(getAverageRating().toFixed(1)).toBe('4.6')
  })
})
