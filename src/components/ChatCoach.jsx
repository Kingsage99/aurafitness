import React, { useState, useRef, useEffect } from 'react'
import { chatWithCoach } from '../utils/claudeApi'

const GREETING = "Hey! I'm Aura, your fitness coach 💪 Ask me anything — workout form, meal swaps, motivation, or what muscles you're hitting today."

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '10px 14px', alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%', background: '#C4B0E0',
          animation: 'bounce 1.2s ease-in-out infinite',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}

export default function ChatCoach({ userProfile, aboveNav = true }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: GREETING, id: 0 },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef()
  const inputRef = useRef()

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
        inputRef.current?.focus()
      }, 300)
    }
  }, [open])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const userMsg = { role: 'user', content: text, id: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    const history = messages.map(m => ({ role: m.role, content: m.content }))
    const reply = await chatWithCoach(text, userProfile, history)

    setMessages(prev => [...prev, { role: 'assistant', content: reply, id: Date.now() + 1 }])
    setLoading(false)
  }

  const fabBottom = aboveNav ? 76 : 20

  return (
    <>
      {/* Floating action button */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position: 'absolute', bottom: fabBottom, right: 16, zIndex: 40,
          width: 52, height: 52, borderRadius: '50%',
          background: open ? '#5B21B6' : '#7C3AED',
          border: 'none', cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(124,58,237,.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s, transform 0.2s',
          transform: open ? 'scale(0.92)' : 'scale(1)',
        }}
        aria-label="Chat with Aura coach"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: open ? '72%' : 0,
        overflow: 'hidden',
        transition: 'height 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        zIndex: 35,
        borderRadius: '28px 28px 46px 46px',
        background: '#fff',
        boxShadow: open ? '0 -12px 40px rgba(46,16,101,.18)' : 'none',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Handle bar */}
        <div style={{ flexShrink: 0, padding: '10px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#EDE4F8', margin: '0 auto' }} />
        </div>

        {/* Header */}
        <div style={{ flexShrink: 0, padding: '8px 22px 10px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #F3EEFF' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#5B21B6,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l2.2 5.5L20 9l-4.5 3.8L17 19l-5-3-5 3 1.5-6.2L4 9l5.8-.5z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#2E1065' }}>Aura Coach</div>
            <div style={{ fontSize: 11, color: '#7C3AED', fontWeight: 600 }}>● Online</div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'assistant' && (
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#5B21B6,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 7, marginTop: 2 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3l2.2 5.5L20 9l-4.5 3.8L17 19l-5-3-5 3 1.5-6.2L4 9l5.8-.5z" />
                  </svg>
                </div>
              )}
              <div style={{
                maxWidth: '78%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: msg.role === 'user' ? '#7C3AED' : '#F8F4FF',
                color: msg.role === 'user' ? '#fff' : '#2E1065',
                fontSize: 13, lineHeight: 1.55, fontWeight: 500,
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#5B21B6,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l2.2 5.5L20 9l-4.5 3.8L17 19l-5-3-5 3 1.5-6.2L4 9l5.8-.5z" />
                </svg>
              </div>
              <div style={{ background: '#F8F4FF', borderRadius: '18px 18px 18px 4px' }}>
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input row */}
        <div style={{ flexShrink: 0, padding: '8px 16px 16px', borderTop: '1px solid #F3EEFF', display: 'flex', gap: 8 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask Aura anything…"
            style={{
              flex: 1, height: 42, borderRadius: 14, border: '1.5px solid #EDE4F8',
              padding: '0 14px', fontSize: 14, color: '#2E1065',
              fontFamily: 'inherit', outline: 'none',
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            style={{
              width: 42, height: 42, borderRadius: 12, border: 'none',
              background: input.trim() && !loading ? '#7C3AED' : '#EDE4F8',
              cursor: input.trim() && !loading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background 0.2s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim() && !loading ? '#fff' : '#A99BC4'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Dim backdrop when chat is open */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'absolute', inset: 0, background: 'rgba(46,16,101,.2)', zIndex: 34, borderRadius: 46 }}
        />
      )}
    </>
  )
}
