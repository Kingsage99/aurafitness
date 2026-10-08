// Placeholder testimonials for "The Shape Shift Playbook" sales page.
//
// The ebook has no real customers yet — these 20 entries were written
// pre-launch, at the user's explicit direction, to populate the reviews
// section before real reviews exist. They deliberately avoid quantified
// body-transformation claims ("lost X kg") to reduce (not eliminate) the
// fabricated-social-proof risk of displaying them as genuine testimonials.
// Names are first-name + last-initial only, not real identifiable people,
// no fake "verified buyer" badges. Written in a casual, texted-this-quickly
// register on purpose (contractions, short clauses, no em-dashes) rather
// than polished ad copy. MUST be swapped for real reviews once the product
// has actual customers — see the sales-page plan for context.

export const EBOOK_REVIEWS = [
  { id: 'r01', name: 'Priya K.', initial: 'P', rating: 5,
    quote: "I've bought like three fitness ebooks before this one. Never opened them again. This one's actually still open on my phone.",
    detail: 'Read it in 3 days' },
  { id: 'r02', name: 'Megan T.', initial: 'M', rating: 5,
    quote: "No ‘what's your body type’ quiz thing. Just one system and it tells you how to tweak it for whatever's going on with you. Honestly all I wanted.",
    detail: null },
  { id: 'r03', name: 'Sophie N.', initial: 'S', rating: 4,
    quote: "Genuinely useful. I just wish Part 3's exercise grid had a couple filled-in examples before throwing a blank page at me.",
    detail: null },
  { id: 'r04', name: 'Chinwe O.', initial: 'C', rating: 5,
    quote: "The Swap System is the first nutrition thing I've read that didn't just throw a number at me and leave. It actually explains the logic so I can use it on my own meals.",
    detail: 'Sent it to two friends already' },
  { id: 'r05', name: 'Freya D.', initial: 'F', rating: 5,
    quote: 'The volume trick section rewired how I think about food honestly. Eating more and still staying on track for fat loss felt like cheating.',
    detail: null },
  { id: 'r06', name: 'Natalie P.', initial: 'N', rating: 5,
    quote: 'Squat, hinge, push, pull, core. Once I had that in my head, picking exercises stopped being the scary part of training.',
    detail: 'Still going back to Part 3' },
  { id: 'r07', name: 'Bianca S.', initial: 'B', rating: 4,
    quote: 'Solid and clear, not preachy at all. A printable version of the weekly template would make it so much easier to actually use day to day though.',
    detail: null },
  { id: 'r08', name: 'Ingrid L.', initial: 'I', rating: 5,
    quote: 'No strict calorie number anywhere in this book and honestly such a relief. Just clear directions for fat loss, maintenance, muscle gain, and why each one works.',
    detail: 'Read it in a weekend' },
  { id: 'r09', name: 'Lucia M.', initial: 'L', rating: 4,
    quote: "Really well put together. Part 1's goal checklist took me way longer than I thought it would because it actually made me think, which I guess is the whole point.",
    detail: null },
  { id: 'r10', name: 'Nadia E.', initial: 'N', rating: 5,
    quote: 'One customizable weekly template instead of three rigid ones to pick from. I had my own week built around it in like ten minutes.',
    detail: 'Printed the template already' },
  { id: 'r11', name: 'Olivia G.', initial: 'O', rating: 5,
    quote: "Every other guide I've read sorts you into a category by page one. This one just asks what you actually want. Felt like a small thing until it really wasn't.",
    detail: null },
  { id: 'r12', name: 'Quinn A.', initial: 'Q', rating: 4,
    quote: "Good structure all the way through. I did have to reread Part 3's frequency and intensity bit twice before it clicked, but worth it.",
    detail: null },
  { id: 'r13', name: 'Rosa J.', initial: 'R', rating: 5,
    quote: 'The three-level progression is what got me. Build the Habit now, Build Results later, all without needing a whole new book.',
    detail: null },
  { id: 'r14', name: 'Vivian T.', initial: 'V', rating: 4,
    quote: 'A few more diagrams next to the movement pattern stuff would help visual people like me, but honestly the writing carries it fine on its own.',
    detail: null },
  { id: 'r15', name: 'Ximena L.', initial: 'X', rating: 5,
    quote: "I've trained on and off for years and still learned something new in Part 3 about proximity to failure. This isn't just for beginners.",
    detail: null },
  { id: 'r16', name: 'Amara S.', initial: 'A', rating: 4,
    quote: "Clear and well organized. Wish Part 4 explained the 'effort' guideline with a bit more detail for people who've genuinely never lifted before though.",
    detail: null },
  { id: 'r17', name: 'Holly R.', initial: 'H', rating: 5,
    quote: "The goal checklist in Part 1 made me realize I'd basically been chasing three different, kind of contradictory goals at once. Cleared up so much.",
    detail: 'Read it in 4 days' },
  { id: 'r18', name: 'Simone H.', initial: 'S', rating: 5,
    quote: "First fitness book I've read where the nutrition and training sections actually talk to each other, instead of feeling like two different books taped together.",
    detail: null },
  { id: 'r19', name: 'Ursula J.', initial: 'U', rating: 4,
    quote: "Good read but dense. I'd do it in two sittings instead of one, there's more to take in per page than I expected going in.",
    detail: null },
  { id: 'r20', name: 'Wren A.', initial: 'W', rating: 4,
    quote: 'Solid framework, explained clearly. Just wanted a bit more on the recovery side of the Core System, training and nutrition get most of the space.',
    detail: null },
]

// Rotates through the page's 3-hue palette for review-card avatars —
// EBOOK.lavender / EBOOK.lavenderDeep / EBOOK.ink, in that order, by index.
export function avatarColorFor(index) {
  return index % 3
}

export function getAverageRating(reviews = EBOOK_REVIEWS) {
  const total = reviews.reduce((sum, r) => sum + r.rating, 0)
  return total / reviews.length
}
