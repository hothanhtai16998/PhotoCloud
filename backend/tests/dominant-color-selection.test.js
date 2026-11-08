import test from 'node:test';
import assert from 'node:assert/strict';
import { selectDominantColors } from '../src/utils/dominantColorSelection.js';
test('dominant color selection retains different white/black thresholds and fill order',()=>{
 const counts=new Map([['red',81],['white',10],['blue',9]]);
 assert.deepEqual(selectDominantColors(counts,['red','white'],3,0.12),['red','blue']);
 assert.deepEqual(selectDominantColors(counts,['red','white'],3,0.08),['red','white']);
 assert.deepEqual(selectDominantColors(new Map(),[],3,0.12),[]);
});
