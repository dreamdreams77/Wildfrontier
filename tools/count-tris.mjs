import * as THREE from 'three';
import { makeOak, makePine, makeAcacia, makeBaobab, makeBush, makeBamboo, makeRock, makeFern, makeReeds, makeLog } from '../src/art/vegetation.js';
import { makeCabin, makeRecoveryYard, makeClinic, makeResearchLodge, makeSafariGate, makeDeck, makeBuildModel } from '../src/art/structures.js';
const tris=o=>{let t=0;o.traverse(m=>{if(m.isMesh)t+=m.geometry.index?m.geometry.index.count/3:m.geometry.attributes.position.count/3});return Math.round(t)};
const rows={oak:makeOak(1),oakLow:makeOak(1,{detail:.4}),oakMid:makeOak(1,{detail:.6}),pine:makePine(1),acacia:makeAcacia(1),baobab:makeBaobab(),bush:makeBush(1),bamboo:makeBamboo(1),rock:makeRock(1),fern:makeFern(1),reeds:makeReeds(1,5),log:makeLog(1),cabin:makeCabin(),yard:makeRecoveryYard(),clinic:makeClinic(),lodge:makeResearchLodge(),gate:makeSafariGate(),deck:makeDeck(),education:makeBuildModel('education'),pond:makeBuildModel('pond')};
for(const [k,v] of Object.entries(rows))console.log(k.padEnd(10),tris(v));
