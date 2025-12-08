import { createContext } from 'react';
import type { Location } from 'react-router-dom';

export const ActualLocationContext = createContext<Location | null>(null);
