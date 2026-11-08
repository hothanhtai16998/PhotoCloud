import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProfileFieldsUpdate } from '../src/utils/profileFields.js';
import { publicUser } from '../src/utils/publicUser.js';

test('profile partial updates preserve omitted fields, normalized comparisons and field order', () => {
  const current={bio:'same', website:'https://example.com', instagram:'alice'};
  assert.deepEqual(buildProfileFieldsUpdate(current,{bio:' same ',website:'example.com',instagram:' @alice '}),{updateData:{},changedFields:[]});
  assert.deepEqual(buildProfileFieldsUpdate(current,{bio:null,location:' Hà Nội ',phone:123,twitter:'@bob',facebook:''}),{
    updateData:{bio:undefined,location:'Hà Nội',phone:'123',twitter:'bob'},
    changedFields:['bio','location','phone','twitter'],
  });
  assert.deepEqual(buildProfileFieldsUpdate(current,{}),{updateData:{},changedFields:[]});
  assert.equal(current.bio,'same');
});

test('profile validates raw trimmed lengths before adding protocol or stripping @', () => {
  assert.equal(buildProfileFieldsUpdate({}, {website:'a'.repeat(255)}).updateData.website.length,263);
  assert.throws(()=>buildProfileFieldsUpdate({}, {instagram:'@'+'a'.repeat(30)}), /Instagram exceeds maximum length of 30/);
  assert.throws(()=>buildProfileFieldsUpdate({}, {bio:'a'.repeat(501), location:'a'.repeat(101)}), /Bio exceeds/);
  assert.equal(buildProfileFieldsUpdate({}, {website:'http://example.com'}).updateData.website,'http://example.com');
});

test('public profile serialization excludes account/private fields and provides existing defaults', () => {
  const user={_id:'id',username:'name',hashedPassword:'private',email:'private',phone:'private',permissions:{all:true}};
  const result=publicUser(user);
  for(const field of ['hashedPassword','email','phone','permissions']) assert.equal(field in result,false);
  assert.equal(result.avatarUrl,'');
  assert.deepEqual(result.pinnedImages,[]);
  assert.equal(result.username,'name');
});
