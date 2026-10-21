import { useId, useState, type ReactNode } from 'react';
import './IconTooltip.css';

interface IconTooltipProps {
  /** Nội dung chú thích hiện khi hover/focus. */
  label: string;
  children: ReactNode;
  /** Vị trí tooltip so với trigger. */
  side?: 'top' | 'bottom';
}

/**
 * Bọc control icon-only để hiện tên khi hover/focus.
 * CSS thuần, không portal/dependency — chỉ dùng cho nhãn ngắn.
 *
 * Quan trọng: nếu trigger có `title`, browser sẽ tự thêm native tooltip
 * đen. IconTooltip không can thiệp được điều đó — caller phải bỏ `title`
 * (giữ aria-label) để không hiện hai tooltip chồng nhau.
 */
export function IconTooltip({ label, children, side = 'bottom' }: IconTooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className={`icon-tooltip-wrap icon-tooltip-${side}${open ? ' is-open' : ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <span role="tooltip" id={id} className="icon-tooltip">
        {label}
      </span>
    </span>
  );
}