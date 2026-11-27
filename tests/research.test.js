import assert from 'node:assert/strict';
import { test } from 'node:test';
import { act, advance, importGame, newGame, rerollPrice, workerWorkplace } from '../src/game.js';
import { adjustStock, stockCount } from '../src/industry.js';
import { advanceScientist, depositScientist, researchUnlocked, SCIENTIST_GOODS, SCIENTIST_PRICE, scientistReady, scientistStall } from '../src/commission.js';
import { advanceResearch, PROJECTS, powerNetworks, researchBuildSite } from '../src/research.js';
import { RETIRE_WINDOW } from '../src/development.js';
import { uniqueWork, workerPerks } from '../src/perks.js';

function established() {
  let state = act({ ...newGame(1701), apples:100_000 },'unlock');
  state = act(state,'shopUpgrade',{id:'forestPlot'});
  state = act(state,'permit');
  state.trade.coins = 20_000;
  state = act(state,'unlockProduction');
  state = act(state,'placeMarket',{point:{x:1300,y:1340}});
  assert.equal(state.trade.stalls.length,1);
  state.trade.coins = 9_999;
  return state;
}
function withResearch() {
  let state = established();
  state.trade.coins = 31_000;
  state = advance(state,85);
  state = act(state,'acceptScientist',{stallId:state.trade.stalls[0].id});
  for (const [key,amount] of Object.entries(SCIENTIST_GOODS)) depositScientist(state,key,amount,state.trade.stalls[0]);
  return act(state,'completeScientist');
}
const roundtrip = state => importGame(JSON.stringify(state));

test('the oldest stall hosts a remote commission and only final payment unlocks research', () => {
  let state = established();
  assert.equal(advance(state,85).scientist,undefined);
  state.trade.coins += 1;
  state = advance(state,85);
  assert.equal(state.scientist.stage,'offered');
  const stall = scientistStall(state);
  assert.ok(stall);
  assert.equal(act(state,'acceptScientist',{stallId:stall.id + 1}),state);
  assert.equal(act(state,'startChallenge',{type:'math',difficulty:1}),state);
  state = act(state,'acceptScientist',{stallId:stall.id});
  state = act(state,'supplyScientist',{key:'apples'});
  assert.equal(state.scientist.bank.apples,250);
  assert.equal(researchUnlocked(state),false);
  let sharedStall = scientistStall(state);
  sharedStall.customers = [{phase:'queue'}];
  depositScientist(state,'berries',120,sharedStall);
  assert.equal(state.scientist.bank.berries,undefined);
  assert.equal(state.scientist.intake.berries,120);
  advanceScientist(state,sharedStall.id);
  assert.equal(state.scientist.bank.berries,120);
  sharedStall.customers = [];
  for (const [key,amount] of Object.entries(SCIENTIST_GOODS)) depositScientist(state,key,amount - (state.scientist.bank[key] ?? 0),sharedStall);
  assert.equal(Object.values(state.scientist.bank).reduce((a,b) => a+b),65_500);
  assert.ok(scientistReady(state));
  assert.equal(act(state,'completeScientist'),state);
  state = roundtrip(state);
  assert.ok(state);
  state.trade.coins = SCIENTIST_PRICE;
  state = act(state,'completeScientist');
  assert.equal(state.trade.coins,0);
  assert.equal(act(state,'completeScientist'),state);
  assert.equal(researchUnlocked(state),true);
});

test('one starter challenge gives RP only and either tutorial project can be purchased before a grid exists', () => {
  for (const [key, difficulty] of [['irrigation',1],['electricity',2]]) {
    let state = withResearch();
    assert.equal(state.trade.coins,6_000);
    state = act(state,'startChallenge',{type:'math',difficulty});
    assert.equal(act(state,'solveChallenge',{guess:-1}),state);
    state = act(state,'solveChallenge',{guess:state.research.challenge.answer});
    assert.equal(state.trade.coins,6_000);
    assert.equal(state.research.rp,difficulty === 1 ? 4 : 7);
    const [, , , , rp,price,goods] = PROJECTS[key];
    for (const [item,amount] of Object.entries(goods)) adjustStock(state,item,amount);
    const before = state.research.rp;
    state = act(state,'buyResearch',{key});
    assert.equal(state.research.rp,before-rp);
    assert.equal(state.trade.coins,6_000-price);
    assert.deepEqual(state.research.projects,[key]);
    assert.equal(act(state,'buyResearch',{key}),state);
  }
});

