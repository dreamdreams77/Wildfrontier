// Sanctuary events: things that happen to the reserve and ask the player to decide. Each event has a real cost or
// effect either way, plays out over game time, and is saved. Pure logic; main.js shows the cards and patrol markers.

const DAY = 1440;
const clamp = (n, a = 0, b = 100) => Math.max(a, Math.min(b, n));

export const EVENTS = {
  drought: {
    label: 'Drought', icon: '☀️', days: [3, 5], weight: 3,
    text: 'No rain is forecast and the waterholes are dropping fast.',
    choices: [
      { id: 'truck', label: 'Hire a water truck', cost: 180, text: 'The waterholes stay topped up for the whole drought.' },
      { id: 'ration', label: 'Ration the water', text: 'Free, but the water supply drains much faster.' },
    ],
  },
  storm: {
    label: 'Storm warning', icon: '⛈️', days: [1, 1], weight: 3,
    text: 'A storm front will cross the reserve tonight.',
    choices: [
      { id: 'secure', label: 'Secure the structures', cost: 90, text: 'Tie down roofs and shutters. Little damage.' },
      { id: 'ride', label: 'Ride it out', text: 'Free, but several structures will be battered and animals frightened.' },
    ],
  },
  heatwave: {
    label: 'Heatwave', icon: '🌡️', days: [2, 4], weight: 2,
    text: 'Temperatures will stay above 38 °C for days.',
    choices: [
      { id: 'misters', label: 'Set up misters and shade cloth', cost: 140, text: 'Animals stay cool everywhere.' },
      { id: 'shade', label: 'Rely on the shade you have', text: 'Free. Animals in habitats without enough shade overheat.' },
    ],
  },
  vip: {
    label: 'Donor visit', icon: '🎩', days: [1, 1], weight: 2, minReputation: 15,
    text: 'A major conservation donor is visiting tomorrow. They will judge welfare and cleanliness.',
    choices: [
      { id: 'spruce', label: 'Spruce up before they arrive', cost: 100, text: 'Every enclosure is cleaned and worn structures repaired.' },
      { id: 'asis', label: 'Show the sanctuary as it is', text: 'Free. They will see exactly what you have.' },
    ],
  },
  escape: {
    label: 'Escaped animal', icon: '🔦', days: [1, 1], weight: 0, minDay: 5, atNight: true,
    text: 'A gap in the fence: one of the residents slipped out of its habitat after dark.',
    choices: [
      { id: 'search', label: 'Find it with your torch', text: 'Walk to the marked spot and guide it home before dawn. It comes back calm and you earn reputation.' },
      { id: 'wait', label: 'Wait for daylight', text: 'Free, but a night out alone leaves it stressed and possibly hurt.' },
    ],
  },
  poachers: {
    label: 'Poachers sighted', icon: '🔦', days: [1, 1], weight: 2, minDay: 6, atDusk: true,
    text: 'A vehicle with no lights has been seen along the fence line.',
    choices: [
      { id: 'patrol', label: 'Patrol the fence yourself', text: 'Walk to the three marked fence posts before dawn. Rewards credits and reputation if you reach them all.' },
      { id: 'police', label: 'Call the wildlife police', cost: 120, text: 'Safe, but costs money and earns no credit.' },
    ],
  },
};
export const ESCAPE_SPOTS = [[42, -17], [46, 2], [38, 18.5], [19, 15], [44, 13]];
export const PATROL_POINTS = [[44.5, -15.5], [45.5, 9], [31, 19]];
export const PATROL_RADIUS = 2.6;

