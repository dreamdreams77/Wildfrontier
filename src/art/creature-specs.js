// Data-driven body plans for every species. Lengths are metres of the real animal, multiplied by `k`
// (a readability factor: small animals are drawn larger than life so they read from the game camera).
// +z is forward, +y is up. The generators in creature.js turn these into lofted, skinned, rigged meshes.

const quad=(o)=>({type:'quad',...o});
export const SPECS={
 // ---------- woodland ----------
 deer:quad({k:1.5,L:.9,bh:.2,bw:.13,legH:.62,legR:.034,foot:'hoof',neck:{len:.42,r:.075,up:.85},head:{len:.27,r:.075,snout:.58},tail:{len:.14,r:.04,type:'short',color:'#f4efe6'},ears:{type:'oval',size:.13},
  coat:{back:'#a9754a',belly:'#eadfc7',dark:'#e8dcc6',marks:'spots',face:'lightmuzzle',muzzle:'#e9dcc4',seed:5},limbs:'#8c5d3a',lower:'#5a3e2a',eye:'#2a1c12',nose:'#241a16',gait:{type:'walk',freq:3.6,stride:.45,bob:.015},speed:.6}),
 rabbit:quad({k:2.4,L:.3,bh:.095,bw:.075,legH:.1,hind:1.6,legR:.02,foot:'paw',arch:.7,neck:{len:.05,r:.05,up:.35},head:{len:.1,r:.05,snout:.5},tail:{len:.05,r:.04,type:'puff',color:'#f4efe3'},ears:{type:'long',size:.17},
  coat:{back:'#a58a68',belly:'#efe6d4',dark:'#3a2d22',face:'lightmuzzle',muzzle:'#eee3cf',seed:7},limbs:'#8f7658',lower:'#cdbba0',eye:'#2a1b12',nose:'#c98f8f',gait:{type:'bound',freq:5,stride:.7,bob:.14},speed:.55}),
 fox:quad({k:1.9,L:.62,bh:.12,bw:.09,legH:.27,legR:.026,foot:'paw',neck:{len:.12,r:.065,up:.5},head:{len:.21,r:.07,snout:.52},tail:{len:.5,r:.07,type:'bushy',color:'#d27a36',tip:'#f7f2e6'},ears:{type:'point',size:.11},
  coat:{back:'#cc6a2a',belly:'#f4e8d4',dark:'#2b211a',face:'lightmuzzle',muzzle:'#f4e8d4',seed:11},limbs:'#cc6a2a',lower:'#2a211b',eye:'#e0a830',nose:'#1d1613',gait:{type:'trot',freq:6.4,stride:.5,bob:.02},speed:.55}),
 redWolf:quad({k:1.3,L:1.0,bh:.18,bw:.12,legH:.55,legR:.04,foot:'paw',neck:{len:.28,r:.1,up:.5},head:{len:.3,r:.095,snout:.55},tail:{len:.45,r:.06,type:'bushy',color:'#9a5a3a',tip:'#2a211a'},ears:{type:'point',size:.13},
  coat:{back:'#9a5a3a',belly:'#d9bf9f',dark:'#3d291f',marks:'saddle',face:'lightmuzzle',muzzle:'#e3cdb0',seed:13},limbs:'#a8683f',lower:'#5a3b2a',eye:'#d9a23a',nose:'#1d1613',gait:{type:'trot',freq:5.2,stride:.42,bob:.02},speed:.62}),
 bobcat:quad({k:1.6,L:.72,bh:.15,bw:.11,legH:.33,legR:.034,foot:'paw',neck:{len:.15,r:.085,up:.45},head:{len:.2,r:.088,snout:.38},tail:{len:.15,r:.04,type:'short',color:'#b58a61',tip:'#2a211a'},ears:{type:'tuft',size:.09},
  coat:{back:'#b88b5d',belly:'#eadcc3',dark:'#3a2a1f',marks:'spots',face:'tears',seed:17},limbs:'#b88b5d',lower:'#8a6642',eye:'#d9c24a',nose:'#8a5a50',gait:{type:'walk',freq:4.8,stride:.4,bob:.015},speed:.5}),
 raccoon:quad({k:1.9,L:.55,bh:.14,bw:.13,legH:.16,legR:.03,foot:'paw',neck:{len:.08,r:.09,up:.3},head:{len:.17,r:.085,snout:.55},tail:{len:.3,r:.065,type:'ringed',color:'#8a8a80',tip:'#2a2a28'},ears:{type:'round',size:.06},
  coat:{back:'#7a7a70',belly:'#b9b6a8',dark:'#26231f',face:'mask',seed:19},limbs:'#5f5f58',lower:'#2d2a26',eye:'#1a1410',nose:'#1a1410',gait:{type:'amble',freq:4,stride:.35,bob:.01},speed:.42}),
 skunk:quad({k:2.2,L:.4,bh:.095,bw:.085,legH:.1,legR:.022,foot:'paw',neck:{len:.06,r:.06,up:.2},head:{len:.12,r:.05,snout:.55},tail:{len:.34,r:.08,type:'bushy',color:'#2c2e2e',tip:'#f0f0ea'},ears:{type:'round',size:.035},
  coat:{back:'#2c2e2f',belly:'#2c2e2f',dark:'#f1f1ea',marks:'dorsal',face:'plain',seed:23},limbs:'#262828',lower:'#1c1e1e',eye:'#1a1410',nose:'#d49a9a',gait:{type:'amble',freq:3.8,stride:.3,bob:.008},speed:.34}),
 opossum:quad({k:2,L:.42,bh:.085,bw:.08,legH:.09,legR:.02,foot:'paw',neck:{len:.06,r:.05,up:.2},head:{len:.14,r:.045,snout:.8},tail:{len:.38,r:.018,type:'bare',color:'#d5b3a8'},ears:{type:'round',size:.045,color:'#d5b3a8'},
  coat:{back:'#a8a498',belly:'#cfcbbd',dark:'#4a463f',face:'lightmuzzle',muzzle:'#f0ece2',seed:29},limbs:'#59544c',lower:'#3e3a34',eye:'#14100c',nose:'#d49a9a',gait:{type:'amble',freq:3.6,stride:.3,bob:.008},speed:.4}),
 squirrel:quad({k:3,L:.22,bh:.05,bw:.042,legH:.07,hind:1.3,legR:.012,foot:'paw',arch:.5,neck:{len:.03,r:.035,up:.4},head:{len:.065,r:.03,snout:.4},tail:{len:.24,r:.055,type:'curl',color:'#8f8a7e',tip:'#d9d4c6'},ears:{type:'tuft',size:.03},
  coat:{back:'#8f8a7e',belly:'#ece5d6',dark:'#4a463f',face:'plain',seed:31},limbs:'#8f8a7e',lower:'#6d695f',eye:'#120d0a',nose:'#b88',gait:{type:'bound',freq:6,stride:.6,bob:.1},speed:.5}),
 beaver:quad({k:1.9,L:.55,bh:.13,bw:.12,legH:.08,legR:.025,foot:'webbed',neck:{len:.05,r:.1,up:.1},head:{len:.15,r:.085,snout:.6},tail:{len:.3,r:.1,type:'paddle',color:'#3e2e22'},ears:{type:'round',size:.03},
  coat:{back:'#6b4a33',belly:'#8a6446',dark:'#2f2018',face:'plain',seed:37},limbs:'#5d4230',lower:'#2f2018',eye:'#140e0a',nose:'#1a120e',gait:{type:'waddle',freq:3.6,stride:.3,bob:.01},speed:.3}),
 riverOtter:quad({k:1.9,L:.8,bh:.085,bw:.08,legH:.1,legR:.025,foot:'webbed',neck:{len:.1,r:.07,up:.15},head:{len:.14,r:.06,snout:.55},tail:{len:.45,r:.05,type:'taper',color:'#4f3d30'},ears:{type:'round',size:.025},
  coat:{back:'#5a4636',belly:'#cdbca5',dark:'#2d2118',face:'lightmuzzle',muzzle:'#d8c8b2',seed:41},limbs:'#4f3d30',lower:'#2d2118',eye:'#120d0a',nose:'#1a120e',gait:{type:'bound',freq:5.5,stride:.5,bob:.03},speed:.5}),
 // ---------- safari ----------
 africanLion:quad({k:1.15,L:1.5,bh:.3,bw:.23,legH:.58,legR:.092,foot:'paw',neck:{len:.34,r:.2,up:.42},head:{len:.36,r:.19,snout:.64},tail:{len:.95,r:.04,type:'tufted',color:'#c99a5b',tip:'#3a2616'},ears:{type:'round',size:.09},
  coat:{back:'#c99a5b',belly:'#e8d3a6',dark:'#7a5230',face:'lightmuzzle',muzzle:'#ead7b0',seed:43},limbs:'#c4975a',lower:'#b98b50',eye:'#d9a23a',nose:'#4a2f2a',mane:'#6b4423',gait:{type:'walk',freq:3.8,stride:.4,bob:.015},speed:.5}),
 bengalTiger:quad({k:1.1,L:1.7,bh:.31,bw:.25,legH:.6,legR:.08,foot:'paw',neck:{len:.28,r:.18,up:.35},head:{len:.36,r:.17,snout:.46},tail:{len:1.0,r:.045,type:'taper',color:'#d8822f',tip:'#25201b'},ears:{type:'round',size:.09},
  coat:{back:'#d8822f',belly:'#f3e6cb',dark:'#25201b',marks:'stripes',face:'tiger',seed:47},limbs:'#d68a3a',lower:'#e8c595',eye:'#cfc040',nose:'#c47b78',gait:{type:'walk',freq:3.7,stride:.4,bob:.015},speed:.5}),
 cheetah:quad({k:1.3,L:1.15,bh:.19,bw:.14,legH:.74,legR:.045,foot:'paw',neck:{len:.3,r:.095,up:.5},head:{len:.22,r:.09,snout:.36},tail:{len:1.0,r:.04,type:'taper',color:'#d9b26c',tip:'#2c241b'},ears:{type:'round',size:.05},
  coat:{back:'#d9b26c',belly:'#f1e3c0',dark:'#2c241b',marks:'spots',face:'tears',seed:53},limbs:'#d9b26c',lower:'#e9d3a0',eye:'#c9a02a',nose:'#2b2220',gait:{type:'trot',freq:5.6,stride:.5,bob:.02},speed:.75}),
 africanElephant:quad({k:1,L:2.3,bh:.78,bw:.6,legH:1.15,legR:.23,foot:'pad',neck:{len:.12,r:.5,up:.1},head:{len:.72,r:.42,snout:.5},tail:{len:.9,r:.035,type:'tufted',color:'#8d8a82',tip:'#3a3732'},ears:{type:'huge',size:.8},trunk:true,tusks:true,
  coat:{back:'#8f8c84',belly:'#a29f96',dark:'#4c4a45',marks:'plates',face:'plain',seed:59},limbs:'#8a877f',lower:'#7a776f',eye:'#2a1c12',nose:'#6d6a63',gait:{type:'walk',freq:2.2,stride:.28,bob:.012},speed:.32}),
 giraffe:quad({k:1,L:1.45,bh:.4,bw:.26,legH:1.7,legR:.07,foot:'hoof',neck:{len:1.95,r:.13,up:2.9},head:{len:.46,r:.1,snout:.55},tail:{len:.85,r:.03,type:'tufted',color:'#d8a95a',tip:'#2a1f14'},ears:{type:'oval',size:.14},horns:'ossicones',
  coat:{back:'#d9ab5e',belly:'#efdcae',dark:'#7a4a22',marks:'patches',face:'lightmuzzle',muzzle:'#e7d2a8',seed:61},limbs:'#e6c88a',lower:'#d9ba7a',eye:'#2a1c12',nose:'#3b2a22',gait:{type:'walk',freq:2.6,stride:.4,bob:.01},speed:.42}),
 plainsZebra:quad({k:1.1,L:1.5,bh:.3,bw:.21,legH:.85,legR:.052,foot:'hoof',neck:{len:.55,r:.13,up:.65},head:{len:.52,r:.115,snout:.58},tail:{len:.7,r:.03,type:'tufted',color:'#f3f1ea',tip:'#1a1816'},ears:{type:'tall',size:.14},mane:'#1c1a18',maneStyle:'short',
  coat:{back:'#f1eee5',belly:'#faf8f1',dark:'#1f1d1b',marks:'zebra',face:'plain',seed:67},limbs:'#e8e5db',lower:'#2a2724',eye:'#1a1410',nose:'#3a3633',gait:{type:'trot',freq:4.4,stride:.42,bob:.015},speed:.6}),
 indianRhino:quad({k:1,L:2.0,bh:.58,bw:.5,legH:.62,legR:.17,foot:'pad',neck:{len:.16,r:.34,up:.1},head:{len:.7,r:.28,snout:.55},tail:{len:.5,r:.03,type:'tufted',color:'#7d776b',tip:'#3a352e'},ears:{type:'tuft',size:.08},horn:true,
  coat:{back:'#8a8478',belly:'#a39d90',dark:'#3d3931',marks:'plates',face:'plain',seed:71},limbs:'#837d71',lower:'#6f695e',eye:'#1a1410',nose:'#5a554c',gait:{type:'walk',freq:2.6,stride:.3,bob:.012},speed:.34}),
 // ---------- birds & reptiles ----------
 owl:{type:'bird',k:2.6,body:{L:.3,rx:.1,ry:.12},legH:.07,neck:{len:.03,r:.09,up:.2},head:{r:.085,len:.1,round:true},beak:{len:.035,r:.015,type:'hook',color:'#c8aa5a'},wing:{len:.26,chord:.11},tail:{len:.14,w:.07},upright:.65,
  coat:{back:'#7d6247',belly:'#dccbae',dark:'#3a2b1f',marks:'bars',face:'disc',seed:73},wingColor:'#6f573e',leg:'#b59e78',eye:'#e0a220',gait:{type:'hop',freq:5,stride:.3,bob:.02},speed:.4},
 bird:{type:'bird',k:3.2,body:{L:.11,rx:.035,ry:.04},legH:.035,neck:{len:.02,r:.03,up:.2},head:{r:.03,len:.04},beak:{len:.03,r:.008,type:'curve',color:'#4a3a2a'},wing:{len:.09,chord:.04},tail:{len:.08,w:.025,cock:true},upright:.35,
  coat:{back:'#8a5a34',belly:'#e8d2a8',dark:'#3a2518',face:'plain',seed:79},wingColor:'#7a4e2c',leg:'#b0907a',eye:'#120d0a',gait:{type:'hop',freq:9,stride:.4,bob:.03},speed:.65},
 cardinal:{type:'bird',k:3.2,body:{L:.15,rx:.04,ry:.045},legH:.04,neck:{len:.02,r:.035,up:.2},head:{r:.035,len:.045},beak:{len:.03,r:.012,type:'cone',color:'#e8a050'},wing:{len:.11,chord:.045},tail:{len:.1,w:.03},upright:.4,crest:'#b8312c',
  coat:{back:'#b8312c',belly:'#c63a32',dark:'#1a1210',face:'mask',seed:83},wingColor:'#a52d28',leg:'#a8806a',eye:'#120d0a',gait:{type:'hop',freq:9,stride:.4,bob:.03},speed:.65},
 woodDuck:{type:'bird',k:2.4,body:{L:.38,rx:.075,ry:.075},legH:.05,neck:{len:.07,r:.035,up:.7},head:{r:.04,len:.06},beak:{len:.05,r:.018,type:'flat',color:'#c85a3a'},wing:{len:.22,chord:.07},tail:{len:.1,w:.04},upright:.2,crest:'#1f6a52',
  coat:{back:'#2a5a52',belly:'#e8dcc0',dark:'#1a2a28',marks:'bars',face:'mask',seed:89},wingColor:'#2e4a6a',leg:'#d09a4a',eye:'#c8281a',gait:{type:'waddle',freq:4.5,stride:.3,bob:.01},speed:.4},
 greatBlueHeron:{type:'bird',k:1.6,body:{L:.55,rx:.07,ry:.08},legH:.62,neck:{len:.5,r:.03,up:1.6,s:true},head:{r:.032,len:.1},beak:{len:.17,r:.018,type:'dagger',color:'#d8b04a'},wing:{len:.5,chord:.14},tail:{len:.12,w:.05},upright:.8,
  coat:{back:'#7f929d',belly:'#d8dde0',dark:'#2f3d4a',marks:'plain',face:'plain',seed:97},wingColor:'#6c808c',leg:'#8f8a5a',eye:'#e8c83a',gait:{type:'wade',freq:2.2,stride:.35,bob:.01},speed:.3},
 whoopingCrane:{type:'bird',k:1.5,body:{L:.55,rx:.075,ry:.085},legH:.78,neck:{len:.62,r:.03,up:1.8,s:true},head:{r:.032,len:.1},beak:{len:.17,r:.016,type:'dagger',color:'#c8b48a'},wing:{len:.6,chord:.17,tipDark:true},tail:{len:.1,w:.05},upright:.85,cap:'#c43a30',
  coat:{back:'#f2efe6',belly:'#fbfaf5',dark:'#1d1b19',marks:'plain',face:'plain',seed:101},wingColor:'#f2efe6',leg:'#3a3633',eye:'#d8b030',gait:{type:'wade',freq:2.3,stride:.35,bob:.01},speed:.3},
 flamingo:{type:'bird',k:1.5,body:{L:.5,rx:.085,ry:.09},legH:.75,neck:{len:.7,r:.028,up:2.2,s:true},head:{r:.034,len:.09},beak:{len:.1,r:.018,type:'bent',color:'#f0d2d2',tipColor:'#1d1b19'},wing:{len:.5,chord:.16,tipDark:true},tail:{len:.12,w:.05},upright:.8,
  coat:{back:'#f08fa0',belly:'#f6a8b6',dark:'#d9647d',marks:'plain',face:'plain',seed:103},wingColor:'#f08fa0',leg:'#e8788f',eye:'#e8c83a',gait:{type:'wade',freq:2.2,stride:.35,bob:.01},speed:.3},
 turtle:{type:'turtle',k:2.6,L:.17,w:.075,h:.06,head:{r:.025,len:.05},legR:.014,speed:.13,
  coat:{back:'#6a6a3a',belly:'#c9b98a',dark:'#2a2a16',accent:'#d9a83a',seed:107},gait:{type:'crawl',freq:1.8,stride:.3,bob:0}},
};

