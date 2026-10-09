export const CATEGORY_NAVIGATION_EVENT = 'photoCloud:categoryNavigation';
export function notifyCategoryNavigation(category: string): void {
  window.dispatchEvent(new CustomEvent<string>(CATEGORY_NAVIGATION_EVENT, { detail: category }));
}
