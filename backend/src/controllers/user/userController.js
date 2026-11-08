// Stable entry point for existing routes and external imports.
export { searchUsers, authMe, getUserByUsername, getUserById } from './userDirectoryController.js';
export { changePassword, forgotPassword, resetPassword } from './userPasswordController.js';
export { changeInfo } from './userProfileController.js';
export { getUserStats, trackProfileView } from './userStatsController.js';
export { pinImage, unpinImage, getPinnedImages, reorderPinnedImages } from './userPinnedImagesController.js';
export { getDownloadHistory, getNotificationPreferences, updateNotificationPreferences } from './userPreferencesController.js';
