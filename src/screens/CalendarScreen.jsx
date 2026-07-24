import React, { useState, useEffect } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomSheet from '../components/BottomSheet'
import { CalendarIcon, GemIcon, StrengthArmIcon, WeightlifterIcon, MealPlateIcon, renderIcon } from '../components/Icons'
import { MealTypeIcon } from '../components/MealTypeIcon'
import { dateKeyFor, getWeekdayIndex } from '../utils/workoutBuilder'
import { getDailyQuests } from '../utils/gamification'
import { fetchWorkoutHistory, fetchNutritionLog } from '../lib/social'
import { NB, NB_BORDER, hardShadow, nbCardStyle, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW } from '../styles/neoBrutalism'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

// Where a quest can actually be worked on — tapping an incomplete task goes here.
const QUEST_TARGET_SCREEN = {
  complete_workout: 'workout',
  maintain_streak: 'workout',
  log_breakfast: 'meals',
  log_lunch: 'meals',
  log_dinner: 'meals',
  log_3_meals: 'meals',
  hit_calories: 'meals',
  hit_protein: 'meals',
  post_or_react: 'discovery',
}

function toKey(year, month, day) {
  return dateKeyFor(new Date(year, month, day))
}

// Same reconciliation WorkoutRoutine.jsx uses: an explicit one-off override
// takes priority, otherwise fall back to the recurring weekly template.
function effectiveAssignment(dateKey, routine, weeklyPlan) {
  if (routine[dateKey]) return routine[dateKey]
  const [y, m, d] = dateKey.split('-').map(Number)
  const slot = weeklyPlan?.[getWeekdayIndex(new Date(y, m - 1, d))]
  if (!slot?.isTrainingDay) return null
  return { label: slot.label, exercises: slot.workout?.exercises, split: slot.label }
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function iconBoxStyle(bg) {
  return { width: 42, height: 42, borderRadius: 12, border: `2px solid ${NB.ink}`, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }
}

export default function CalendarScreen({ gamification = {}, routine = {}, weeklyPlan, session, onClaimQuest, onNavigate }) {
  const todayKey = dateKeyFor()
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [workoutHistory, setWorkoutHistory] = useState([])
  const [nutritionLog, setNutritionLog] = useState([])
  const [showQuickActions, setShowQuickActions] = useState(false)

  useEffect(() => {
    if (!session?.user?.id) return
    fetchWorkoutHistory(session.user.id, 365).then(setWorkoutHistory)
    fetchNutritionLog(session.user.id, null).then(setNutritionLog)
  }, [session?.user?.id])

  const workoutSet = new Set(gamification.workoutDates || [])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()
  const leadOffset = getWeekdayIndex(new Date(viewYear, viewMonth, 1))
  const prevM = viewMonth === 0 ? 11 : viewMonth - 1
  const prevY = viewMonth === 0 ? viewYear - 1 : viewYear
  const nextM = viewMonth === 11 ? 0 : viewMonth + 1
  const nextY = viewMonth === 11 ? viewYear + 1 : viewYear

  const cells = []
  for (let i = 0; i < leadOffset; i++) {
    cells.push({ day: daysInPrevMonth - leadOffset + 1 + i, year: prevY, month: prevM, adjacent: true })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, year: viewYear, month: viewMonth, adjacent: false })
  }
  let trailDay = 1
  while (cells.length % 7 !== 0) {
    cells.push({ day: trailDay, year: nextY, month: nextM, adjacent: true })
    trailDay++
  }

  const handleCellTap = (cell) => {
    const key = toKey(cell.year, cell.month, cell.day)
    if (cell.adjacent) { setViewYear(cell.year); setViewMonth(cell.month) }
    setSelectedDate(key)
  }

  const isToday = selectedDate === todayKey
  const assigned = effectiveAssignment(selectedDate, routine, weeklyPlan)
  const historyRow = workoutHistory.find(r => dateKeyFor(new Date(r.completed_at)) === selectedDate)
  const mealsForDay = nutritionLog
    .filter(r => r.date === selectedDate)
    .sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at))
  const todaysQuests = isToday ? getDailyQuests(todayKey) : []
  const completedToday = isToday && gamification.dailyQuests?.date === todayKey ? (gamification.dailyQuests.completed || []) : []
  const claimedToday = isToday && gamification.dailyQuests?.date === todayKey ? (gamification.dailyQuests.claimed || []) : []

  const hasWorkoutEntry = !!(historyRow || assigned)
  const eventCount = (hasWorkoutEntry ? 1 : 0) + mealsForDay.length
  const taskCount = todaysQuests.length

  const [selY, selM, selD] = selectedDate.split('-').map(Number)
  const selectedDateObj = new Date(selY, selM - 1, selD)
  const weekdayLabel = selectedDateObj.toLocaleDateString('en-US', { weekday: 'long' })
  const fullDateLabel = selectedDateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })

  let workoutStart = null, workoutEnd = null
  if (historyRow) {
    workoutEnd = new Date(historyRow.completed_at)
    workoutStart = new Date(workoutEnd.getTime() - (historyRow.elapsed || 0) * 1000)
  }

  return (
    <>
      <StatusBar />

      {/* Header */}
      <div style={{ background: NB.lavender, padding: '12px 20px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => onNavigate('profile')} style={{ width: 38, height: 38, borderRadius: 12, border: `1.5px solid ${NB.ink}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: NB.ink }}>Calendar</div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 1 }}>{MONTH_NAMES[viewMonth]} {viewYear}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={prevMonth} style={{ width: 30, height: 30, borderRadius: 9, border: `1.5px solid ${NB.ink}`, background: NB.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>
            </button>
            <button onClick={nextMonth} style={{ width: 30, height: 30, borderRadius: 9, border: `1.5px solid ${NB.ink}`, background: NB.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9,18 15,12 9,6"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="scroll-fade-bottom" style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 90px' }}>
        {/* Weekday header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
          {DAY_NAMES.map(d => (
            <div key={d} style={{ textAlign: 'center', fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: '#555', padding: '2px 0' }}>{d}</div>
          ))}
        </div>

        {/* Month grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 16 }}>
          {cells.map((cell, i) => {
            const key = toKey(cell.year, cell.month, cell.day)
            const isTodayCell = key === todayKey
            const isSelected = key === selectedDate
            const hasWorkout = workoutSet.has(key)
            return (
              <div
                key={i}
                onClick={() => handleCellTap(cell)}
                style={{
                  height: 38, borderRadius: 10, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isSelected ? NB.magenta : (hasWorkout && !cell.adjacent) ? NB.teal : 'transparent',
                  border: isTodayCell ? `2px solid ${NB.ink}` : '2px solid transparent',
                  opacity: cell.adjacent ? 0.35 : 1,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: (isSelected || isTodayCell) ? 800 : 500, color: isSelected ? NB.white : NB.ink }}>{cell.day}</span>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 12, height: 12, borderRadius: 4, background: NB.teal, border: `1.5px solid ${NB.ink}` }} />
            <span style={{ fontSize: 11, color: '#555' }}>Workout completed</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 12, height: 12, borderRadius: 4, border: `2px solid ${NB.ink}` }} />
            <span style={{ fontSize: 11, color: '#555' }}>Today</span>
          </div>
        </div>

        <div style={{ height: 2, background: NB.ink, marginBottom: 18 }} />

        {/* Selected day summary */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: '#555', letterSpacing: 1, textTransform: 'uppercase' }}>
            {isToday ? 'Today' : weekdayLabel}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 30, color: NB.ink }}>{selD}</span>
            <span style={{ fontSize: 13, color: '#555' }}>
              {eventCount} event{eventCount === 1 ? '' : 's'}{isToday ? ` · ${taskCount} task${taskCount === 1 ? '' : 's'}` : ''}
            </span>
          </div>
          {!isToday && <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{fullDateLabel}</div>}
        </div>

        {/* Entries */}
        {eventCount === 0 && taskCount === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 20px' }}>
            <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}><CalendarIcon size={34} /></div>
            <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>Nothing logged this day</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {historyRow ? (
              <div style={{ ...nbCardStyle(NB.teal, 3), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={iconBoxStyle(NB.white)}><StrengthArmIcon size={22} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: NB.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{historyRow.label}</div>
                  <div style={{ fontSize: 12, color: NB.ink, marginTop: 2 }}>{formatTime(workoutStart)} – {formatTime(workoutEnd)}</div>
                </div>
              </div>
            ) : assigned ? (
              <div style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={iconBoxStyle(NB.white)}><StrengthArmIcon size={22} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: NB.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(assigned.label || 'Workout').replace(/^Day \d+ — /, '')}</div>
                  <span style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 700, color: NB.ink, marginTop: 4, background: NB.yellow, display: 'inline-block', padding: '2px 8px', borderRadius: 6, border: `1px solid ${NB.ink}` }}>PLANNED</span>
                </div>
              </div>
            ) : null}

            {mealsForDay.map((meal, i) => (
              <div key={meal.id || i} style={{ ...nbCardStyle(NB.cream, 3), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={iconBoxStyle(NB.white)}><MealTypeIcon type={meal.meal_type} size={26} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: NB.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meal.name}</div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{formatTime(new Date(meal.logged_at))}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tasks — today only */}
        {isToday && todaysQuests.length > 0 && (
          <>
            <div style={{ marginTop: 22, marginBottom: 10, fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>Tasks</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {todaysQuests.map(quest => {
                const done = completedToday.includes(quest.id)
                const claimed = claimedToday.includes(quest.id)
                const readyToClaim = done && !claimed
                const target = QUEST_TARGET_SCREEN[quest.id]
                const goToTarget = !done && target ? () => onNavigate(target) : undefined
                return (
                  <div
                    key={quest.id}
                    onClick={goToTarget}
                    style={{ ...nbCardStyle(claimed ? NB.green : NB_CARD_NEUTRAL, 3, claimed ? undefined : NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '14px 16px', cursor: goToTarget ? 'pointer' : 'default' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={iconBoxStyle(NB.white)}>{renderIcon(quest.icon, 19)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: NB.ink, textDecoration: claimed ? 'line-through' : 'none' }}>{quest.label}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                          <GemIcon size={11} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: NB.ink }}>+{quest.reward} gems</span>
                        </div>
                      </div>
                      {claimed ? (
                        <div style={{ width: 34, height: 34, borderRadius: 10, border: `2px solid ${NB.ink}`, background: NB.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
                        </div>
                      ) : readyToClaim ? (
                        <button onClick={(e) => { e.stopPropagation(); onClaimQuest?.(quest.id) }} style={{ height: 34, padding: '0 12px', border: `2px solid ${NB.ink}`, borderRadius: 10, background: NB.yellow, color: NB.ink, fontWeight: 800, fontSize: 11, textTransform: 'uppercase', cursor: 'pointer', boxShadow: hardShadow(2), flexShrink: 0 }}>
                          Claim
                        </button>
                      ) : (
                        <div style={{ width: 34, height: 34, borderRadius: 10, border: `2px solid ${NB.ink}`, background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {goToTarget && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9,18 15,12 9,6"/></svg>}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Quick actions FAB — today only */}
      {isToday && (
        <button
          onClick={() => setShowQuickActions(true)}
          style={{ position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 18, border: NB_BORDER, background: NB.magenta, boxShadow: hardShadow(4), display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 50 }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={NB.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      )}

      <BottomSheet open={showQuickActions} onClose={() => setShowQuickActions(false)} title="Quick Actions">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => { setShowQuickActions(false); onNavigate('workout') }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: `2px solid ${NB.ink}`, borderRadius: 14, background: NB.teal, cursor: 'pointer', textAlign: 'left' }}
          >
            <WeightlifterIcon size={22} />
            <span style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase', color: NB.ink }}>Start Today's Workout</span>
          </button>
          <button
            onClick={() => { setShowQuickActions(false); onNavigate('meals') }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: `2px solid ${NB.ink}`, borderRadius: 14, background: NB.cream, cursor: 'pointer', textAlign: 'left' }}
          >
            <MealPlateIcon size={22} />
            <span style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase', color: NB.ink }}>Log a Meal</span>
          </button>
        </div>
      </BottomSheet>
    </>
  )
}
