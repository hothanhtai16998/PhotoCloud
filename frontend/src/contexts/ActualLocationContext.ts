import { createContext } from 'react';
import type { Location } from 'react-router-dom';

export const ActualLocationContext = createContext<Location | null>(null);
export const BackgroundRouteContext = createContext(false);
// Only the explicit overlay route may render a photo as a dialog.
export const ImagePresentationContext = createContext<'page' | 'modal'>('page');
