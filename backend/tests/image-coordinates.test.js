import test from 'node:test';
import assert from 'node:assert/strict';
import { parseImageCoordinates } from '../src/utils/imageCoordinates.js';
test('image coordinates accept zero, JSON upload input and boundary values',()=>{
 for(const value of [{latitude:0,longitude:0},{latitude:'0',longitude:'180'},{latitude:-90,longitude:-180}]){
  const expected={latitude:parseFloat(value.latitude),longitude:parseFloat(value.longitude)};
  assert.deepEqual(parseImageCoordinates(value),expected);assert.deepEqual(parseImageCoordinates(JSON.stringify(value)),expected);
 }
});
test('image coordinates reject missing, malformed and out-of-range input',()=>{
 for(const value of [null,undefined,'{',[],{}, {latitude:null,longitude:0},{latitude:'',longitude:0},{latitude:91,longitude:0},{latitude:0,longitude:-181},{latitude:Infinity,longitude:0}])assert.equal(parseImageCoordinates(value),undefined);
});
