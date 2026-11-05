// Personal stories: every founding resident pair has a three-chapter arc that unfolds through real care, not dialogue
// trees. Each chapter has a goal checked against live game state (vet visits, enrichment, bonds, breeding, habitat,
// releases, patrols); finishing it writes to the animal's history, pays a reward and opens the next chapter.
// Pure logic; saved in its own `stories` block.

const near = (it, x, z, r = 9) => Math.hypot(it.x - x, it.z - z) <= r;

export const STORIES = [
  { id: 'jabari', animal: 'africanLion-jabari', title: 'The old limp', blurb: 'Jabari came to the sanctuary with a stiff hind leg from a snare years ago.', chapters: [
    { title: 'A stiff gait', goal: 'Have a vet check Jabari over (Health tab check-up, or a vet on staff).', check: c => c.count('examined') > 0, reward: { reputation: 2 } },
    { title: 'Physio on the rocks', goal: 'Give Jabari three climbing or scratching-post sessions.', check: c => c.enrich('climbing') + c.enrich('scratch') >= 3, reward: { credits: 2 } },
    { title: 'King of the kopje', goal: 'Get the lion habitat to 90% and Jabari\'s stress under 30.', check: c => c.habitat('africanLion') >= 90 && c.a.stress < 30, reward: { reputation: 5 }, done: c => { if (c.a.traits) c.a.traits.bold = Math.min(1, c.a.traits.bold + .1); } },
  ] },
  { id: 'nala', animal: 'africanLion-nala', title: 'A mother\'s patience', blurb: 'Nala was hand-reared and has never raised cubs of her own.', chapters: [
    { title: 'Settling in', goal: 'Help Nala and Jabari become close companions (bond 50+).', check: c => c.bond('africanLion-jabari') >= 50, reward: { reputation: 2 } },
    { title: 'Expecting', goal: 'Start a breeding pair with Nala.', check: c => !!c.a.pregnant || c.bornTo(), reward: { credits: 2 } },
    { title: 'Cubs at last', goal: 'Welcome Nala\'s first cub.', check: c => c.bornTo(), reward: { reputation: 6, credits: 3 } },
  ] },
  { id: 'tigers', animal: 'bengalTiger-anika', title: 'Two strangers', blurb: 'Anika and Rudra arrived from different rescue centres and do not trust each other yet.', chapters: [
    { title: 'Wary neighbours', goal: 'Run a group enrichment session for the tigers (Social tab).', check: c => c.sessions('bengalTiger') > 0, reward: { reputation: 1 } },
    { title: 'Grudging respect', goal: 'Raise Anika and Rudra\'s bond to 25.', check: c => c.bond('bengalTiger-rudra') >= 25, reward: { credits: 2 } },
    { title: 'Shadows in the bamboo', goal: 'Bond 50+ and a tiger habitat of 85% or better.', check: c => c.bond('bengalTiger-rudra') >= 50 && c.habitat('bengalTiger') >= 85, reward: { reputation: 5 } },
  ] },
  { id: 'wangari', animal: 'africanElephant-wangari', title: 'The matriarch', blurb: 'Wangari lost her herd to drought. She still listens for them at dusk.', chapters: [
    { title: 'Mud is medicine', goal: 'Build a mud wallow near the elephants.', check: c => c.built('wallow', 'africanElephant'), reward: { reputation: 2 } },
    { title: 'Herd harmony', goal: 'Bring elephant harmony to 75%.', check: c => (c.harmony('africanElephant') ?? 0) >= 75, reward: { credits: 3 } },
    { title: 'She leads', goal: 'Wangari leads the herd, calm (stress under 30).', check: c => c.isLeader() && c.a.stress < 30, reward: { reputation: 6 } },
  ] },
  { id: 'kamili', animal: 'giraffe-kamili', title: 'Tall order', blurb: 'Kamili is picky. Very picky.', chapters: [
    { title: 'Fresh browse', goal: 'Feed Kamili browse five times.', check: c => c.fed('browse') >= 5, reward: { reputation: 1 } },
    { title: 'Room to reach', goal: 'Plant two shade trees near the giraffes.', check: c => c.builtCount('shadeTree', 'giraffe') >= 2, reward: { credits: 2 } },
    { title: 'At ease', goal: 'Keep Kamili calm (stress under 30) for three days in a row.', check: c => c.count('calmDays') >= 3, reward: { reputation: 4 } },
  ] },
  { id: 'kito', animal: 'plainsZebra-kito', title: 'Skittish', blurb: 'Kito bolts at every car door and camera click.', chapters: [
    { title: 'Breathing room', goal: 'Keep Kito calm (stress under 30) for two days.', check: c => c.count('calmDays') >= 2, reward: { reputation: 1 } },
    { title: 'A steady friend', goal: 'Kito and Penda become close companions (bond 60).', check: c => c.bond('plainsZebra-penda') >= 60, reward: { credits: 2 } },
    { title: 'Face the crowd', goal: 'Reach a 4★ visitor rating while Kito stays under 35 stress.', check: c => c.rating() >= 4 && c.a.stress < 35, reward: { reputation: 5 } },
  ] },
  { id: 'amani', animal: 'cheetah-amani', title: 'Born to run', blurb: 'Amani was found as a cub. Everyone hopes she will run free one day.', chapters: [
    { title: 'Sharp senses', goal: 'Give Amani two scent-trail or puzzle-feeder sessions.', check: c => c.enrich('scent') + c.enrich('puzzle') >= 2, reward: { reputation: 1 } },
    { title: 'The soft-release pen', goal: 'Prepare a cheetah for release (Release tab).', check: c => c.preparing('cheetah'), reward: { credits: 3 } },
    { title: 'Free', goal: 'A cheetah becomes established in the wild.', check: c => c.established('cheetah'), reward: { reputation: 10, credits: 5 } },
  ] },
  { id: 'gauri', animal: 'indianRhino-gauri', title: 'Horn guard', blurb: 'Gauri\'s mother was killed for her horn. Gauri is the reason this sanctuary has a fence.', chapters: [
    { title: 'Strong and well', goal: 'Feed Gauri hay three times and keep her health above 85%.', check: c => c.fed('hay') >= 3 && c.a.health > 85, reward: { reputation: 2 } },
    { title: 'Night watch', goal: 'Complete a poacher patrol yourself.', check: c => c.patrolled(), reward: { credits: 3 } },
    { title: 'Safe ground', goal: 'Rhino harmony 70% and sanctuary reputation 40.', check: c => (c.harmony('indianRhino') ?? 0) >= 70 && c.sanct.state.reputation >= 40, reward: { reputation: 6 } },
  ] },
  { id: 'furaha', animal: 'flamingo-furaha', title: 'Pink again', blurb: 'Furaha arrived pale and thin from a polluted lake.', chapters: [
    { title: 'Shrimp diet', goal: 'Feed Furaha aquatic food six times.', check: c => c.fed('aquatic') >= 6, reward: { reputation: 1 } },
    { title: 'Clean water', goal: 'Keep the water supply above 80% for three days.', check: c => c.global('waterDays') >= 3, reward: { credits: 2 } },
    { title: 'In the pink', goal: 'Furaha reaches 85% welfare.', check: c => c.sanct.welfareOf(c.a) >= 85, reward: { reputation: 5 } },
  ] },
];