test('idle generators keep fuel, loaded networks distribute shortages equally, and networks stay independent', () => {
  const state = withResearch();
  state.research = {rp:0,projects:['irrigation','electricity'],sites:[
    {id:'research:1',kind:'generator',x:100,y:100,fuel:'coal',stock:{coal:2},charge:0,wear:0},
    {id:'research:2',kind:'pump',x:120,y:100},
    {id:'research:3',kind:'pump',x:140,y:100},
    {id:'research:4',kind:'pump',x:160,y:100},
    {id:'research:5',kind:'pump',x:180,y:100},
    {id:'research:6',kind:'pump',x:930,y:100},
    {id:'research:7',kind:'pole',x:940,y:120},
  ]};
  const [generator,...sites] = state.research.sites;
  const dry = () => {};
  advanceResearch(state,1,null,dry);
  assert.equal(powerNetworks(state).length,2);
  assert.deepEqual(sites.slice(0,4).map(site => site.power),[.75,.75,.75,.75]);
  assert.equal(sites[4].power,0);
  assert.equal(generator.stock.coal,1);
  assert.equal(generator.residual.coal,21);
  state.research.sites = [generator];
  advanceResearch(state,7,null,dry);
  assert.equal(generator.residual.coal,21);
  assert.equal(generator.wear,1);
  assert.ok(roundtrip(state));
});

test('generator repairs consume materials and fuel switches preserve a partially used load', () => {
  let state = withResearch();
  state.research = {rp:0,projects:['electricity'],sites:[{id:'research:1',kind:'generator',x:100,y:100,fuel:'coal',stock:{},charge:0,wear:280,broken:true,residual:{coal:4}}]};
  assert.equal(act(state,'repairGenerator',{id:'research:1'}),state);
  adjustStock(state,'coal',8);
  state = act(state,'repairGenerator',{id:'research:1'});
  assert.equal(stockCount(state,'coal'),0);
  assert.equal(state.research.sites[0].broken,false);
  state = act(state,'selectFuel',{id:'research:1',key:'fuel'});
  state = act(state,'selectFuel',{id:'research:1',key:'coal'});
  assert.equal(state.research.sites[0].residual.coal,4);
});

test('rerolls cost apples, accumulate across reloads, and clear after recruitment', () => {
  let state = established();
  state = act(state,'previewRecruit');
  const first = state.recruitOffer.id;
  const charge = rerollPrice(state);
  const apples = state.apples;
  state = act(state,'rerollRecruit');
  assert.equal(state.apples,apples-charge);
  assert.notEqual(state.recruitOffer.id,first);
  const next = rerollPrice(state);
  assert.ok(next > charge);
  state = roundtrip(state);
  assert.equal(rerollPrice(state),next);
  state = act(state,'recruit');
  assert.equal(state.recruitRerollSpend,undefined);
  assert.equal(state.workers.length,2);
});

test('a trained worker keeps original stats and their assignment can be restored from a favorite preset', () => {
  let state = withResearch();
  const point = {x:1160,y:1250};
  const worker = state.workers[0];
  const id = worker.id;
  const place = workerWorkplace(worker);
  worker.x = point.x; worker.y = point.y;
  worker.stats.speed = 19;
  state.research = {rp:0,projects:['irrigation','training','advancedCourses'],sites:[{id:'research:1',kind:'trainer',...point}]};
  state = act(state,'favorite',{id});
  state = act(state,'saveCrew',{name:'До тренировок'});
  adjustStock(state,'provisions',40);
  state = act(state,'startTraining',{id,siteId:'research:1',stat:'speed'});
  assert.ok(state.workers[0].train);
  state = advance(state,85);
  state = roundtrip(state);
  state = advance(state,state.workers[0].train.duration + 100);
  assert.equal(state.workers[0].originalStats.speed,19);
  assert.equal(state.workers[0].stats.speed,20);
  assert.equal(state.workers[0].stayAt,'research:1');
  assert.equal(act(state,'startTraining',{id,siteId:'research:1',stat:'speed'}),state);
  state = act(state,'favorite',{id});
  state = act(state,'assignCrew',{name:'До тренировок'});
  assert.equal(state.workers[0].stayAt,undefined);
  assert.equal(workerWorkplace(state.workers[0]),place);
  assert.deepEqual(state.favorites,[id]);
});

test('retirement preserves a reclaim deadline across saves and expired workers leave a recorded name', () => {
  let state = withResearch();
  const { id,name } = state.workers[0];
  const now = Date.now();
  state = act(state,'retireWorker',{id,now});
  assert.equal(state.workers.length,0);
  state = roundtrip(state);
  assert.equal(state.lodge.waiting[0].until,now+RETIRE_WINDOW);
  state = act(state,'retrieveWorker',{id,now:now + RETIRE_WINDOW-1});
  assert.equal(state.workers.length,1);
  state = act(state,'retireWorker',{id,now:now - RETIRE_WINDOW-1000});
  state = roundtrip(state);
  assert.deepEqual(state.lodge.names,[name]);
  assert.equal(act(state,'retrieveWorker',{id,now}),state);
});

test('an operating lab and manual puzzle earn independently during an 80% brownout', () => {
  let state = withResearch();
  state = act(state,'recruit');
  state = act(state,'recruit');
  const generator = {id:'research:1',kind:'generator',x:1150,y:1250,fuel:'coal',stock:{coal:6},charge:0,wear:0};
  const labs = state.workers.map((worker,index) => ({id:`research:${index+2}`,kind:'lab',x:1220 + 40*index,y:1250}));
  state.research = {rp:0,projects:['electricity'],sites:[generator,...labs]};
  labs.forEach((lab,index) => {
    const id = state.workers[index].id;
    state = act(state,'assignWorkplace',{id,place:lab.id});
    Object.assign(state.workers[index],{x:lab.x,y:lab.y});
  });
  state = act(state,'startChallenge',{type:'logic',difficulty:1});
  state = advance(state,15_001);
  assert.deepEqual(state.research.sites.slice(1).map(lab => lab.power),[.8,.8,.8]);
  assert.equal(state.research.rp,3);
  state = act(state,'solveChallenge',{guess:state.research.challenge.answer});
  assert.equal(state.research.rp,7);
});

