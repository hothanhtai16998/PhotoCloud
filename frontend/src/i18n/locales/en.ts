import { common } from './en/common';
import { account } from './en/account';
import { gallery } from './en/gallery';
import { admin } from './en/admin';

// Keep the public locale API stable; edit domain files instead.
export const en = {
  ...common,
  ...account,
  ...gallery,
  ...admin,
} as const;
