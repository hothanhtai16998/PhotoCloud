// VI translations: common.
export const common = {

  // Common
  common: {
    loading: 'Đang tải...',
    error: 'Đã xảy ra lỗi',
    success: 'Thành công',
    cancel: 'Huỷ',
    save: 'Lưu',
    saving: 'Đang lưu...',
    delete: 'Xóa',
    edit: 'Chỉnh sửa',
    close: 'Đóng',
    confirm: 'Xác nhận',
    back: 'Quay lại',
    next: 'Tiếp theo',
    previous: 'Trước',
    search: 'Tìm kiếm',
    noResults: 'Không có kết quả',
    tryAgain: 'Vui lòng thử lại',
    saveChanges: 'Lưu thay đổi',
    create: 'Tạo',
    all: 'Tất cả',
    contact: 'Liên hệ',
    optional: 'Tùy chọn',
    show: 'Hiện',
    hide: 'Ẩn',
    done: 'Xong',
  },


  // Errors
  errors: {
    generic: 'Đã xảy ra lỗi. Vui lòng thử lại.',
    network: 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.',
    timeout: 'Yêu cầu hết thời gian. Vui lòng thử lại.',
    unauthorized: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    notFound: 'Không tìm thấy tài nguyên.',
    server: 'Lỗi máy chủ. Vui lòng thử lại sau.',
    rateLimited: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
    imageIdError: 'Lỗi khi lấy ID của ảnh',
  },


  // Header
  header: {
    addImage: 'Thêm ảnh',
    favorites: 'Yêu thích',
    admin: 'Admin',
    about: 'Về chúng tôi',
    account: 'Tài khoản',
    accountSettings: 'Cài đặt tài khoản',
    viewProfile: 'Xem trang cá nhân',
    userMenu: 'Menu người dùng',
    toggleMenu: 'Chuyển đổi menu',
    company: 'Công ty',
    products: 'Sản phẩm',
    community: 'Cộng đồng',
    explore: 'Khám phá',
    legal: 'Pháp lý',
    submitImage: 'Submit an image',
    logIn: 'Log in',
    newToPHOTOCLOUD: 'New to PHOTOCLOUD?',
    signUpFree: 'Sign up for free',
  },


  // Pagination
  pagination: {
    page: 'Trang {current} / {total}',
    previous: 'Trước',
    next: 'Sau',
  },


  // Theme
  theme: {
    darkMode: 'Chế độ tối',
    lightMode: 'Chế độ sáng',
    switchToDark: 'Chuyển sang chế độ tối',
    switchToLight: 'Chuyển sang chế độ sáng',
    toggle: 'Giao diện',
  },

  // Accessibility
  a11y: {
    loading: 'Đang tải',
    loadingImages: 'Đang tải ảnh',
    loadingFavorites: 'Đang tải ảnh yêu thích',
    favoriteImage: 'Ảnh yêu thích: {title}',
    previousPage: 'Trang trước',
    nextPage: 'Trang sau',
    closeMenu: 'Đóng menu',
  },
} as const;
