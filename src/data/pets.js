// Pet catalog — each pet is a static PNG in public/characters/ plus one entry
// here. A pet with image: null is a teaser slot: shown in the store as a
// locked mystery card, not purchasable until its artwork lands.
export const PETS = [
  // video: tiny VP9-alpha webm for real browsers; animation: animated WebP
  // fallback for webviews/older Safari that can't play transparent video
  { id: 'pet_greycube', label: 'Cube',         cost: 0,    image: '/characters/default-greycube.png', video: '/characters/greycube-idle.webm', animation: '/characters/greycube-idle.webp', desc: 'Common · everyone starts with one' },
  { id: 'pet_panda',    label: 'Cube Panda',   cost: 300,  image: '/characters/default-panda.png',    video: '/characters/panda-idle.webm',    animation: '/characters/panda-idle.webp',    desc: 'Common · loyal companion' },
  { id: 'pet_kitten',   label: 'Cube Cat',     cost: 400,  image: '/characters/default-cat.png',      video: '/characters/cat-idle.webm',      animation: '/characters/cat-idle.webp',      desc: 'Common · prowling companion' },
  // aspect: fox's tail sweeps wider than the other pets' animations, so its
  // art is a wider (non-square) canvas at the same zoom level as everyone
  // else — the display box widens to match instead of cropping the tail.
  { id: 'pet_fox',      label: 'Cube Fox',     cost: 600,  image: '/characters/default-fox.png',      video: '/characters/fox-idle.webm',      animation: '/characters/fox-idle.webp',      desc: 'Common · sneaky companion', aspect: 806 / 512 },
  { id: 'pet_bunny',    label: 'Cube Bunny',   cost: 400,  image: null, desc: 'Hopping in soon' },
  { id: 'pet_axolotl',  label: 'Cube Axolotl', cost: 800,  image: null, desc: 'Swimming in soon' },
  // legendary: free to equip for MissVfit Pro subscribers — everyone else can
  // still unlock them the normal way, by saving up gems.
  { id: 'pet_dragon',   label: 'Cube Dragon',  cost: 1200, image: '/characters/default-dragon.png',   video: '/characters/dragon-idle.webm',   animation: '/characters/dragon-idle.webp',   desc: 'Legendary · fierce companion', legendary: true },
  { id: 'pet_unicorn',  label: 'Cube Unicorn', cost: 1200, image: '/characters/default-unicorn.png',  video: '/characters/unicorn-idle.webm',  animation: '/characters/unicorn-idle.webp',  desc: 'Legendary · magical companion', legendary: true },
]

// Active pet for a gamification state — falls back to the default grey cube if
// the equipped pet is unknown or its art hasn't shipped yet.
export function getActivePet(g) {
  const pet = PETS.find(p => p.id === g?.activePet)
  return pet?.image ? pet : PETS[0]
}
