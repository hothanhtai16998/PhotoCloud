import { useMemo, type ReactNode } from 'react';
import { UploadLocaleContext, defaultUploadTranslation, type UploadTranslator } from './UploadTranslationContext';

export function UploadLocaleProvider({ translate, language, children }: { translate?: UploadTranslator; language?: 'vi' | 'en'; children: ReactNode }) {
  const value = useMemo(() => ({ translate: translate || defaultUploadTranslation, language }), [translate, language]);
  return <UploadLocaleContext.Provider value={value}>{children}</UploadLocaleContext.Provider>;
}
