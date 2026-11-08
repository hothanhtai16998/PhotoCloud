import test from 'node:test';
import assert from 'node:assert/strict';
import { rgbToColorName } from '../src/utils/colorNames.js';

test('RGB names retain black/white/gray, hue and brown boundary behavior',()=>{
  for(const [rgb,name] of [[[0,0,0],'black'],[[255,255,255],'white'],[[128,128,128],'gray'],[[255,0,0],'red'],[[0,255,0],'green'],[[0,0,255],'purple'],[[153,102,51],'brown']]) assert.equal(rgbToColorName(...rgb),name);
});
