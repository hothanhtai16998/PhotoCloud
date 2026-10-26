import test from 'node:test';
import assert from 'node:assert/strict';
import { readRequestedTime } from '../src/utils/bookingTime.js';
test('old time slots and flexible requests remain supported',()=>{
    assert.deepEqual(readRequestedTime(undefined,'afternoon'),{time:undefined,slot:'afternoon'});
    assert.deepEqual(readRequestedTime('','flexible'),{time:undefined,slot:'flexible'});
});
test('exact preferred time is preserved and period derived',()=>{
    assert.deepEqual(readRequestedTime('08:00','flexible'),{time:'08:00',slot:'morning'});
    assert.deepEqual(readRequestedTime('14:30','morning'),{time:'14:30',slot:'afternoon'});
    assert.deepEqual(readRequestedTime('23:30','flexible'),{time:'23:30',slot:'evening'});
});
test('reject malformed times before writes',()=>{
    for(const value of ['24:00','08:60','8:00','2026-10-26T08:00Z',null,800,'<script>'])assert.ok(readRequestedTime(value,'flexible').error);
});
