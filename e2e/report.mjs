// Compiles all sections' screenshots + findings into e2e/AUDIT_REPORT.md.
// Capture-only: this writes the structure and known facts; the actual visual
// UX judgment is a separate follow-up pass reading the compiled report.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const SECTIONS = [
  { id: 'workout', title: 'Workout', account: 'e2e-workout@aura.audit' },
  { id: 'meals', title: 'Meals', account: 'e2e-meals@aura.audit' },
  { id: 'profile', title: 'Profile & Social', account: 'e2e-profile@aura.audit' },
  { id: 'onboarding', title: 'Onboarding', account: 'e2e-onboarding@aura.audit' },
]

function loadFindings(sectionId) {
  const p = path.resolve(`e2e/findings/${sectionId}.json`)
  if (!existsSync(p)) return []
  return JSON.parse(readFileSync(p, 'utf-8'))
}

function loadScreenshots(sectionId) {
  const dir = path.resolve(`e2e/screenshots/${sectionId}`)
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter(f => f.endsWith('.png')).sort()
}

// Derives the screen name a screenshot belongs to from its filename
// (e.g. "03-workoutDetail.png" -> "workoutDetail") to match it against findings.
function screenFromFilename(file) {
  return file.replace(/^\d+-/, '').replace(/\.png$/, '')
}

export async function buildReport() {
  const lines = []
  lines.push('# Aura Fitness — Playwright UX Audit Report')
  lines.push('')
  lines.push(`Run date: ${new Date().toISOString()}`)
  lines.push('Dev server: http://localhost:5173')
  lines.push('')
  lines.push('| Section | Seed account |')
  lines.push('|---|---|')
  SECTIONS.forEach(s => lines.push(`| ${s.title} | \`${s.account}\` |`))
  lines.push('')
  lines.push('> Capture-only report: screenshots + console/pageerror findings are automated. The "UX notes" line under each screenshot is a placeholder for the follow-up visual review pass.')
  lines.push('')

  for (const section of SECTIONS) {
    lines.push(`## ${section.title}`)
    lines.push('')
    const findings = loadFindings(section.id)
    const screenshots = loadScreenshots(section.id)

    if (screenshots.length === 0) {
      lines.push('_No screenshots captured — section may have failed early. Check console output._')
      lines.push('')
      continue
    }

    for (const file of screenshots) {
      const screen = screenFromFilename(file)
      lines.push(`### ${section.title} ▸ ${file.replace('.png', '')}`)
      lines.push(`![](screenshots/${section.id}/${file})`)
      const screenFindings = findings.filter(f => f.screen === screen)
      if (screenFindings.length === 0) {
        lines.push('**Console/errors:** none')
      } else {
        lines.push('**Console/errors:**')
        screenFindings.forEach(f => lines.push(`- [${f.level}] ${f.message}`))
      }
      lines.push('**UX notes:** _(fill in during review pass)_')
      lines.push('')
    }

    const untagged = findings.filter(f => !screenshots.some(s => screenFromFilename(s) === f.screen))
    if (untagged.length > 0) {
      lines.push('**Other findings for this section (not tied to a specific screenshot):**')
      untagged.forEach(f => lines.push(`- [${f.screen}] [${f.level}] ${f.message}`))
      lines.push('')
    }
  }

  writeFileSync(path.resolve('e2e/AUDIT_REPORT.md'), lines.join('\n'))
}

// Allow running standalone: `node e2e/report.mjs` to rebuild the report from
// existing screenshots/findings without re-running the audit.
if (import.meta.url === `file://${process.argv[1]}`) {
  await buildReport()
  console.log('Report written to e2e/AUDIT_REPORT.md')
}
