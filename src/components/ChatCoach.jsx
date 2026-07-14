import React, { useState, useRef, useEffect } from 'react'
import { chatWithCoach } from '../utils/claudeApi'
import { NB, NB_BORDER, hardShadow, nbCardStyle } from '../styles/neoBrutalism'

const GREETING = "Hey! I'm your MissVfit coach 💪 Ask me anything — workout form, meal swaps, motivation, or what muscles you're hitting today."

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '10px 14px', alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, background: NB.ink,
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
          background: open ? NB.ink : NB.magenta,
          border: NB_BORDER, cursor: 'pointer',
          boxShadow: hardShadow(4),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.15s',
          transform: open ? 'scale(0.92)' : 'scale(1)',
        }}
        aria-label="Chat with MissVfit coach"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: open ? '72%' : 0,
        overflow: 'hidden',
        transition: 'height 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        zIndex: 35,
        background: NB.white,
        borderTop: open ? NB_BORDER : 'none',
        borderTopLeftRadius: open ? 22 : 0,
        borderTopRightRadius: open ? 22 : 0,
        boxShadow: open ? `0 -6px 0 ${NB.ink}` : 'none',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Handle bar */}
        <div style={{ flexShrink: 0, padding: '10px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: 36, height: 4, background: NB.ink, margin: '0 auto' }} />
        </div>

        {/* Header */}
        <div style={{ flexShrink: 0, padding: '8px 22px 10px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `2px solid ${NB.ink}` }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: NB.magenta, border: NB_BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l2.2 5.5L20 9l-4.5 3.8L17 19l-5-3-5 3 1.5-6.2L4 9l5.8-.5z" />
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>MissVfit Coach</div>
            <div style={{ fontFamily: NB.fontMono, fontSize: 11, color: NB.green, fontWeight: 700 }}>● Online</div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'assistant' && (
                <div style={{ width: 26, height: 26, borderRadius: 8, background: NB.magenta, border: `1.5px solid ${NB.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 7, marginTop: 2 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3l2.2 5.5L20 9l-4.5 3.8L17 19l-5-3-5 3 1.5-6.2L4 9l5.8-.5z" />
                  </svg>
                </div>
              )}
              <div style={{
                maxWidth: '78%', padding: '10px 14px',
                ...nbCardStyle(msg.role === 'user' ? NB.yellow : NB.cream, 2),border: `3px solid ${NB.white}`, 
                borderRadius: 14,
                color: NB.ink,
                fontSize: 13, lineHeight: 1.55, fontWeight: 500,
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7 }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: NB.magenta, border: `1.5px solid ${NB.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l2.2 5.5L20 9l-4.5 3.8L17 19l-5-3-5 3 1.5-6.2L4 9l5.8-.5z" />
                </svg>
              </div>
              <div style={{ ...nbCardStyle(NB.cream, 2), border: `3px solid ${NB.white}`, borderRadius: 12 }}>
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input row */}
        <div style={{ flexShrink: 0, padding: '8px 16px 16px', borderTop: `2px solid ${NB.ink}`, display: 'flex', gap: 8 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask MissVfit anything…"
            style={{
              flex: 1, height: 42, border: `2px solid ${NB.ink}`, borderRadius: 12,
              padding: '0 14px', fontSize: 14, color: NB.ink,
              fontFamily: 'inherit', outline: 'none', background: NB.white,
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            style={{
              width: 42, height: 42, borderRadius: 12, border: `2px solid ${NB.ink}`,
              background: input.trim() && !loading ? NB.teal : NB.white,
              cursor: input.trim() && !loading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim() && !loading ? NB.ink : '#999'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Dim backdrop when chat is open */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,.35)', zIndex: 34 }}
        />
      )}
    </>
  )
}
