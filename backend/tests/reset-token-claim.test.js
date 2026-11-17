import test from 'node:test';
import assert from 'node:assert/strict';
import PasswordResetToken from '../src/models/PasswordResetToken.js';

test('token consumption requires unused state and future expiry in the atomic update',async()=>{
 let received;
 const before=Date.now();
 const result=await PasswordResetToken.schema.statics.consumeToken.call({findOneAndUpdate:(...args)=>{received=args;return 'claimed';}},'fixture');
 assert.equal(result,'claimed');
 const [filter,update,options]=received;
 assert.equal(filter._id,'fixture');assert.equal(filter.usedAt,null);
 assert.ok(filter.expiresAt.$gt instanceof Date);assert.ok(filter.expiresAt.$gt.getTime()>=before);
 assert.ok(update.$set.usedAt instanceof Date);assert.equal(options.new,true);
});
