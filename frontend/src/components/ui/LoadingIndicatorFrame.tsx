import React from 'react';

export interface LoadingIndicatorProps extends React.ComponentProps<'span'> {
  size?: 'small' | 'medium' | 'large';
  label?: string;
}

// Shared with pre-React startup HTML. Keep markup independent of browser state.
export function LoadingIndicatorFrame({ size = 'medium', label = 'Đang tải', className = '', ...props }: LoadingIndicatorProps) {
  return React.createElement('span', {
    role: 'status', 'aria-label': label,
    ...props, className: `pc-loading-indicator pc-loading-indicator--${size} ${className}`,
  }, ...[0, 1, 2].map(key => React.createElement('i', { key, 'aria-hidden': true })));
}
