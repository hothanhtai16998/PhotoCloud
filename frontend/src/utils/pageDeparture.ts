let departing = false;
let version = 0;

export const isPageDeparting = (): boolean => departing;
export const getPageDepartureVersion = (): number => version;

export function setPageDeparting(value: boolean): void {
  if (value && !departing) version++;
  departing = value;
  if (typeof document !== 'undefined') document.documentElement.toggleAttribute('data-page-departing', value);
}
