import { useMemo } from 'react';

interface UseFormattedDateOptions {
  locale?: string;
  format?: 'short' | 'medium' | 'long' | 'full';
  includeTime?: boolean;
}

/**
 * Custom hook for formatting dates consistently across the application
 * @param date - Date string or Date object
 * @param options - Formatting options
 * @returns Formatted date string or null if date is invalid
 */
export function useFormattedDate(
  date: string | Date | null | undefined,
  options: UseFormattedDateOptions = {}
): string | null {
  const {
    locale = 'vi-VN',
    format = 'long',
    includeTime = false,
  } = options;

  return useMemo(() => {
    if (!date) return null;

    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;

      if (isNaN(dateObj.getTime())) {
        return null;
      }

      const formatOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: format === 'short' ? 'short' : 'long',
        day: 'numeric',
      };

      if (includeTime) {
        formatOptions.hour = 'numeric';
        formatOptions.minute = '2-digit';
      }

      return dateObj.toLocaleDateString(locale, formatOptions);
    } catch (error) {
      console.error('Error formatting date:', error);
      return null;
    }
  }, [date, locale, format, includeTime]);
}

