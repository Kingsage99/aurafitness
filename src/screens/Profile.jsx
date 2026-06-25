import React, { useState } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import AvatarSilhouette from '../components/AvatarSilhouette'
import { supabase } from '../lib/supabase'

const STATS = [
  { label: 'Streak', value: '12', unit: 'days', icon: '🔥' },
  { label: 'Workouts', value: '24', unit: 'total', icon: '💪' },
  { label: 'Volume', value: '1.2k', unit: 'kg', icon: '⚡' },
]

export default function Profile({ userProfile, onNavigate }) {
  const [activeTab, setActiveTab] = useState('goals')
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
  }

  return (
    <>
      <StatusBar />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '8px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: '#2E1065' }}>Profile</div>
          <button onClick={handleSignOut} disabled={signingOut} style={{ height: 36, padding: '0 14px', borderRadius: 12, background: '#FEF2F2', color: '#DC2626', fontWeight: 700, fontSize: 12, border: '1.5px solid #FECACA', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>

        {/* Avatar + Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px 0' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'radial-gradient(circle at 40% 35%, #C4A8E8, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(124,58,237,.3)',
              overflow: 'hidden',
            }}>
              <AvatarSilhouette height={72} color='rgba(255,255,255,0.9)' />
            </div>
            <div style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: '50%', background: '#7C3AED', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#2E1065' }}>{userProfile?.name || 'Aura User'}</div>
            <div style={{ fontSize: 13, color: '#8478A0', marginTop: 2 }}>Foundation phase</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <div style={{ height: 6, flex: 1, borderRadius: 3, background: '#EDE4F8', overflow: 'hidden' }}>
                <div style={{ width: '20%', height: '100%', background: 'linear-gradient(90deg,#7C3AED,#C77DFF)', borderRadius: 3 }}></div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED' }}>LVL 5</span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 10, padding: '16px 24px 0' }}>
          {STATS.map(stat => (
            <div key={stat.label} style={{ flex: 1, borderRadius: 18, background: '#fff', padding: '12px 10px', boxShadow: '0 4px 12px rgba(76,36,120,.05)', textAlign: 'center' }}>
              <div style={{ fontSize: 20 }}>{stat.icon}</div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#2E1065', lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: 10, color: '#8478A0', fontWeight: 600 }}>{stat.unit}</div>
              <div style={{ fontSize: 10, color: '#A99BC4', fontWeight: 700 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* XP bar */}
        <div style={{ padding: '14px 24px 0' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '11px 14px', boxShadow: '0 4px 12px rgba(76,36,120,.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#7C3AED' }}>LVL 5</span>
              <span style={{ fontSize: 11, color: '#8478A0', fontWeight: 700 }}>100 / 500 XP</span>
            </div>
            <div style={{ height: 7, borderRadius: 4, background: '#EDE4F8', overflow: 'hidden' }}>
              <div style={{ width: '20%', height: '100%', background: 'linear-gradient(90deg,#7C3AED,#C77DFF)', borderRadius: 4 }}></div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ padding: '14px 24px 0', display: 'flex', gap: 10 }}>
          {[['stats', 'Stats'], ['goals', 'Goal & streak']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                flex: 1, height: 42, borderRadius: 14,
                background: activeTab === id ? '#7C3AED' : '#fff',
                color: activeTab === id ? '#fff' : '#8478A0',
                fontWeight: activeTab === id ? 800 : 700, fontSize: 13,
                border: 'none', cursor: 'pointer',
                boxShadow: activeTab === id ? '0 8px 16px rgba(124,58,237,.26)' : '0 3px 10px rgba(76,36,120,.05)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'goals' && (
          <div style={{ padding: '14px 24px 0', display: 'flex', gap: 14, flex: 1 }}>
            {/* Badge */}
            <div style={{ flex: 1, position: 'relative', borderRadius: 22, background: 'radial-gradient(70% 55% at 50% 26%,#2C1B45,#180F28)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '16px 12px', minHeight: 180 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: '#C9B7E8', letterSpacing: '.8px' }}>SILVER TIER</span>
              <div style={{ position: 'relative', margin: '12px 0', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'radial-gradient(circle at 38% 32%,#FBFCFF,#AEB8D6 70%,#8C97BC)', boxShadow: '0 0 22px rgba(226,232,255,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="#5A6488">
                    <path d="M12 2l2.6 5.8L21 8.6l-4.7 4.3L17.7 20 12 16.8 6.3 20l1.4-7.1L3 8.6l6.4-.8z"/>
                  </svg>
                </div>
              </div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: '#fff' }}>Rising Star</div>
              <button style={{ marginTop: 10, height: 32, padding: '0 12px', borderRadius: 10, background: 'rgba(255,255,255,.16)', color: '#fff', fontWeight: 800, fontSize: 11, border: 'none', cursor: 'pointer' }}>
                Customize
              </button>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ borderRadius: 18, background: 'linear-gradient(140deg,#7C3AED,#A855F7)', padding: '13px', boxShadow: '0 10px 22px rgba(124,58,237,.26)' }}>
                <div style={{ fontSize: 11, color: '#EADBFF', fontWeight: 700 }}>Weekly goal</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
                  <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#fff' }}>Done!</span>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3"/></svg>
                </div>
              </div>
              <div style={{ borderRadius: 18, background: '#fff', padding: '12px', boxShadow: '0 4px 12px rgba(76,36,120,.06)' }}>
                <div style={{ fontSize: 11, color: '#8478A0', fontWeight: 700 }}>Current streak</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#FB923C"><path d="M12 2c1.5 3.5 5 4.5 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2.5-5C9.5 7 11 6 12 2z"/></svg>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#2E1065' }}>12 days</span>
                </div>
              </div>
              <div style={{ borderRadius: 18, background: '#fff', padding: '12px', boxShadow: '0 4px 12px rgba(76,36,120,.06)' }}>
                <div style={{ fontSize: 11, color: '#8478A0', fontWeight: 700 }}>Longest streak</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 5 5.6.8-4 4 1 5.6L12 20l-5 2.4 1-5.6-4-4 5.6-.8z"/></svg>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#2E1065' }}>5 weeks</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div style={{ padding: '14px 24px 0' }}>
            <div style={{ borderRadius: 20, background: '#fff', padding: '16px', boxShadow: '0 4px 12px rgba(76,36,120,.05)', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#2E1065', marginBottom: 12 }}>Weekly workouts</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 60 }}>
                {[3, 5, 0, 4, 2, 0, 0].map((val, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{ width: '100%', height: val > 0 ? `${(val / 5) * 48}px` : 4, background: val > 0 ? '#7C3AED' : '#EDE4F8', borderRadius: 4 }}></div>
                    <span style={{ fontSize: 9, color: '#A99BC4', fontWeight: 700 }}>{['M','T','W','T','F','S','S'][i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Badges */}
        <div style={{ padding: '14px 24px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#2E1065', letterSpacing: '.3px' }}>Badges earned</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', background: '#F3E8FF', padding: '3px 9px', borderRadius: 999 }}>9</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { bg: '#FFF1DC', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2c1.5 3.5 5 4.5 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2.5-5C9.5 7 11 6 12 2z"/></svg> },
              { bg: '#F3E8FF', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3"/></svg> },
              { bg: '#FCE7F3', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DB2777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 5 5.6.8-4 4 1 5.6L12 20l-5 2.4 1-5.6-4-4 5.6-.8z"/></svg> },
            ].map((badge, i) => (
              <div key={i} style={{ flex: 1, height: 54, borderRadius: 14, background: badge.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {badge.icon}
              </div>
            ))}
            <div style={{ flex: 1, height: 54, borderRadius: 14, background: '#fff', boxShadow: '0 3px 10px rgba(76,36,120,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A99BC4', fontWeight: 800, fontSize: 13 }}>+6</div>
          </div>
        </div>
      </div>

      <BottomNav active="profile" onNavigate={onNavigate} />
    </>
  )
}
