import test from 'node:test';
import assert from 'node:assert/strict';
import { isIPAllowed } from '../src/utils/ipAccessRules.js';
test('IP access rules cover exact matches, IPv4/IPv6 CIDR boundaries and mapped/port forms', () => {
  for (const [ip, rules, allowed] of [
    ['192.168.1.3', ['192.168.1.0/24'], true],
    ['192.168.2.3', ['192.168.1.0/24'], false],
    ['192.168.1.3:443', ['192.168.1.3'], true],
    ['::ffff:192.168.1.3', ['192.168.1.0/24'], true],
    ['2001:db8::1', ['2001:db8::/32'], true],
    ['2001:db9::1', ['2001:db8::/32'], false],
    ['[2001:db8::1]:443', ['2001:db8::1'], true],
    ['::1', ['0:0:0:0:0:0:0:1'], true],
    ['8.8.8.8', ['0.0.0.0/0'], true],
    ['8.8.8.8', ['8.8.8.8/32'], true],
    ['1.2.3.4', ['1.2.3.0/99', '1.2.3.4/nope', 'garbage', null], false],
    ['1.2.3.4', ['999.2.3.4/24'], false],
    ['invalid', ['0.0.0.0/0'], false],
    ['1.2.3.4', [], true],
  ])
    assert.equal(isIPAllowed(ip, rules), allowed, JSON.stringify([ip, rules]));
});
