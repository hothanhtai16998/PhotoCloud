import { createContext, useContext } from 'react';
import { t as publicTranslation } from '@/i18n';

export type UploadTranslator = (key: string, params?: Record<string, string | number>, fallback?: string) => string;
export interface UploadLocale { translate: UploadTranslator; language?: 'vi' | 'en' }
export const defaultUploadTranslation: UploadTranslator = (key, params, fallback) => fallback === undefined
  ? publicTranslation(key, params)
  : fallback.replace(/\{([^{}]+)\}/g, (token, name: string) => params && name in params ? String(params[name]) : token);
export const UploadLocaleContext = createContext<UploadLocale>({ translate: defaultUploadTranslation });
export function useUploadTranslation(): UploadTranslator { return useContext(UploadLocaleContext).translate; }
export function useUploadLanguage(): 'vi' | 'en' | undefined { return useContext(UploadLocaleContext).language; }
