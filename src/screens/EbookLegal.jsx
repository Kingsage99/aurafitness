import React from 'react'
import { EBOOK, EBOOK_BORDER, ebookCardStyle, NB_RADIUS_SM } from '../styles/ebookTheme'

// A standalone public page (routed at /legal in src/Root.jsx) — NOT the
// app's LegalDoc.jsx, which is built as a phone-frame app screen (renders
// <StatusBar/>, assumes the 384×832 app shell) and whose content is
// entirely about the logged-in app (Pro subscriptions, AI processing, the
// social feed). This page is written fresh for the one thing it actually
// covers: a one-time $26.99 digital PDF purchase, guest checkout, no account.
const EFFECTIVE_DATE = 'October 2026'
const CONTACT_EMAIL = 'support@missvfit.app'

// Refund language reflects the seller's explicit choice: no refunds once
// the file has been downloaded. Drafted plainly, not as reviewed legal
// copy — UK/EU consumer law gives a statutory withdrawal right for digital
// content that can be waived once download begins, provided that's
// disclosed clearly before purchase (see the buy-button disclosure lines
// on the sales page) — worth a solicitor/precedent check before relying on
// this to extinguish that right at scale.
const SECTIONS = [
  {
    title: 'Terms of Service',
    items: [
      { h: 'What you’re buying', body: 'The Shape Shift Playbook is a digital PDF guide, delivered as an instant download after payment. No physical item is shipped, and no MissVfit account is required to buy it.' },
      { h: 'License', body: 'Your purchase gives you a personal-use copy of the Playbook. It’s yours to keep and use for your own training and nutrition. Please don’t redistribute, resell, or share the file itself.' },
      { h: 'Not medical advice', body: 'The Playbook offers general training and nutrition education. It isn’t a medical device and doesn’t provide medical advice, diagnosis, or treatment. Talk to a doctor before starting a new exercise or nutrition program, especially if you’re pregnant, injured, or managing a health condition.' },
      { h: 'Payment', body: 'Payments are processed by Stripe. MissVfit never sees or stores your full card details.' },
      { h: 'Age', body: 'You must be at least 16 years old to purchase the Playbook.' },
      { h: 'Changes to these terms', body: 'We may update these Terms occasionally. The effective date below reflects the latest version.' },
      { h: 'Contact', body: `Questions about these Terms? Email ${CONTACT_EMAIL}.` },
    ],
  },
  {
    title: 'Privacy Policy',
    items: [
      { h: 'What we collect', body: 'This page doesn’t create an account or collect health data. At checkout, Stripe collects your email and payment details directly. MissVfit receives your email and purchase confirmation from Stripe, not your card information.' },
      { h: 'How we use it', body: 'Your email is used to verify your purchase and, if you contact support, to help with your order. We don’t sell your information.' },
      { h: 'Analytics', body: 'This page uses PostHog to understand anonymous visit and purchase-funnel trends (e.g. how many visitors reach checkout). This doesn’t identify you personally.' },
      { h: 'Service providers', body: 'Stripe processes payment. Supabase stores the purchase record and the Playbook file itself, in a private location not accessible without a verified purchase.' },
      { h: 'Your rights', body: `To request a copy of what we hold about your purchase, or to have it deleted, email ${CONTACT_EMAIL}.` },
      { h: 'Contact', body: `Questions about this Privacy Policy? Email ${CONTACT_EMAIL}.` },
    ],
  },
  {
    title: 'Refund Policy',
    items: [
      { h: 'Non-refundable once downloaded', body: 'Because this is a digital product delivered instantly on purchase, once you’ve downloaded the Playbook the sale is final and non-refundable.' },
      { h: 'Before you download', body: `If you haven’t yet downloaded your copy and have a genuine issue with your purchase, contact ${CONTACT_EMAIL} within 14 days of buying.` },
      { h: 'Trouble accessing your file', body: `If payment went through but you couldn’t verify or download your copy, that’s not covered by the above. Email ${CONTACT_EMAIL} with your receipt and we’ll get your copy to you directly.` },
    ],
  },
]

export default function EbookLegal() {
  return (
    <div style={{ minHeight: '100vh', width: '100%', background: EBOOK.white, boxSizing: 'border-box', padding: '32px 20px 60px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <a href="/" style={{ fontFamily: EBOOK.fontMono, fontSize: 12.5, fontWeight: 700, color: EBOOK.textMuted, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={EBOOK.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Back to The Shape Shift Playbook
        </a>

        <div style={{ fontFamily: EBOOK.fontDisplay, fontWeight: 900, fontSize: 'clamp(26px, 5vw, 34px)', textTransform: 'uppercase', color: EBOOK.ink, marginTop: 20 }}>
          Legal
        </div>
        <div style={{ fontFamily: EBOOK.fontMono, fontSize: 12, color: EBOOK.textMuted, marginTop: 6 }}>Effective {EFFECTIVE_DATE}</div>

        {SECTIONS.map(section => (
          <div key={section.title} style={{ marginTop: 36 }}>
            <div style={{ fontFamily: EBOOK.fontDisplay, fontWeight: 900, fontSize: 19, textTransform: 'uppercase', color: EBOOK.ink, marginBottom: 14 }}>
              {section.title}
            </div>
            <div style={{ ...ebookCardStyle(EBOOK.white, 4), borderRadius: NB_RADIUS_SM, padding: '20px 22px' }}>
              {section.items.map(({ h, body }, i) => (
                <div key={h} style={{ marginBottom: i === section.items.length - 1 ? 0 : 18 }}>
                  <div style={{ fontFamily: EBOOK.fontDisplay, fontWeight: 800, fontSize: 14, color: EBOOK.ink, marginBottom: 5 }}>{h}</div>
                  <div style={{ fontSize: 13, color: EBOOK.textBody, lineHeight: 1.6 }}>{body}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ borderTop: EBOOK_BORDER, marginTop: 40, paddingTop: 20, textAlign: 'center' }}>
          <div style={{ fontFamily: EBOOK.fontMono, fontSize: 11, color: EBOOK.textMuted }}>© {new Date().getFullYear()} MissVfit. All rights reserved.</div>
        </div>
      </div>
    </div>
  )
}
