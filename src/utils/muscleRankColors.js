// MissVfit Pro's "rank map" perk — shared by the Muscle Map screen and the
// post-workout "Muscles Worked" recap, so both color a body diagram by rank
// tier the same way instead of each re-deriving the group/tag mapping.
import { MUSCLE_SVG_IDS, RANK_FILL } from '../components/MuscleSVG'
import { GROUP_LABELS, groupOf } from './muscleGroups'
import { MUSCLE_GROUPS as RANK_MUSCLE_TAGS } from './muscleLabels'
import { RANKS, getMuscleRankInfo } from './gamification'

// Which raw (rank-tracked) muscle tags feed into each of the 8 display
// groups used by the body diagram — e.g. "legs" gets its rank from whichever
// of quads/hamstrings/inner_thighs is trained furthest.
const GROUP_TO_RANK_TAGS = RANK_MUSCLE_TAGS.reduce((map, { id }) => {
  const group = groupOf(id)
  if (group) (map[group] ||= []).push(id)
  return map
}, {})

// A group can combine several rank-tracked tags — shown at its best unlocked
// tag's tier, so training any one of them shows progress.
export function bestGroupRankInfo(gamification, groupId) {
  const tags = GROUP_TO_RANK_TAGS[groupId] || []
  let best = null
  tags.forEach(tag => {
    const info = getMuscleRankInfo(gamification, tag)
    if (info.unlocked && (!best || info.score > best.score)) best = info
  })
  return best
}

// A group's own tier — 'rookie' if it has no tracked progress yet, so every
// group always has *some* color to show (never left blank/undefined).
export function tierForGroup(gamification, groupId) {
  return bestGroupRankInfo(gamification, groupId)?.tier || RANKS[0]
}

// Every one of the 8 display groups, each at its own best (or rookie-default)
// tier at full strength — the Pro per-body-part "achievement" view. Not
// intensity-scaled: this is "what rank have you reached", not "how hard did
// you train it recently" (that's buildIntensityRankColors, below).
export function buildRankColors(gamification, side) {
  const colors = {}
  Object.keys(GROUP_LABELS).forEach(groupId => {
    const tier = tierForGroup(gamification, groupId)
    MUSCLE_SVG_IDS[groupId]?.[side]?.forEach(svgId => { colors[svgId] = RANK_FILL(tier.id) })
  })
  return colors
}

// Per-group primary-muscle exercise counts — shared counting logic for both
// the Muscle Map's weekly/monthly volume and a single session's "worked"
// muscles. `muscleToGroup` is the caller's raw-tag → group lookup (Muscle
// Map passes muscleGroups.js's groupOf, post-workout screens pass
// muscleIntensity.js's MUSCLE_TO_GROUP).
export function countsByGroup(exercises, muscleToGroup) {
  const counts = {}
  ;(exercises || []).forEach(ex => {
    ;(ex.muscles?.primary || []).forEach(m => {
      const g = typeof muscleToGroup === 'function' ? muscleToGroup(m) : muscleToGroup[m?.toLowerCase()]
      if (g) counts[g] = (counts[g] || 0) + 1
    })
  })
  return counts
}

// The actual "rank colors" feature: each trained group shown in its OWN rank
// tier's hue, shaded by how hard it's been worked — pale for light, rich/full
// for max — always with the metallic shine. Untrained groups (count 0, or
// countToLevel returns falsy) are left uncolored. `countToLevel(count)` maps
// a raw count to a 1-4 intensity level (or 0/falsy for "not enough to color").
export function buildIntensityRankColors(counts, gamification, side, countToLevel) {
  const colors = {}
  Object.entries(counts).forEach(([groupId, count]) => {
    const level = countToLevel(count)
    if (!level) return
    const tier = tierForGroup(gamification, groupId)
    MUSCLE_SVG_IDS[groupId]?.[side]?.forEach(svgId => { colors[svgId] = RANK_FILL(tier.id, level) })
  })
  return colors
}
