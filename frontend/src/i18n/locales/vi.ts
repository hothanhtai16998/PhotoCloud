import { common } from './vi/common';
import { account } from './vi/account';
import { gallery } from './vi/gallery';
import { admin } from './vi/admin';

// Keep the public locale API stable; edit domain files instead.
export const vi = {
  ...common,
  ...account,
  ...gallery,
  ...admin,
} as const;

export type TranslationKeys = typeof vi;