Object.assign(SPECS.deer, {
  L: 0.94,
  bh: 0.21,
  bw: 0.14,
  legH: 0.64,
  legR: 0.032,
  neck: { len: 0.44, r: 0.072, up: 0.9 },
  head: { len: 0.28, r: 0.073, snout: 0.56 },
  ears: { type: 'oval', size: 0.14 },
  coat: {
    ...SPECS.deer.coat,
    back: '#9f6b43',
    belly: '#e8dbc2',
    dark: '#6a4932',
    muzzle: '#e8dac2'
  }
});

Object.assign(SPECS.rabbit, {
  L: 0.32,
  bh: 0.1,
  bw: 0.078,
  hind: 1.72,
  arch: 0.78,
  ears: { type: 'long', size: 0.18 },
  coat: {
    ...SPECS.rabbit.coat,
    back: '#978064',
    belly: '#e9e0cf',
    dark: '#4a3a2c'
  }
});

Object.assign(SPECS.fox, {
  L: 0.66,
  bh: 0.12,
  bw: 0.092,
  legH: 0.27,   // kept at the original height: a fox must stay shorter than a lion (tests/art.test.js)
  neck: { len: 0.135, r: 0.063, up: 0.5 },
  head: { len: 0.225, r: 0.067, snout: 0.57 },
  tail: {
    ...SPECS.fox.tail,
    len: 0.54,
    r: 0.076,
    color: '#bd6429',
    tip: '#eee9dc'
  },
  ears: { type: 'point', size: 0.12 },
  coat: {
    ...SPECS.fox.coat,
    back: '#bd6429',
    belly: '#eee3cf',
    dark: '#30221a'
  }
});

