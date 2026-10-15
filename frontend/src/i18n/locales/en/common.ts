// EN translations: common.
export const common = {

  // Common
  common: {
    loading: 'Loading...',
    error: 'An error occurred',
    success: 'Success',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving...',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    search: 'Search',
    noResults: 'No results found',
    tryAgain: 'Please try again',
    saveChanges: 'Save changes',
    create: 'Create',
    all: 'All',
    contact: 'Contact',
    optional: 'Optional',
    unknown: 'Unknown',
  },


  // Errors
  errors: {
    generic: 'An error occurred. Please try again.',
    network: 'Network error. Please check your internet connection.',
    timeout: 'Request timed out. Please try again.',
    unauthorized: 'Session expired. Please sign in again.',
    notFound: 'Resource not found.',
    server: 'Server error. Please try again later.',
    rateLimited: 'Too many requests. Please try again later.',
    imageIdError: 'Error getting image ID',
  },


  // Header
  header: {
    addImage: 'Add photo',
    favorites: 'Favorites',
    admin: 'Admin',
    about: 'About us',
    account: 'Account',
    accountSettings: 'Account settings',
    viewProfile: 'View profile',
    userMenu: 'User menu',
    toggleMenu: 'Toggle menu',
    company: 'Company',
    products: 'Products',
    community: 'Community',
    explore: 'Explore',
    legal: 'Legal',
    submitImage: 'Submit an image',
    logIn: 'Log in',
    newToPHOTOCLOUD: 'New to PHOTOCLOUD?',
    signUpFree: 'Sign up for free',
  },


  // Pagination
  pagination: {
    page: 'Page {current} / {total}',
    previous: 'Previous',
    next: 'Next',
  },


  // Theme
  theme: {
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    switchToDark: 'Switch to dark mode',
    switchToLight: 'Switch to light mode',
    toggle: 'Theme',
  },

  // Accessibility
  a11y: {
    loading: 'Loading',
    loadingImages: 'Loading images',
    loadingFavorites: 'Loading favorite photos',
    favoriteImage: 'Favorite photo: {title}',
    previousPage: 'Previous page',
    nextPage: 'Next page',
    closeMenu: 'Close menu',
  },
} as const;
