let version = 0;
export const getAuthSessionVersion = (): number => version;
export const invalidateAuthSession = (): number => ++version;