export function createStories(sanct, { ops, mgmt, social, release, events } = {}) {
  const state = { chapter: {}, done: {}, counts: {}, global: { waterDays: 0, patrols: 0 }, sessions: {}, log: [] };
  const residents = () => sanct.residents();
  const byId = id => residents().find(a => a.id === id);
  const cnt = id => (state.counts[id] ||= { feed: {}, enrich: {}, examined: 0, calmDays: 0 });

  // listen to what the player and staff actually do
  const wrap = (obj, name, after) => { const orig = obj[name].bind(obj); obj[name] = (...args) => { const r = orig(...args); try { after(r, ...args); } catch { /* never break the action */ } return r; }; };
  wrap(sanct, 'feed', (r, id, food) => { if (r && r.ok && id && food) { const c = cnt(id); c.feed[food] = (c.feed[food] || 0) + 1; } });
  wrap(sanct, 'useEnrichment', (r, id, type) => { if (r && r.ok && id && type) { const c = cnt(id); c.enrich[type] = (c.enrich[type] || 0) + 1; } });
  if (mgmt) wrap(mgmt, 'examine', (r, id) => { if (r && r.ok && id) cnt(id).examined++; });
  if (social) wrap(social, 'groupSession', (r, kind) => { if (r && r.ok) state.sessions[kind] = (state.sessions[kind] || 0) + 1; });

  function ctxFor(story) {
    const a = byId(story.animal);
    return {
      a, sanct,
      count: k => (state.counts[story.animal] || {})[k] || 0,
      fed: f => ((state.counts[story.animal] || {}).feed || {})[f] || 0,
      enrich: t => ((state.counts[story.animal] || {}).enrich || {})[t] || 0,
      global: k => state.global[k] || 0,
      sessions: kind => state.sessions[kind] || 0,
      bond: other => social ? social.bond(story.animal, other) : 0,
      harmony: kind => social ? social.harmony(kind) : null,
      isLeader: () => social ? (social.leader(a.kind) || {}).id === a.id : false,
      habitat: kind => sanct.mods.habitatScore ? sanct.mods.habitatScore(kind) : 100,
      built: (type, kind) => ops ? ops.state.items.some(i => i.type === type && near(i, ...sanct.SPECIES[kind].spawn)) : false,
      builtCount: (type, kind) => ops ? ops.state.items.filter(i => i.type === type && near(i, ...sanct.SPECIES[kind].spawn)).length : 0,
      bornTo: () => sanct.state.familyTree.some(f => (f.parents || []).includes(a.name)),
      rating: () => ops ? ops.state.visitors.rating : 0,
      preparing: kind => release ? Object.keys(release.state.prep).some(id => (byId(id) || {}).kind === kind) : false,
      established: kind => release ? release.state.released.some(r => r.kind === kind && r.status === 'established') : false,
      patrolled: () => state.global.patrols > 0,
    };
  }
  function check() {
    const out = [];
    for (const s of STORIES) {
      if (state.done[s.id]) continue;
      const a = byId(s.animal); if (!a) continue;
      const i = state.chapter[s.id] || 0, ch = s.chapters[i]; const c = ctxFor(s);
      let ok = false; try { ok = !!ch.check(c); } catch { ok = false; }
      if (!ok) continue;
      const r = ch.reward || {};
      if (r.reputation) sanct.state.reputation += r.reputation; if (r.credits) sanct.state.credits += r.credits; if (r.funds) sanct.earn(r.funds, 'stories');
      if (ch.done) try { ch.done(c); } catch { /* cosmetic */ }
      sanct.addHistory(a.id, 'Story: ' + ch.title + '.');
      state.log.unshift({ day: sanct.state.day, story: s.id, text: a.name + ' · ' + s.title + ': ' + ch.title }); if (state.log.length > 20) state.log.pop();
      if (i + 1 >= s.chapters.length) { state.done[s.id] = true; sanct.say('📖 ' + a.name + '\'s story "' + s.title + '" is complete.'); }
      else { state.chapter[s.id] = i + 1; sanct.say('📖 ' + a.name + ': "' + ch.title + '" done. Next: ' + s.chapters[i + 1].title + '.'); }
      out.push({ story: s.id, chapter: i, title: ch.title, animal: a.name, complete: !!state.done[s.id] });
    }
    return out;
  }
  let acc = 0;
  function tick(d) { acc += d; if (acc >= 60) { acc = 0; check(); } }
  function day() {
    for (const a of residents()) { const c = cnt(a.id); c.calmDays = a.stress < 30 ? c.calmDays + 1 : 0; }
    state.global.waterDays = sanct.state.waterLevel > 80 ? state.global.waterDays + 1 : 0;
    if (events) state.global.patrols = events.state.history.filter(h => h.type === 'poachers' && /deterred/.test(h.outcome)).length;
    check();
  }
  function summary() {
    return STORIES.map(s => {
      const a = byId(s.animal), i = state.chapter[s.id] || 0;
      return { id: s.id, animal: s.animal, name: a ? a.name : null, kind: a ? a.kind : null, title: s.title, blurb: s.blurb, done: !!state.done[s.id], chapter: i,
        chapters: s.chapters.map((ch, k) => ({ title: ch.title, goal: ch.goal, state: state.done[s.id] || k < i ? 'done' : k === i ? 'active' : 'locked', reward: ch.reward })) };
    });
  }
  function serialize() { return JSON.parse(JSON.stringify(state)); }
  function restore(d) {
    const obj = v => v && typeof v === 'object' && !Array.isArray(v); if (!obj(d)) return;
    state.chapter = {}; if (obj(d.chapter)) for (const s of STORIES) if (Number.isFinite(d.chapter[s.id])) state.chapter[s.id] = Math.max(0, Math.min(s.chapters.length - 1, d.chapter[s.id]));
    state.done = {}; if (obj(d.done)) for (const s of STORIES) if (d.done[s.id]) state.done[s.id] = true;
    // counters are incremented and written to every day, so anything that is not a finite number is dropped
    const nums = o => Object.fromEntries(Object.entries(obj(o) ? o : {}).filter(([, v]) => Number.isFinite(v)));
    state.counts = {}; if (obj(d.counts)) for (const [id, c] of Object.entries(d.counts)) if (obj(c)) state.counts[id] = { examined: 0, calmDays: 0, ...nums(c), feed: nums(c.feed), enrich: nums(c.enrich) };
    state.global = { waterDays: 0, patrols: 0, ...nums(d.global) };
    state.sessions = nums(d.sessions); state.log = (Array.isArray(d.log) ? d.log : []).filter(obj).slice(0, 20);
  }
  sanct.extend({ key: 'stories', tick, day, summary: () => ({}), serialize, restore });
  return { state, check, summary, STORIES };
}
