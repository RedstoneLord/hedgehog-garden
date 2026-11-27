import assert from 'node:assert/strict';
import { test } from 'node:test';
import { act, newGame, workplaces } from '../src/game.js';
import { recommendJobs } from '../src/job-fit.js';
import { DEFAULT_STATS } from '../src/orchard.js';
import { perkDescription } from '../src/perks.js';

test('recommendations and perk descriptions follow available workplaces, without guessing future jobs', () => {
  const worker = { stats:{...DEFAULT_STATS, handling:9, endurance:9}, perk:'steady' };
  let state = act({...newGame(10),apples:100_000},'unlock');
  const early = workplaces(state);
  assert.ok(recommendJobs(early,worker).every(job => ['collect','haul','scout'].includes(job.role)));
  assert.doesNotMatch(perkDescription('steady',new Set(early.flatMap(place => place.roles))), /парт|лавк/);
  state = act(state,'shopUpgrade',{id:'forestPlot'});
  state = act(state,'permit');
  state.trade.coins = 100_000;
  state = act(state,'placeMarket',{point:{x:1300,y:1340}});
  state = act(state,'unlockProduction');
  state = act(state,'buildIndustry',{kind:'workshop',point:{x:1160,y:1250}});
  const built = workplaces(state);
  const labels = recommendJobs(built,worker).map(job => job.label);
  assert.ok(labels.includes('Готовка в мастерской') && labels.includes('Продажа в лавке'));
  assert.match(perkDescription('steady',new Set(built.flatMap(place => place.roles))), /8% меньше времени на партию/);
  assert.ok(labels.every(label => !/фабрик|лаборатор|трактор/.test(label)));
  state.industry.workshops[0].level = 3;
  assert.ok(recommendJobs(workplaces(state),worker).some(job => job.key === 'factory'));
  assert.ok(recommendJobs(workplaces(state),{...worker,perk:null}).every(job => job.key !== 'factory'));
});
