/** Auth identifiers deliberately retain the existing false/empty input behavior. */
export const normalizeAccountIdentifier = (value) =>
  value ? String(value).toLowerCase().trim() : undefined;
