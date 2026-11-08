import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
let session,
  notification,
  existing = null,
  failNotification = false,
  failSession = false;
mock.module('../src/config/env.js', {
  namedExports: { env: { ACCESS_TOKEN_SECRET: 'fixture-secret' } },
});
mock.module('../src/models/Session.js', {
  defaultExport: {
    findOne: async () => existing,
    create: async (value) => {
      if (failSession) throw new Error('session failure');
      session = value;
    },
  },
});
mock.module('../src/models/Notification.js', {
  defaultExport: {
    create: async (value) => {
      if (failNotification) throw new Error('notification failure');
      notification = value;
    },
  },
});
const { createLoginSession } =
  await import('../src/services/auth/loginSession.js');
const { default: jwt } = await import('jsonwebtoken');
test('password and Google logins share token/session creation and new-device notification semantics', async () => {
  const tokens = await createLoginSession(
    { _id: 'fixture-user' },
    'fixture-agent',
    '127.0.0.1'
  );
  assert.equal(
    jwt.verify(tokens.accessToken, 'fixture-secret').userId,
    'fixture-user'
  );
  assert.match(tokens.refreshToken, /^[a-f0-9]{128}$/);
  assert.equal(session.refreshToken, tokens.refreshToken);
  assert.equal(session.deviceFingerprint.length, 64);
  assert.equal(notification.type, 'login_new_device');
  existing = {};
  notification = null;
  await createLoginSession(
    { _id: 'fixture-user' },
    'fixture-agent',
    '127.0.0.1'
  );
  assert.equal(notification, null);
  existing = null;
  failNotification = true;
  await assert.doesNotReject(
    createLoginSession({ _id: 'fixture-user' }, 'fixture-agent', '127.0.0.1')
  );
  failSession = true;
  await assert.rejects(
    createLoginSession({ _id: 'fixture-user' }, 'fixture-agent', '127.0.0.1'),
    /session failure/
  );
});
