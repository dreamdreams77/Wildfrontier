// Herd and pride social life: every pair of residents of the same species has a bond (-100 rivals .. +100 inseparable),
// every animal has a rank in its group, and the group has a leader and a harmony score. Bonds drift each day with
// personality, stress, crowding and shared enrichment. Close friends calm each other; rivals fight and get hurt;
// losing a bonded companion causes grief. Pure logic, saved in its own `social` block.

const clamp = (n, a = 0, b = 100) => Math.max(a, Math.min(b, n));
const keyOf = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
export const FRIEND = 50, RIVAL = -40;

export function createSocial(sanct, mgmt, { rng = Math.random } = {}) {
  const state = { bonds: {}, rank: {}, separated: {}, sessions: {}, known: [], emotes: [], log: [] };
  const residents = () => sanct.residents();
  const groupOf = kind => residents().filter(a => a.kind === kind);
  const day = () => sanct.state.day;
  const say = t => sanct.say(t);
  const log = t => { state.log.unshift({ day: day(), text: t }); if (state.log.length > 14) state.log.pop(); say(t); };
  const emote = (id, icon) => { state.emotes.push({ id, icon }); if (state.emotes.length > 20) state.emotes.shift(); };

  function bond(a, b) {
    const k = keyOf(a, b);
    if (state.bonds[k] === undefined) {
      // founders start on friendly terms; anyone new is a stranger
      const A = residents().find(x => x.id === a), B = residents().find(x => x.id === b);
      const strangers = (A && A.condition && /arrival|settling/i.test(A.condition)) || (B && B.condition && /arrival|settling/i.test(B.condition));
      const kin = A && B && (A.parents || []).concat(B.parents || []).some(p => p === A.name || p === B.name || (A.parents || []).includes(p) && (B.parents || []).includes(p));
      state.bonds[k] = strangers ? -15 : kin ? 45 : 18 + Math.round(rng() * 14);
    }
    return state.bonds[k];
  }
  const setBond = (a, b, v) => { state.bonds[keyOf(a, b)] = clamp(v, -100, 100); };
  const isSeparated = id => (state.separated[id] || 0) > day();
  function rankOf(a) { if (state.rank[a.id] === undefined) state.rank[a.id] = Math.round(30 + (a.traits ? a.traits.bold : .5) * 50 + rng() * 10); return state.rank[a.id]; }
  function leader(kind) { const g = groupOf(kind).filter(a => !a.young); return g.sort((x, y) => rankOf(y) - rankOf(x))[0] || null; }
  function harmony(kind) {
    const g = groupOf(kind); if (g.length < 2) return null;
    let n = 0, sum = 0; for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) { sum += bond(g[i].id, g[j].id); n++; }
    return Math.round((sum / n + 100) / 2);
  }
  function friendsOf(id) { const a = residents().find(x => x.id === id); if (!a) return []; return groupOf(a.kind).filter(b => b.id !== id && bond(id, b.id) >= FRIEND); }
  function rivalsOf(id) { const a = residents().find(x => x.id === id); if (!a) return []; return groupOf(a.kind).filter(b => b.id !== id && bond(id, b.id) <= RIVAL); }

  // continuous: friends calm each other, separated animals get lonely
  function tick(d) {
    for (const a of residents()) {
      if (isSeparated(a.id)) { a.social = clamp((a.social ?? 60) - .01 * d); a.stress = clamp(a.stress + .002 * d); continue; }
      const f = friendsOf(a.id).filter(b => !isSeparated(b.id)).length;
      if (f) { a.stress = clamp(a.stress - .003 * d * Math.min(2, f)); a.social = clamp((a.social ?? 60) + .004 * d); }
    }
  }

  // daily: bonds drift, ranks settle, rivals may fight, missing companions are grieved
  function dayTick() {
    const ids = new Set(residents().map(a => a.id));
    for (const gone of state.known.filter(id => !ids.has(id))) {
      for (const [k, v] of Object.entries(state.bonds)) {
        if (!k.split('|').includes(gone) || v < FRIEND) continue;
        const other = residents().find(a => a.id === k.split('|').find(x => x !== gone));
        if (other) { other.stress = clamp(other.stress + 18); other.social = clamp((other.social ?? 60) - 25); sanct.addHistory(other.id, 'Grieving a close companion.'); log(other.name + ' is grieving a close companion who has left.'); emote(other.id, '💧'); }
      }
      for (const k of Object.keys(state.bonds)) if (k.split('|').includes(gone)) delete state.bonds[k];
      delete state.rank[gone]; delete state.separated[gone];
    }
    state.known = [...ids];
    const kinds = [...new Set(residents().map(a => a.kind))];
    for (const kind of kinds) {
      const g = groupOf(kind), cap = sanct.SPECIES[kind] ? sanct.SPECIES[kind].capacity : 99, crowded = g.length > cap;
      const boost = state.sessions[kind] && state.sessions[kind].until > day() ? 4 : 0;
      for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
        const A = g[i], B = g[j]; if (isSeparated(A.id) || isSeparated(B.id)) continue;
        const ta = A.traits || {}, tb = B.traits || {};
        let delta = ((ta.social ?? .5) + (tb.social ?? .5)) * 1.6 - 1.1 + ((ta.calm ?? .5) + (tb.calm ?? .5) - 1) * 1.6;
        delta -= Math.max(0, (A.stress + B.stress) / 2 - 45) * .07;
        if (crowded) delta -= 1.6;
        if ((ta.bold ?? .5) > .62 && (tb.bold ?? .5) > .62 && A.sex === B.sex && !A.young && !B.young) delta -= 1.4;   // two bold same-sex adults clash
        delta += boost + (rng() - .5) * 2;
        setBond(A.id, B.id, bond(A.id, B.id) + delta);
      }
      for (const a of g) state.rank[a.id] = clamp(rankOf(a) + ((a.traits ? a.traits.bold : .5) * 100 - rankOf(a)) * .05 + (a.health - 70) * .02 + (rng() - .5) * 2);
      // fights between rivals
      for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
        const A = g[i], B = g[j], b = bond(A.id, B.id); if (b > RIVAL || isSeparated(A.id) || isSeparated(B.id)) continue;
        if (rng() < .22 * Math.min(1, (RIVAL - b) / 50 + .3)) {
          const loser = rankOf(A) < rankOf(B) ? A : B, winner = loser === A ? B : A;
          A.stress = clamp(A.stress + 14); B.stress = clamp(B.stress + 14); loser.health = clamp(loser.health - 8);
          state.rank[winner.id] = clamp(rankOf(winner) + 4); state.rank[loser.id] = clamp(rankOf(loser) - 4);
          if (mgmt && !mgmt.caseOf(loser.id) && rng() < .5) mgmt.start(loser, 'injury', 'fight with ' + winner.name);
          sanct.addHistory(loser.id, 'Lost a fight with ' + winner.name + '.'); sanct.addHistory(winner.id, 'Fought with ' + loser.name + '.');
          log('⚡ ' + winner.name + ' and ' + loser.name + ' fought. ' + loser.name + ' came off worse.'); emote(winner.id, '⚡'); emote(loser.id, '⚡');
          setBond(A.id, B.id, b - 4);
        }
      }
      // new friendships are worth a note
      for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
        const k = keyOf(g[i].id, g[j].id), b = state.bonds[k];
        if (b >= FRIEND && !(state.friendNoted || (state.friendNoted = {}))[k]) { state.friendNoted[k] = true; log('💛 ' + g[i].name + ' and ' + g[j].name + ' have become close companions.'); emote(g[i].id, '❤'); emote(g[j].id, '❤'); }
      }
    }
  }

  // ---- player actions ------------------------------------------------------------------------------------
  function groupSession(kind) {
    const g = groupOf(kind); if (g.length < 2) return { ok: false, message: 'Group sessions need at least two animals.' };
    if (state.sessions[kind] && state.sessions[kind].day === day()) return { ok: false, message: 'Already ran a session for this group today.' };
    if (!sanct.spend(60, 'enrichment')) return { ok: false, message: 'A group enrichment session costs 60.' };
    state.sessions[kind] = { day: day(), until: day() + 3 };
    for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) if (!isSeparated(g[i].id) && !isSeparated(g[j].id)) setBond(g[i].id, g[j].id, bond(g[i].id, g[j].id) + 8);
    for (const a of g) { a.boredom = clamp((a.boredom ?? 40) - 12); emote(a.id, '✨'); }
    return { ok: true, message: 'Group session: scatter feeds and shared puzzles. Bonds improve over the next few days.' };
  }
  function separate(id, days = 3) {
    const a = residents().find(x => x.id === id); if (!a) return { ok: false, message: 'No such resident.' };
    state.separated[id] = day() + days; sanct.addHistory(id, 'Kept apart from the group for a few days.');
    return { ok: true, message: a.name + ' will be kept apart for ' + days + ' days. No fights, but it will feel lonely.' };
  }
  function reunite(id) { if (!isSeparated(id)) return { ok: false, message: 'Not separated.' }; delete state.separated[id]; return { ok: true, message: 'Back with the group.' }; }
  const takeEmotes = () => state.emotes.splice(0);

  function groups() {
    return [...new Set(residents().map(a => a.kind))].map(kind => {
      const g = groupOf(kind), pairs = [];
      for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) pairs.push({ a: g[i].id, b: g[j].id, an: g[i].name, bn: g[j].name, bond: Math.round(bond(g[i].id, g[j].id)) });
      const L = leader(kind);
      return { kind, members: g.map(a => ({ id: a.id, name: a.name, rank: Math.round(rankOf(a)), separated: isSeparated(a.id), friends: friendsOf(a.id).length, rivals: rivalsOf(a.id).length })), leader: L ? L.name : null, harmony: harmony(kind), pairs: pairs.sort((x, y) => x.bond - y.bond) };
    });
  }
  sanct.mods.pairBond = (a, b) => bond(a, b);
  function serialize() { return JSON.parse(JSON.stringify({ ...state, emotes: [] })); }
  function restore(d) {
    const obj = v => v && typeof v === 'object' && !Array.isArray(v); if (!obj(d)) return;
    const nums = o => Object.fromEntries(Object.entries(obj(o) ? o : {}).filter(([, v]) => Number.isFinite(v)));
    state.bonds = nums(d.bonds); for (const k in state.bonds) state.bonds[k] = clamp(state.bonds[k], -100, 100);
    state.rank = nums(d.rank); state.separated = nums(d.separated);
    state.sessions = obj(d.sessions) ? d.sessions : {}; state.known = Array.isArray(d.known) ? d.known.filter(x => typeof x === 'string') : [];
    state.log = (Array.isArray(d.log) ? d.log : []).filter(obj).slice(0, 14); state.friendNoted = obj(d.friendNoted) ? d.friendNoted : {};
  }
  sanct.extend({ key: 'social', tick, day: dayTick, summary: () => ({}), serialize, restore });
  return { state, bond, setBond, rankOf, leader, harmony, friendsOf, rivalsOf, groupSession, separate, reunite, isSeparated, groups, takeEmotes, dayTick };
}
