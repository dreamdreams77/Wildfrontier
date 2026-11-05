// Sanctuary rating: five accreditation tiers with real requirements drawn from every system. Reaching a tier pays a
// one-off reward and raises the daily grant permanently.
export const TIERS = [
  { stars: 1, label: 'Registered sanctuary', reward: null, needs: [] },
  { stars: 2, label: 'Accredited sanctuary', reward: { funds: 400, credits: 6 }, needs: [['reputation', 20], ['welfare', 70], ['stories', 1]] },
  { stars: 3, label: 'Respected reserve', reward: { funds: 800, credits: 10 }, needs: [['reputation', 40], ['stories', 3], ['established', 1], ['harmony', 60]] },
  { stars: 4, label: 'Renowned reserve', reward: { funds: 1400, credits: 15 }, needs: [['reputation', 70], ['stories', 5], ['established', 3], ['visitors', 300]] },
  { stars: 5, label: 'World-class reserve', reward: { funds: 2500, credits: 25 }, needs: [['reputation', 100], ['stories', 8], ['established', 6], ['habitats', 85]] },
];
const LABEL = { reputation: 'Reputation', welfare: 'Average welfare %', stories: 'Animal stories completed', established: 'Animals established in the wild', harmony: 'Average group harmony %', visitors: 'Visitors welcomed', habitats: 'Every habitat at least %' };

export function createRating(sanct, { ops, stories, release, social } = {}) {
  const state = { tier: 1 };
  function metrics() {
    const list = sanct.residents();
    const hs = social ? social.groups().map(g => g.harmony).filter(h => h !== null) : [];
    return {
      reputation: Math.round(sanct.state.reputation),
      welfare: list.length ? Math.round(list.reduce((n, a) => n + sanct.welfareOf(a), 0) / list.length) : 0,
      stories: stories ? Object.keys(stories.state.done).length : 0,
      established: release ? release.state.stats.established : 0,
      harmony: hs.length ? Math.round(hs.reduce((a, b) => a + b, 0) / hs.length) : 0,
      visitors: ops ? ops.state.visitors.total : 0,
      habitats: sanct.mods.habitatScore ? Math.min(...Object.keys(sanct.SPECIES).map(k => sanct.mods.habitatScore(k))) : 0,
    };
  }
  const met = (t, m) => t.needs.every(([k, v]) => m[k] >= v);
  function day() {
    const m = metrics();
    while (state.tier < TIERS.length && met(TIERS[state.tier], m)) {
      const t = TIERS[state.tier]; state.tier++;
      if (t.reward) { sanct.earn(t.reward.funds, 'rating'); sanct.state.credits += t.reward.credits; }
      sanct.say('⭐ The sanctuary is now a ' + t.label + ' (' + '★'.repeat(t.stars) + '). Funds +' + t.reward.funds + ', credits +' + t.reward.credits + ', and daily grants rise.');
    }
  }
  sanct.mods.grantMul = () => 1 + (state.tier - 1) * .12;
  function summary() {
    const m = metrics(), cur = TIERS[state.tier - 1], next = TIERS[state.tier] || null;
    return { tier: state.tier, label: cur.label, stars: cur.stars, next: next && { label: next.label, stars: next.stars, reward: next.reward, needs: next.needs.map(([k, v]) => ({ key: k, label: LABEL[k], need: v, have: m[k], ok: m[k] >= v })) }, grantBonus: Math.round((state.tier - 1) * 12) };
  }
  sanct.extend({ key: 'rating', day, summary: () => ({}), serialize: () => ({ tier: state.tier }), restore: d => { if (d && Number.isFinite(d.tier)) state.tier = Math.max(1, Math.min(TIERS.length, Math.round(d.tier))); } });
  return { state, metrics, summary, check: day };
}
