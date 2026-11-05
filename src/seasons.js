// Seasons that matter. The woodland simulation already cycles Spring → Summer → Autumn → Winter (five days each);
// here each season changes the sanctuary's economy and the land: rains in spring, a hard dry season in summer when
// water and browse run short, the great migration passing the fence in autumn, and a cool, quiet winter.
export const SEASON_EFFECTS = {
  Spring: { label: 'Long rains', icon: '🌧️', water: .7, prices: { hay: .85, browse: .85 }, note: 'Waterholes fill on their own and grazing is cheap.' },
  Summer: { label: 'Dry season', icon: '🌵', water: 1.6, prices: { hay: 1.3, browse: 1.35 }, note: 'Water drains fast and hay and browse cost more. Plan ahead.' },
  Autumn: { label: 'Migration', icon: '🦓', water: 1.1, prices: {}, migration: true, note: 'Wild herds pass along the north fence. Visitors come to see them.' },
  Winter: { label: 'Cool season', icon: '🍂', water: .9, prices: { produce: 1.2 }, note: 'Cooler days calm the animals; fresh produce is scarce.' },
};

export function createSeasons(sanct, sim) {
  const now = () => SEASON_EFFECTS[sim.season] || SEASON_EFFECTS.Spring;
  sanct.mods.priceMul = food => now().prices[food] || 1;
  sanct.mods.waterDrain = () => now().water;
  function tick(d) {
    const s = sim.season;
    if (s === 'Winter') for (const a of sanct.residents()) a.stress = Math.max(0, a.stress - .002 * d);
  }
  function day() {
    if (now().migration && sanct.state.day % 2 === 0) { sanct.state.reputation += 1; sanct.say('🦓 The migration passed the fence today. Visitors loved it (reputation +1).'); }
  }
  sanct.extend({ key: 'seasons', tick, day, summary: () => ({}) });
  return { info: () => ({ season: sim.season, ...now() }), migrating: () => !!now().migration };
}
