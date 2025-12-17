/**
 * Shared type definitions for React refs
 * 
 * Note: useRef<T>(null) always creates RefObject<T | null>
 * Always use these types when accepting refs in props/interfaces
 */

export type DivRef = React.RefObject<HTMLDivElement | null>;
export type ButtonRef = React.RefObject<HTMLButtonElement | null>;
export type InputRef = React.RefObject<HTMLInputElement | null>;
export type FormRef = React.RefObject<HTMLFormElement | null>;
export type ImageRef = React.RefObject<HTMLImageElement | null>;
export type AnchorRef = React.RefObject<HTMLAnchorElement | null>;
export type TextAreaRef = React.RefObject<HTMLTextAreaElement | null>;
export type SelectRef = React.RefObject<HTMLSelectElement | null>;

/**
 * Generic ref type helper
 */
export type ElementRef<T extends HTMLElement> = React.RefObject<T | null>;

