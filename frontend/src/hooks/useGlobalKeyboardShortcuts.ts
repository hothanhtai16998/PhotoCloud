import { useEffect, useRef } from 'react';

interface UseGlobalKeyboardShortcutsOptions {
  onFocusSearch?: () => void;
  isModalOpen?: boolean;
}

/**
 * Global keyboard shortcuts hook for the entire app
 * Handles shortcuts that work outside of modals (like / for search)
 */
export const useGlobalKeyboardShortcuts = ({
  onFocusSearch,
  isModalOpen = false,
}: UseGlobalKeyboardShortcutsOptions) => {
  const isModalOpenRef = useRef(isModalOpen);

  useEffect(() => {
    isModalOpenRef.current = isModalOpen;
  }, [isModalOpen]);

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // Don't handle shortcuts if modal is open or user is typing
      if (isModalOpenRef.current || isInputFocused) {
        return;
      }

      // Focus search with / key
      if (e.key === '/' && onFocusSearch) {
        e.preventDefault();
        onFocusSearch();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyboard);
    return () => {
      document.removeEventListener('keydown', handleKeyboard);
    };
  }, [onFocusSearch]);
};