Object.assign(SPECS.redWolf, {
  L: 1.04,
  bh: 0.19,
  bw: 0.125,
  legH: 0.57,
  neck: { len: 0.3, r: 0.102, up: 0.54 },
  head: { len: 0.31, r: 0.092, snout: 0.59 },
  ears: { type: 'point', size: 0.14 },
  coat: {
    ...SPECS.redWolf.coat,
    back: '#87503a',
    belly: '#c8ad8d',
    dark: '#34241d',
    muzzle: '#d4bea0'
  }
});

Object.assign(SPECS.bobcat, {
  L: 0.75,
  bh: 0.16,
  bw: 0.115,
  legH: 0.35,
  head: { len: 0.195, r: 0.092, snout: 0.34 },
  ears: { type: 'tuft', size: 0.1 },
  coat: {
    ...SPECS.bobcat.coat,
    back: '#a87f58',
    belly: '#dfd1ba',
    dark: '#3b2b22'
  }
});

Object.assign(SPECS.raccoon, {
  L: 0.58,
  bh: 0.145,
  bw: 0.135,
  tail: {
    ...SPECS.raccoon.tail,
    len: 0.34,
    r: 0.07
  },
  coat: {
    ...SPECS.raccoon.coat,
    back: '#696b66',
    belly: '#aaa99f',
    dark: '#23221f'
  }
});

