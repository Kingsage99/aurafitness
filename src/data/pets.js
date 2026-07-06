// Pet catalog — each pet is a static PNG in public/characters/ plus one entry
// here. A pet with image: null is a teaser slot: shown in the store as a
// locked mystery card, not purchasable until its artwork lands.
export const PETS = [
  { id: 'pet_panda',   label: 'Cube Panda',   cost: 0,    image: '/characters/default-panda.png', desc: 'Your loyal starter companion' },
  { id: 'pet_bunny',   label: 'Cube Bunny',   cost: 400,  image: null, desc: 'Hopping in soon' },
  { id: 'pet_kitten',  label: 'Cube Kitten',  cost: 400,  image: null, desc: 'Prowling in soon' },
  { id: 'pet_fox',     label: 'Cube Fox',     cost: 600,  image: null, desc: 'Sneaking in soon' },
  { id: 'pet_axolotl', label: 'Cube Axolotl', cost: 800,  image: null, desc: 'Swimming in soon' },
  { id: 'pet_unicorn', label: 'Cube Unicorn', cost: 1200, image: null, desc: 'Galloping in soon' },
]

// Active pet for a gamification state — falls back to the starter panda if the
// equipped pet is unknown or its art hasn't shipped yet.
export function getActivePet(g) {
  const pet = PETS.find(p => p.id === g?.activePet)
  return pet?.image ? pet : PETS[0]
}