export function createEvents(sanct, ops, mgmt, { rng = Math.random } = {}) {
  const state = { active: [], history: [], serial: 0, nextRoll: 0 };
  const day = () => sanct.state.day;
  const hour = () => Math.floor((sanct.state.minutes % DAY) / 60);
  const say = t => sanct.say(t);
  const residents = () => sanct.residents();

  function start(type, { force = false } = {}) {
    const def = EVENTS[type]; if (!def) return null;
    if (state.active.some(e => e.type === type)) return null;
    const len = def.days[0] + Math.floor(rng() * (def.days[1] - def.days[0] + 1));
    const ev = { id: 'ev' + (++state.serial), type, startDay: day(), endsAt: sanct.state.minutes + len * DAY, choice: null, seen: false };
    if (type === 'escape') { const list = residents().filter(a => !a.young); const a = list[Math.floor(rng() * list.length)]; if (!a) return null; const [x, z] = ESCAPE_SPOTS[Math.floor(rng() * ESCAPE_SPOTS.length)]; ev.animalId = a.id; ev.animalName = a.name; ev.endsAt = Math.floor(sanct.state.minutes / DAY) * DAY + (hour() < 6 ? 6 * 60 : DAY + 6 * 60); ev.points = [{ id: ev.id + '-e', x, z, done: false }]; }
    if (type === 'poachers') { ev.endsAt = (Math.floor(sanct.state.minutes / DAY) + 1) * DAY + 6 * 60; ev.points = PATROL_POINTS.map(([x, z], i) => ({ id: ev.id + '-p' + i, x, z, done: false })); }
    if (type === 'storm' || type === 'vip') ev.endsAt = (Math.floor(sanct.state.minutes / DAY) + 1) * DAY + 8 * 60;
    state.active.push(ev);
    say(def.icon + ' ' + def.label + ': ' + def.text + (force ? '' : ' Decide in the Missions panel or the event card.'));
    return ev;
  }
  const byId = id => state.active.find(e => e.id === id);

  function choose(id, choiceId) {
    const ev = byId(id); if (!ev) return { ok: false, message: 'That event is over.' };
    if (ev.choice) return { ok: false, message: 'Already decided.' };
    const c = EVENTS[ev.type].choices.find(x => x.id === choiceId); if (!c) return { ok: false, message: 'Unknown choice.' };
    if (c.cost && !sanct.spend(c.cost, 'events')) return { ok: false, message: c.label + ' costs ' + c.cost + '.' };
    ev.choice = choiceId; ev.seen = true;
    if (ev.type === 'vip' && choiceId === 'spruce') {
      if (mgmt) for (const k of Object.keys(sanct.SPECIES)) mgmt.state.dirt[k] = 0;
      for (const it of ops.state.items) it.cond = Math.max(it.cond ?? 100, 85);
    }
    if (ev.type === 'drought' && choiceId === 'truck') sanct.state.waterLevel = 100;
    return { ok: true, message: EVENTS[ev.type].label + ': ' + c.label + '.' };
  }
  const choiceOf = ev => ev.choice || EVENTS[ev.type].choices[EVENTS[ev.type].choices.length - 1].id;   // undecided = the free option

  // continuous effects (d = game minutes)
  function tick(d) {
    for (const ev of state.active) {
      const ch = choiceOf(ev);
      if (ev.type === 'drought') {
        if (ch === 'truck') sanct.state.waterLevel = Math.max(sanct.state.waterLevel, 80);
        else sanct.state.waterLevel = clamp(sanct.state.waterLevel - .02 * d);
      } else if (ev.type === 'heatwave' && ch !== 'misters') {
        for (const a of residents()) {
          const shade = (sanct.mods.habitatScore ? sanct.mods.habitatScore(a.kind) : 100) / 100;
          a.stress = clamp(a.stress + .012 * d * (1 - shade * .8)); a.hydration = clamp(a.hydration - .01 * d);
        }
      }
    }
    // resolve events that ended
    for (const ev of state.active.slice()) if (sanct.state.minutes >= ev.endsAt) resolve(ev);
    // poachers are only announced at dusk
    if (sanct.state.minutes >= state.nextRoll && hour() >= 17 && hour() < 20 && !state.active.some(e => e.type === 'poachers') && day() >= EVENTS.poachers.minDay) {
      state.nextRoll = (Math.floor(sanct.state.minutes / DAY) + 1) * DAY;
      if (rng() < .12) start('poachers');
    }
    // an occasional night-time escape
    if (sanct.state.minutes >= (state.nextNight || 0) && (hour() >= 21 || hour() < 2) && !state.active.some(e => e.type === 'escape') && day() >= EVENTS.escape.minDay) {
      state.nextNight = (Math.floor(sanct.state.minutes / DAY) + 1) * DAY + 20 * 60;
      if (rng() < .1) start('escape');
    }
  }
  function resolve(ev) {
    state.active.splice(state.active.indexOf(ev), 1);
    const def = EVENTS[ev.type], ch = choiceOf(ev); let outcome = '';
    if (ev.type === 'storm') {
      const items = ops.state.items.slice(); const hits = ch === 'secure' ? 0 : Math.min(3, items.length);
      for (const it of items) it.cond = Math.max(0, (it.cond ?? 100) - (ch === 'secure' ? 4 : 0));
      for (let i = 0; i < hits; i++) { const it = items.splice(Math.floor(rng() * items.length), 1)[0]; it.cond = Math.max(0, (it.cond ?? 100) - (30 + rng() * 25)); }
      if (ch !== 'secure') for (const a of residents()) a.stress = clamp(a.stress + 12);
      outcome = ch === 'secure' ? 'The storm passed with little damage.' : 'The storm battered ' + hits + ' structure' + (hits === 1 ? '' : 's') + ' and frightened the animals.';
    } else if (ev.type === 'vip') {
      const list = residents(); const welfare = list.reduce((n, a) => n + sanct.welfareOf(a), 0) / Math.max(1, list.length);
      const dirt = mgmt ? Object.keys(sanct.SPECIES).reduce((n, k) => n + mgmt.dirtOf(k), 0) / Object.keys(sanct.SPECIES).length : 0;
      if (welfare >= 70 && dirt < 40) { const gift = 350 + Math.round((welfare - 70) * 10); sanct.earn(gift, 'donations'); sanct.state.reputation += 4; outcome = 'The donor was delighted and gave ' + gift + '.'; }
      else { sanct.state.reputation = Math.max(0, sanct.state.reputation - 3); outcome = 'The donor left unimpressed (welfare ' + Math.round(welfare) + '%, enclosures ' + (dirt >= 40 ? 'dirty' : 'clean') + ').'; }
    } else if (ev.type === 'poachers') {
      if (ch === 'police') outcome = 'The wildlife police chased the vehicle off.';
      else if (ev.points.every(p => p.done)) { sanct.state.reputation += 5; sanct.state.credits += 3; outcome = 'Your patrol deterred the poachers. Reputation +5, credits +3.'; }
      else {
        const list = residents(); const victim = list[Math.floor(rng() * list.length)];
        if (victim) { victim.health = clamp(victim.health - 25); victim.stress = clamp(victim.stress + 20); sanct.addHistory(victim.id, 'Injured during a poaching attempt.'); if (mgmt) mgmt.start(victim, 'injury'); }
        sanct.state.reputation = Math.max(0, sanct.state.reputation - 2);
        outcome = 'The fence was not fully patrolled.' + (victim ? ' ' + victim.name + ' was injured.' : '');
      }
    } else if (ev.type === 'escape') {
      const a = residents().find(x => x.id === ev.animalId);
      if (ch === 'search' && ev.points.every(p => p.done)) { if (a) { a.stress = clamp(a.stress - 5); sanct.addHistory(a.id, 'Found at night and guided home by the ranger.'); } sanct.state.reputation += 2; outcome = (ev.animalName || 'The animal') + ' was guided safely home. Reputation +2.'; }
      else { if (a) { a.stress = clamp(a.stress + 22); a.health = clamp(a.health - 6); sanct.addHistory(a.id, 'Spent a frightening night outside the habitat.'); } outcome = (ev.animalName || 'The animal') + ' spent a frightening night outside and came back shaken.'; }
    } else outcome = def.label + ' is over.';
    state.history.unshift({ type: ev.type, day: day(), choice: ch, outcome }); if (state.history.length > 12) state.history.pop();
    say(def.icon + ' ' + outcome);
    return outcome;
  }
  function day_() {
    if (day() < 4 || state.active.some(e => e.type !== 'poachers')) return;
    if (rng() > .3) return;
    const pool = Object.entries(EVENTS).filter(([k, e]) => k !== 'poachers' && k !== 'escape' && (!e.minReputation || sanct.state.reputation >= e.minReputation));
    const total = pool.reduce((n, [, e]) => n + e.weight, 0); let x = rng() * total;
    for (const [k, e] of pool) { x -= e.weight; if (x <= 0) { start(k); break; } }
  }
  // the ranger reaching patrol points (called by the game loop with the ranger position)
  function visit(pos) {
    const out = [];
    for (const ev of state.active) {
      if (!ev.points || !['patrol', 'search'].includes(choiceOf(ev))) continue;
      for (const p of ev.points) if (!p.done && Math.hypot(p.x - pos.x, p.z - pos.z) < PATROL_RADIUS) { p.done = true; out.push({ type: ev.type === 'escape' ? 'escape' : 'patrol', name: ev.animalName, left: ev.points.filter(q => !q.done).length }); }
    }
    return out;
  }
  const markers = () => state.active.filter(e => e.points && ['patrol', 'search'].includes(choiceOf(e))).flatMap(e => e.points.map(p => ({ id: p.id, type: 'search', x: p.x, z: p.z, radius: PATROL_RADIUS, found: p.done }))).filter(m => !m.found);
  const pending = () => state.active.filter(e => !e.seen);
  const markSeen = id => { const e = byId(id); if (e) e.seen = true; };
  function summary() {
    return { active: state.active.map(e => ({ ...e, def: EVENTS[e.type], choice: e.choice, effective: choiceOf(e), hoursLeft: Math.max(0, Math.ceil((e.endsAt - sanct.state.minutes) / 60)), points: e.points ? e.points.map(p => ({ ...p })) : null })), history: state.history.slice() };
  }
  function serialize() { return JSON.parse(JSON.stringify(state)); }
  function restore(d) {
    const obj = v => v && typeof v === 'object' && !Array.isArray(v); if (!obj(d)) return;
    state.serial = Number.isFinite(d.serial) ? d.serial : 0; state.nextRoll = Number.isFinite(d.nextRoll) ? d.nextRoll : 0; state.nextNight = Number.isFinite(d.nextNight) ? d.nextNight : 0;
    // keep the serial ahead of every restored id, and give id-less events a fresh one, so ids stay unique
    for (const e of Array.isArray(d.active) ? d.active : []) { const n = obj(e) && typeof e.id === 'string' ? Number(/^ev(\d+)$/.exec(e.id)?.[1]) : 0; if (n > state.serial) state.serial = n; }
    state.active = (Array.isArray(d.active) ? d.active : []).filter(e => obj(e) && EVENTS[e.type] && Number.isFinite(e.endsAt)).map(e => typeof e.id === 'string' ? e : { ...e, id: 'ev' + (++state.serial) }).map(e => ({ ...e, points: Array.isArray(e.points) ? e.points.filter(obj) : e.type === 'poachers' ? PATROL_POINTS.map(([x, z], i) => ({ id: e.id + '-p' + i, x, z, done: false })) : undefined }));
    state.history = (Array.isArray(d.history) ? d.history : []).filter(obj).slice(0, 12);
  }
  sanct.extend({ key: 'events', tick, day: day_, summary: () => ({}), serialize, restore });
  return { state, start, choose, tick, resolve, visit, markers, pending, markSeen, summary, EVENTS };
}
