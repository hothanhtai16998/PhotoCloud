import { BlockList, isIP } from 'node:net';

function normalizeAddress(value) {
  if (typeof value !== 'string') return '';
  let address = value.trim();
  const bracketed = address.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketed) address = bracketed[1];
  else if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(address))
    address = address.slice(0, address.lastIndexOf(':'));
  if (
    address.toLowerCase().startsWith('::ffff:') &&
    isIP(address.slice(7)) === 4
  )
    address = address.slice(7);
  return address;
}

/** Exact IP and CIDR rules; malformed rules deny access rather than throwing or matching accidentally. */
export function isIPAllowed(ip, allowedIPs) {
  if (!allowedIPs || allowedIPs.length === 0) return true;
  const address = normalizeAddress(ip);
  const version = isIP(address);
  if (!version) return false;
  const family = version === 4 ? 'ipv4' : 'ipv6';
  for (const rule of allowedIPs) {
    if (typeof rule !== 'string' || !rule.trim()) continue;
    try {
      const list = new BlockList();
      const parts = rule.trim().split('/');
      const network = normalizeAddress(parts[0]);
      if (isIP(network) !== version) continue;
      if (parts.length === 1) list.addAddress(network, family);
      else if (parts.length === 2 && /^\d+$/.test(parts[1])) {
        const prefix = Number(parts[1]);
        if (prefix > (version === 4 ? 32 : 128)) continue;
        list.addSubnet(network, prefix, family);
      } else continue;
      if (list.check(address, family)) return true;
    } catch {
      // Invalid administrator-supplied rules must not grant access.
    }
  }
  return false;
}
