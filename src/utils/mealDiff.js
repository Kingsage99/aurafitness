// Exact-string-match set diff between two string arrays (old vs new
// ingredients/instructions). LLM rewording (e.g. "120g chicken breast" ->
// "120 g chicken breast") shows as removed+added rather than unchanged --
// accepted simplification, not solved with fuzzy matching.
export function diffStringList(oldList = [], newList = []) {
  const oldSet = new Set(oldList)
  const newSet = new Set(newList)
  return {
    added: newList.filter(item => !oldSet.has(item)),
    removed: oldList.filter(item => !newSet.has(item)),
  }
}

export function diffMeal(oldMeal, newMeal) {
  return {
    ingredients: diffStringList(oldMeal?.ingredients, newMeal?.ingredients),
    instructions: diffStringList(oldMeal?.instructions, newMeal?.instructions),
  }
}
