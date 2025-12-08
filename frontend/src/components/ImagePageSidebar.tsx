import { Home, ImageIcon, Bookmark, Download, User, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Slim left sidebar for the ImagePage, inspired by Unsplash.
 * Shown only on desktop in full-page mode.
 */
const ImagePageSidebar = () => {
  const navigate = useNavigate();

  const iconButtonClass =
    'flex h-10 w-10 items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors';

  return (
    <aside className="image-page-sidebar hidden md:flex">
      {/* Top logo / home */}
      <button
        type="button"
        className={iconButtonClass}
        aria-label="Trang chủ"
        onClick={() => navigate('/')}
      >
        <Home className="h-5 w-5" />
      </button>

      {/* Middle actions (placeholders for now) */}
      <div className="flex flex-col items-center gap-4">
        <button type="button" className={iconButtonClass} aria-label="Ảnh">
          <ImageIcon className="h-5 w-5" />
        </button>
        <button type="button" className={iconButtonClass} aria-label="Bộ sưu tập">
          <Bookmark className="h-5 w-5" />
        </button>
        <button type="button" className={iconButtonClass} aria-label="Tải xuống">
          <Download className="h-5 w-5" />
        </button>
      </div>

      {/* Bottom user / menu */}
      <div className="flex flex-col items-center gap-4">
        <button type="button" className={iconButtonClass} aria-label="Tài khoản">
          <User className="h-5 w-5" />
        </button>
        <button type="button" className={iconButtonClass} aria-label="Menu">
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </aside>
  );
};

export default ImagePageSidebar;