test('offspring are rolled once, reserve housing, and retain valid stats and perks after a reload', () => {
  let state = act(withResearch(),'recruit');
  const site = {id:'research:1',kind:'mating',x:1160,y:1250};
  state.research = {rp:0,projects:['irrigation','training','mating'],sites:[site]};
  for (const worker of state.workers) Object.assign(worker,{x:site.x,y:site.y});
  adjustStock(state,'provisions',10);
  const [first,second] = state.workers.map(worker => worker.id);
  state = act(state,'startPairing',{siteId:site.id,first,second});
  assert.equal(state.pairingJobs.length,1);
  const expected = state.pairingJobs[0].result;
  state = roundtrip(advance(state,85));
  state = advance(state,90_001);
  const child = state.workers.find(worker => ![first,second].includes(worker.id));
  assert.ok(child);
  assert.deepEqual(child.stats,expected.stats);
  assert.deepEqual(workerPerks(child),expected.perks);
  assert.ok(Object.values(child.stats).every(value => value >= 1 && value <= 20));
});

test('a fourth earned Unique can replace an existing perk and is not awarded again', () => {
  let state = withResearch();
  const worker = state.workers[0];
  worker.perks = ['lightning','mountain','star'];
  state.perkRandom = 634785765;
  uniqueWork(state,worker,'researcher');
  assert.deepEqual(worker.pendingPerks,['brightSpark']);
  assert.equal(state.perkReveals.length,1);
  state = act(state,'replacePerk',{id:worker.id,earn:'brightSpark',replace:'mountain'});
  assert.deepEqual(workerPerks(state.workers[0]),['lightning','brightSpark','star']);
  uniqueWork(state,state.workers[0],'researcher');
  assert.equal(state.perkReveals.length,1);
});

test('a loaded commission tractor survives stall removal and returns cargo once when no stall remains', () => {
  let state = established();
  state.trade.coins = 31_000;
  state = advance(state,85);
  const stall = scientistStall(state);
  state = act(state,'acceptScientist',{stallId:stall.id});
  state = act(state,'buildIndustry',{kind:'tractor',point:{x:1500,y:1380}});
  const vehicle = state.industry.tractors[0];
  assert.ok(vehicle);
  state = act(state,'assignWorkplace',{id:state.workers[0].id,place:vehicle.id});
  state.industry.tractors[0].tank = 10;
  const start = stockCount(state,'apples');
  for (let tick = 0; tick < 220 && !state.industry.tractors[0].trip?.loaded; tick++) state = advance(state,100);
  assert.ok(state.industry.tractors[0].trip?.loaded);
  assert.ok(stockCount(state,'apples') < start);
  state = roundtrip(state);
  assert.ok(state?.industry.tractors[0].trip.loaded);
  state = act(state,'removeMarket',{stallId:stall.id});
  for (let tick = 0; tick < 220 && state.industry.tractors[0].trip; tick++) state = advance(state,100);
  assert.equal(stockCount(state,'apples'),start);
  assert.deepEqual(state.scientist.bank,{});
});

test('late infrastructure supports an 18-hedgehog preset and a simulated power cycle at six steps per tick', () => {
  let state = withResearch();
  state.trade.coins = 100_000;
  const locations = [{x:1370,y:1110},{x:1175,y:925}];
  for (const point of locations) state = act(state,'buildIndustry',{kind:'house',point});
  state.apples = 1_000_000;
  for (let index = state.workers.length; index < 18; index++) state = act(state,'recruit');
  assert.equal(state.workers.length,18);
  assert.ok(researchBuildSite(state,'lab',{x:1160,y:1250}));
  state = act(state,'buildResearch',{kind:'lab',point:{x:1160,y:1250}});
  state = act(state,'saveCrew',{name:'Большой сад'});
  state.research.projects.push('electricity');
  state = act(state,'buildResearch',{kind:'generator',point:{x:1200,y:1150}});
  const [lab,generator] = state.research.sites;
  const id = state.workers[0].id;
  state = act(state,'assignWorkplace',{id,place:lab.id});
  Object.assign(state.workers[0],{x:lab.x,y:lab.y});
  adjustStock(state,'coal',12);
  state = act(state,'carryFuel',{id:generator.id});
  for (let cycle = 0; cycle < 45; cycle++) for (let step = 0; step < 6; step++) state = advance(state,85);
  assert.ok(state.research.rp >= 1);
  state = roundtrip(state);
  state = act(state,'assignCrew',{name:'Большой сад'});
  assert.equal(state.workers.length,18);
  assert.equal(workerWorkplace(state.workers[0]),state.orchards[0].id);
});
