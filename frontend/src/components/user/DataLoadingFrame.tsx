import React from 'react';

export interface DataLoadingProps {
  message?: string;
  size?: 'section' | 'compact' | 'inline';
}

// Also rendered into public startup HTML; keep this frame free of browser state.
export function DataLoadingFrame({ message = 'Đang tải dữ liệu', size = 'section' }: DataLoadingProps) {
  return React.createElement('div', { className: `user-data-loading user-data-loading--${size}`, role: 'status' },
    React.createElement('p', null, message),
    React.createElement('span', { className: 'user-data-loading-track', 'aria-hidden': true },
      React.createElement('span')));
}
