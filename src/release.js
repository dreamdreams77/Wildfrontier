// Reintroduction programme: the end goal of a conservation sanctuary is to put animals back in the wild.
// An animal is prepared in a soft-release pen (less human contact, more wild-skill practice), then released with a
// tracking collar. Its readiness decides how likely it is to survive the first ten days; success earns credits and
// reputation, a loss costs reputation. Pure logic; saved in its own `release` block.

const clamp = (n, a = 0, b = 100) => Math.max(a, Math.min(b, n));
export const PREP_DAYS = 5;
export const TRACK_DAYS = 10;
export const MIN_READINESS = 60;

export function createRelease(sanct, ops, mgmt, { rng = Math.random } = {}) {
  const state = { prep: {}, released: [], stats: { released: 0, established: 0, lost: 0 } };
  const residents = () => sanct.residents();
  const byId = id => residents().find(a => a.id === id);
  const hasPen = () => ops.state.items.some(i => i.type === 'releasePen' && (i.cond ?? 100) >= 25);
  const say = t => sanct.say(t);

  function readiness(a) {
    const health = clamp(a.health), fitness = clamp(((a.energy ?? 70) + clamp(100 - Math.abs((a.nutrition ?? 70) - 75) * 2)) / 2);
    const wariness = clamp(100 - (a.trust ?? 20)), skill = clamp(a.wildSkill ?? 15);
    return { score: Math.round(health * .25 + fitness * .2 + wariness * .25 + skill * .3), health: Math.round(health), fitness: Math.round(fitness), wariness: Math.round(wariness), skill: Math.round(skill) };
  }
  // why an animal cannot go back yet (empty list = eligible to start preparing)
  function blockers(a) {
    const out = []; const sp = sanct.SPECIES[a.kind];
    if (!sp) return ['Not a sanctuary species.'];
    if (a.young) out.push('Still young.');
    if (a.pregnant) out.push('Expecting young.');
    if (mgmt && mgmt.caseOf(a.id)) out.push('Currently unwell.');
    const same = residents().filter(x => x.kind === a.kind && x.id !== a.id && !x.young && !state.prep[x.id]);
    if (!same.some(x => x.sex === 'male') || !same.some(x => x.sex === 'female')) out.push('The breeding group needs at least one other adult male and female.');
    return out;
  }
  function prepare(id) {
    const a = byId(id); if (!a) return { ok: false, message: 'No such resident.' };
    if (state.prep[id]) return { ok: false, message: a.name + ' is already preparing.' };
    if (!hasPen()) return { ok: false, message: 'Build a soft-release pen first (Build mode).' };
    const b = blockers(a); if (b.length) return { ok: false, message: a.name + ' cannot be prepared: ' + b.join(' ') };
    state.prep[id] = { start: sanct.state.day, days: 0 };
    sanct.addHistory(id, 'Moved to the soft-release pen to prepare for the wild.');
    return { ok: true, message: a.name + ' moved to the soft-release pen. Keep human contact low for ' + PREP_DAYS + ' days.' };
  }
  function cancel(id) { if (!state.prep[id]) return { ok: false, message: 'Not preparing.' }; delete state.prep[id]; return { ok: true, message: 'Returned to the main habitat.' }; }
  function release(id) {
    const a = byId(id); if (!a) return { ok: false, message: 'No such resident.' };
    const p = state.prep[id]; if (!p) return { ok: false, message: a.name + ' has not been prepared in the soft-release pen.' };
    if (p.days < PREP_DAYS) return { ok: false, message: a.name + ' needs ' + (PREP_DAYS - p.days) + ' more day' + (PREP_DAYS - p.days === 1 ? '' : 's') + ' in the pen.' };
    const r = readiness(a); if (r.score < MIN_READINESS) return { ok: false, message: a.name + ' is not ready (readiness ' + r.score + '%, needs ' + MIN_READINESS + '%).' };
    delete state.prep[id];
    const i = sanct.sim.animals.indexOf(a); if (i >= 0) sanct.sim.animals.splice(i, 1);
    state.released.unshift({ id: a.id, name: a.name, kind: a.kind, day: sanct.state.day, readiness: r.score, status: 'tracking', daysTracked: 0, reports: [] });
    if (state.released.length > 20) state.released.pop();
    state.stats.released++;
    say(a.name + ' was released into the wild with a tracking collar (readiness ' + r.score + '%).');
    return { ok: true, message: a.name + ' is back in the wild! Follow the tracking reports over the next ' + TRACK_DAYS + ' days.', removedId: a.id };
  }
  const REPORTS = ['Found water on the first night.', 'Joined a wild group.', 'Hunted / foraged successfully.', 'Moved into new territory.', 'Avoided a vehicle track.', 'Collar shows a healthy daily range.'];
  function day() {
    // preparation: wild skills grow, trust in people fades, a little stress from the change
    for (const [id, p] of Object.entries(state.prep)) {
      const a = byId(id); if (!a) { delete state.prep[id]; continue; }
      p.days++;
      const enriched = (a.boredom ?? 50) < 45;
      a.wildSkill = clamp((a.wildSkill ?? 15) + 9 + (enriched ? 5 : 0));
      a.trust = clamp((a.trust ?? 20) - 7);
      a.stress = clamp(a.stress + 3);
      if (p.days === PREP_DAYS) say(a.name + ' has finished preparing and can be released (readiness ' + readiness(a).score + '%).');
    }
    // tracking the released animals
    for (const r of state.released) {
      if (r.status !== 'tracking') continue;
      r.daysTracked++;
      const risk = (1 - r.readiness / 100) * .07;
      if (rng() < risk) { r.status = 'lost'; state.stats.lost++; sanct.state.reputation = Math.max(0, sanct.state.reputation - 3); r.reports.unshift('Day ' + r.daysTracked + ': the collar signal stopped. ' + r.name + ' did not make it.'); say('Tracking report: we lost ' + r.name + ' in the wild.'); continue; }
      if (r.daysTracked % 3 === 1) r.reports.unshift('Day ' + r.daysTracked + ': ' + REPORTS[Math.floor(rng() * REPORTS.length)]);
      if (r.daysTracked >= TRACK_DAYS) { r.status = 'established'; state.stats.established++; sanct.state.credits += 8; sanct.state.reputation += 8; r.reports.unshift(r.name + ' is established in the wild.'); say(r.name + ' is established in the wild! Credits +8, reputation +8.'); }
      if (r.reports.length > 6) r.reports.length = 6;
    }
  }
  function summary() {
    const list = residents().filter(a => !a.young).map(a => ({ id: a.id, name: a.name, kind: a.kind, sex: a.sex, readiness: readiness(a), blockers: blockers(a), prep: state.prep[a.id] ? { ...state.prep[a.id] } : null }));
    return { hasPen: hasPen(), candidates: list, released: state.released.map(r => ({ ...r, reports: r.reports.slice() })), stats: { ...state.stats } };
  }
  function serialize() { return JSON.parse(JSON.stringify(state)); }
  function restore(d) {
    const obj = v => v && typeof v === 'object' && !Array.isArray(v); if (!obj(d)) return;
    state.prep = {}; if (obj(d.prep)) for (const [k, v] of Object.entries(d.prep)) if (obj(v) && Number.isFinite(v.days)) state.prep[k] = { start: v.start, days: v.days };
    state.released = (Array.isArray(d.released) ? d.released : []).filter(r => obj(r) && typeof r.name === 'string' && Number.isFinite(r.readiness)).map(r => ({ ...r, reports: Array.isArray(r.reports) ? r.reports.filter(x => typeof x === 'string') : [] }));
    state.stats = { released: 0, established: 0, lost: 0, ...(obj(d.stats) ? d.stats : {}) };
  }
  sanct.extend({ key: 'release', day, summary: () => ({}), serialize, restore });
  return { state, readiness, blockers, prepare, cancel, release, summary, hasPen };
}
