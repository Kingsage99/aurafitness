import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const exercises = JSON.parse(
  readFileSync(path.join(__dirname, '../src/data/exercises.json'), 'utf-8')
);

const VARIANT_LABEL = {
  none: 'Bodyweight',
  dumbbells: 'Dumbbells',
  bands: 'Resistance Band',
  gym: 'Gym',
};

// Natural-language phrase used inline in the prompt prose for each equipment tag.
const EQUIPMENT_PHRASE = {
  none: 'no equipment — bodyweight only',
  dumbbells: 'a pair of dumbbells',
  bands: 'a resistance band',
};

// "gym" only produces its own variant when no dumbbells/bands variant already
// covers it (see getVariantTags) — these are the handful of bodyweight
// exercises that also have a genuine gym-apparatus version. The exercise name
// alone doesn't convey what that apparatus is, so it's spelled out here.
const GYM_EQUIPMENT_PHRASE = {
  'tricep-dip': 'a dip station or parallel bars',
  'close-grip-push-up': 'a raised bar or bench for hand elevation',
  'copenhagen-plank': 'a gym bench for foot support',
  'nordic-hamstring-curl': 'a nordic curl machine or anchored pad',
};

// Which equipment tags get their own prompt for this exercise. "gym" is
// dropped whenever dumbbells or bands is also present, since against a plain
// white background a dumbbell/band movement looks identical whether it
// happens at home or in a gym — a separate "gym" image would just duplicate
// the dumbbells/bands one.
function getVariantTags(equipment) {
  const tags = [];
  if (equipment.includes('none')) tags.push('none');
  if (equipment.includes('dumbbells')) tags.push('dumbbells');
  if (equipment.includes('bands')) tags.push('bands');
  if (equipment.includes('gym') && !equipment.includes('dumbbells') && !equipment.includes('bands')) {
    tags.push('gym');
  }
  return tags;
}

function buildPrompt(name, exerciseId, tag, isMultiVariant) {
  if (!isMultiVariant) {
    // Single unambiguous equipment type — the exercise name already conveys
    // it (e.g. "Barbell Squat", "Banded Good Morning"), so no extra
    // equipment line is needed.
    return `Exercise: ${name}

Use the provided character reference as the exact source for the character's appearance. Preserve the same face, body proportions, clothing, colours, and art style.

Create two frames showing the ${name}.

Frame 1 (left): Starting position of the exercise.
Frame 2 (right): Ending position of the exercise.

The exercise form must be anatomically correct and match the standard technique for the ${name}.

Background: Pure white (#FFFFFF).
No text, labels, arrows, logos, borders or watermarks.
Output only the two frames.`;
  }

  const equipmentPhrase = tag === 'gym' ? GYM_EQUIPMENT_PHRASE[exerciseId] : EQUIPMENT_PHRASE[tag];
  const label = VARIANT_LABEL[tag];

  return `Exercise: ${name} — ${label}

Use the provided character reference as the exact source for the character's appearance. Preserve the same face, body proportions, clothing, colours, and art style.

Equipment for this variant: ${equipmentPhrase}.

Create two frames showing the ${name}, performed with ${equipmentPhrase}.

Frame 1 (left): Starting position of the exercise.
Frame 2 (right): Ending position of the exercise.

The exercise form must be anatomically correct and match the standard technique for the ${name} when performed with ${equipmentPhrase}.

Background: Pure white (#FFFFFF).
No text, labels, arrows, logos, borders or watermarks.
Output only the two frames.`;
}

const output = [];

for (const e of exercises) {
  const variantTags = getVariantTags(e.equipment);
  const isMultiVariant = variantTags.length > 1;

  for (const tag of variantTags) {
    const id = isMultiVariant ? `${e.id}--${tag}` : e.id;
    output.push({
      id,
      name: e.name,
      variant: isMultiVariant ? VARIANT_LABEL[tag] : null,
      filename: `${id}.png`,
      prompt: buildPrompt(e.name, e.id, tag, isMultiVariant),
    });
  }
}

const outPath = path.join(__dirname, 'exercise-image-prompts.json');
writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');

console.log(`Generated ${output.length} prompts (from ${exercises.length} exercises) -> scripts/exercise-image-prompts.json`);
