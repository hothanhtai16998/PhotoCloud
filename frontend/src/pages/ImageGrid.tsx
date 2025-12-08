/**
 * ImageGrid - Re-exports from refactored module
 * 
 * The ImageGrid has been refactored into smaller, more maintainable pieces:
 * - ImageGrid/ImageGrid.tsx - Main component
 * - ImageGrid/hooks/useImageGridState.ts - Image fetching and filtering
 * - ImageGrid/hooks/useImageGridModal.ts - Modal state management
 * - ImageGrid/hooks/useImageGridCategory.ts - Category management
 * - ImageGrid/hooks/useImageGridColumns.ts - Responsive columns
 * 
 * This file maintains backward compatibility for existing imports.
 */

export { default } from './ImageGrid/ImageGrid';