Object.assign(SPECS.riverOtter, {
  L: 0.84,
  bh: 0.09,
  bw: 0.085,
  neck: { len: 0.11, r: 0.073, up: 0.16 },
  tail: {
    ...SPECS.riverOtter.tail,
    len: 0.49,
    r: 0.055
  },
  coat: {
    ...SPECS.riverOtter.coat,
    back: '#49392e',
    belly: '#b9a992',
    dark: '#251b15'
  }
});

Object.assign(SPECS.beaver, {
  L: 0.58,
  bh: 0.14,
  bw: 0.13,
  tail: {
    ...SPECS.beaver.tail,
    len: 0.33,
    r: 0.11
  },
  coat: {
    ...SPECS.beaver.coat,
    back: '#5c402e',
    belly: '#79583f',
    dark: '#2b1e17'
  }
});

Object.assign(SPECS.owl, {
  body: { L: 0.31, rx: 0.105, ry: 0.13 },
  head: { r: 0.09, len: 0.1, round: true },
  wing: { len: 0.28, chord: 0.12 },
  coat: {
    ...SPECS.owl.coat,
    back: '#71583f',
    belly: '#d0bea1',
    dark: '#30241c'
  }
});

Object.assign(SPECS.woodDuck, {
  body: { L: 0.39, rx: 0.078, ry: 0.078 },
  wing: { len: 0.23, chord: 0.075 },
  coat: {
    ...SPECS.woodDuck.coat,
    back: '#214f48',
    belly: '#ded1b7',
    dark: '#142320'
  }
});

Object.assign(SPECS.whoopingCrane, {
  body: { L: 0.58, rx: 0.078, ry: 0.09 },
  legH: 0.82,
  neck: { len: 0.66, r: 0.029, up: 1.9, s: true },
  wing: { len: 0.64, chord: 0.18, tipDark: true },
  coat: {
    ...SPECS.whoopingCrane.coat,
    back: '#edeae2',
    belly: '#f8f7f2',
    dark: '#1b1a18'
  }
});

export const KINDS=Object.keys(SPECS);
export const specOf=kind=>SPECS[kind]||null;
