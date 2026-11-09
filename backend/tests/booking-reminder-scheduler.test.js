import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
let timerTask,config;
mock.module('../src/services/lifecycle/periodicTask.js',{namedExports:{createPeriodicTask:options=>{config=options;timerTask={start(){},stop(){}};return timerTask;}}});
let booking,notifications=0,sends=0,saves=0;
mock.module('../src/models/Booking.js',{defaultExport:{find:()=>({limit:async()=>[booking]})}});
mock.module('../src/models/Notification.js',{defaultExport:{create:async()=>notifications++}});
mock.module('../src/services/email/bookingEmails.js',{namedExports:{sendBookingEmail:async()=>sends++}});
const api=await import('../src/services/booking/bookingReminders.js');
test('booking reminder keeps its hourly schedule and sends due reminders once per saved flag',async()=>{
 assert.equal(api.startBookingReminders,timerTask.start);assert.equal(api.stopBookingReminders,timerTask.stop);assert.equal(config.intervalMs,3600000);
 booking={_id:'fixture',client:'user',bookingCode:'fixture',requestedDate:new Date(Date.now()+2*86400000),remindersSent:{},set(key,value){this.remindersSent[key.split('.')[1]]=value;},save:async()=>saves++};
 await config.run();await config.run();assert.equal(notifications,1);assert.equal(sends,1);assert.equal(saves,1);
});
