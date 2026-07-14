// Basic autosave for an in-progress workout — one draft slot per user, so a
// crash/refresh mid-workout (or an intentional "Save & Exit") can be resumed
// instead of losing all logged sets. Shared between WorkoutActive (writes/
// reads/clears) and WorkoutHub (peeks, to show a "Resume workout" banner).

const KEY_PREFIX = 'aura_workout_draft_'

export function readWorkoutDraft(userId) {
  if (!userId) return null
  try {
    const raw = localStorage.getItem(KEY_PREFIX + userId)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function writeWorkoutDraft(userId, draft) {
  if (!userId) return
  try {
    localStorage.setItem(KEY_PREFIX + userId, JSON.stringify({ ...draft, savedAt: Date.now() }))
  } catch {
    // Storage full/unavailable — autosave is best-effort, not critical path.
  }
}

export function clearWorkoutDraft(userId) {
  if (!userId) return
  try { localStorage.removeItem(KEY_PREFIX + userId) } catch { /* ignore */ }
}

// Does a saved draft match the workout currently loaded? Guards against
// restoring stale sets onto a different workout that happens to load into
// the same screen (same label + same exercise ids, in the same order).
export function draftMatchesWorkout(draft, exercises, label) {
  if (!draft || draft.label !== label) return false
  const draftIds = (draft.exercises || []).map(e => e.id)
  const currentIds = (exercises || []).map(e => e.id)
  if (draftIds.length === 0 || draftIds.length !== currentIds.length) return false
  return draftIds.every((id, i) => id === currentIds[i])
}
