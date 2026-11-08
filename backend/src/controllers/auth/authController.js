// Stable auth entry point. Implementations are grouped by login mechanism.
export {
  checkEmailAvailability,
  checkUsernameAvailability,
  signUp,
  signIn,
} from './credentialsController.js';
export { googleAuth, googleCallback } from './googleAuthController.js';
export {
  signOut,
  refreshToken,
  getActiveSessions,
  signOutAllDevices,
  signOutSession,
} from './sessionController.js';
