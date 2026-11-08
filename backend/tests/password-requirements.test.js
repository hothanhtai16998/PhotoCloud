import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
let record;
let fail=false;
mock.module('../src/models/Settings.js',{defaultExport:{findOne:async()=>{if(fail)throw new Error('offline');return record;}}});
mock.module('../src/utils/logger.js',{namedExports:{logger:{warn(){}}}});
const {getPasswordRequirements}=await import('../src/services/auth/passwordRequirements.js');
test('shared password requirements preserve defaults, false flags and database-error fallback',async()=>{
 const defaults={minLength:8,requireUppercase:true,requireLowercase:true,requireNumber:true,requireSpecialChar:false};
 assert.deepEqual(await getPasswordRequirements(),defaults);
 record={value:{passwordMinLength:12,passwordRequireUppercase:false,passwordRequireNumber:false,passwordRequireSpecialChar:true}};
 assert.deepEqual(await getPasswordRequirements(),{...defaults,minLength:12,requireUppercase:false,requireNumber:false,requireSpecialChar:true});
 fail=true;
 assert.deepEqual(await getPasswordRequirements(),defaults);
});
