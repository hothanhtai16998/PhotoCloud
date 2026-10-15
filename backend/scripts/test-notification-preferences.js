import assert from 'node:assert/strict';
import { buildNotificationPreferencesUpdate as build } from '../src/utils/notificationPreferences.js';

// Separate requests must address separate leaf fields, preserving sibling choices.
assert.deepEqual(build({ email: { comments: false } }), {
    'notificationPreferences.email.comments': false,
});
assert.deepEqual(build({ email: { likes: false }, push: { follows: true } }), {
    'notificationPreferences.email.likes': false,
    'notificationPreferences.push.follows': true,
});
assert.deepEqual(build({ email: { newsletters: true }, push: { newsletters: true, bookings: false } }), {
    'notificationPreferences.email.newsletters': true,
    'notificationPreferences.push.bookings': false,
});
for (const body of [null, [], { email: [] }, { push: null }, { email: { likes: 'false' } },
    { push: { newsletters: true } }, { email: { 'comments.foo': true, $set: true } }]) {
    assert.throws(() => build(body));
}
console.log('Notification preferences regression PASS');
