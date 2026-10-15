import test from 'node:test';
import assert from 'node:assert/strict';
import Booking from '../src/models/Booking.js';
import BookingPolicy from '../src/models/BookingPolicy.js';
import Notification from '../src/models/Notification.js';
import mongoose from 'mongoose';
const originalFindOne = mongoose.Model.findOne;
mongoose.Model.findOne = function(...args) { if (this.modelName === 'Settings') return Promise.resolve({ value: { smtpEnabled: false } }); return originalFindOne.apply(this,args); };
const { requestReschedule, cancelMyBooking } = await import('../src/controllers/bookingController.js');
mongoose.Model.findOne = originalFindOne;
const invoke=(handler,body={})=>new Promise((resolve,reject)=>{const res={code:200,status(code){this.code=code;return this;},json(data){resolve({code:this.code,...data});}};handler({params:{bookingId:'fixture'},user:{_id:'fixture-user'},body},res,reject);});
test('controllers enforce policy and persist weather requests without changing confirmed schedule',async()=>{
 const originals=[Booking.findOne,BookingPolicy.findOne,Notification.create];let saved=0;let policy={allowClientCancellation:false,allowOneReschedule:false,weatherRescheduleAllowed:true,rescheduleDeadlineHours:24};const booking={status:'confirmed',confirmedDate:new Date('2099-10-20'),confirmedStartTime:'09:00',statusHistory:[],client:'fixture-user',_id:'fixture',bookingCode:'PC-TEST',save:async()=>{saved++;}};
 Booking.findOne=async()=>booking;BookingPolicy.findOne=()=>({lean:async()=>policy});Notification.create=async()=>({});
 try {
  assert.equal((await invoke(cancelMyBooking)).code,409);assert.equal(saved,0);
  assert.equal((await invoke(requestReschedule,{requestedDate:'2099-10-21',requestedTimeSlot:'morning',reason:'personal'})).code,409);
  assert.equal((await invoke(requestReschedule,{requestedDate:'2099-10-21',requestedTimeSlot:'morning',reason:'weather'})).code,400);
  const result=await invoke(requestReschedule,{requestedDate:'2099-10-21',requestedTimeSlot:'morning',reason:'weather',note:'Mưa lớn ở địa điểm chụp'});assert.equal(result.code,200);assert.equal(booking.rescheduleRequest.reason,'weather');assert.equal(booking.status,'confirmed');assert.equal(booking.confirmedDate.toISOString().slice(0,10),'2099-10-20');assert.equal(saved,1);
  assert.equal((await invoke(requestReschedule,{requestedDate:'2099-10-22',requestedTimeSlot:'morning',reason:'weather',note:'Mưa'})).code,409);
 } finally {[Booking.findOne,BookingPolicy.findOne,Notification.create]=originals;}
});
