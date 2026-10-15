// Isolated UI fixture: never proxies mutations to a real database.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const user = {
  _id: 'fixture-admin',
  username: 'minhan',
  displayName: 'Minh An',
  email: 'admin@example.test',
  isAdmin: true,
  isSuperAdmin: true,
};
const photo =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180"><rect fill="#626c51" width="240" height="180"/><path fill="#b4ac86" d="M0 180L85 55L160 180ZM80 180L180 80L240 180Z"/></svg>'
  );
let images = Array.from({ length: 8 }, (_, i) => ({
  _id: 'photo-' + i,
  imageTitle: [
    'Buổi sáng ở Đà Lạt',
    'Những ngày bình yên',
    'Nắng trên hiên nhà',
    'Một góc phố quen',
  ][i % 4],
  imageUrl: photo,
  imageCategory: { _id: 'cat-1', name: 'Phong cảnh' },
  uploadedBy: user,
  createdAt: '2026-10-15T03:00:00Z',
  moderationStatus: 'pending',
}));
let users = [
  user,
  {
    ...user,
    _id: 'member',
    username: 'hoanglinh',
    displayName: 'Hoàng Linh',
    isSuperAdmin: false,
    isAdmin: false,
    createdAt: '2026-10-14T03:00:00Z',
  },
];
let categories = [
  {
    _id: 'cat-1',
    name: 'Phong cảnh',
    description: 'Thiên nhiên và những chuyến đi',
    slug: 'phong-canh',
    imageCount: 8,
    isActive: true,
  },
];
let settings = {
  siteName: 'PhotoCloud',
  siteDescription: 'Lưu giữ những khoảnh khắc đáng nhớ.',
  maxUploadSize: 10,
  allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp'],
  maintenanceMode: false,
};
const requests = [];
const baseBooking = { createdAt: '2026-10-15T03:00:00Z', contact: { name: 'Minh An', phone: '0900000000', email: 'minhan@example.test' }, packageSnapshot: { name: 'Chân dung cá nhân', basePrice: 1500000 }, requestedDate: '2026-10-18', requestedTimeSlot: 'morning', location: { address: 'Studio PhotoCloud' }, statusHistory: [{ to: 'pending', createdAt: '2026-10-11T03:00:00Z', note: 'Khách gửi yêu cầu đặt lịch' }, { to: 'confirmed', createdAt: '2026-10-12T03:00:00Z' }], concept: 'Chụp chân dung với ánh sáng tự nhiên.' };
let bookings = [
  { ...baseBooking, _id: 'booking-1', bookingCode: 'PC-001', status: 'pending' },
  { ...baseBooking, _id: 'booking-2', bookingCode: 'PC-002', status: 'confirmed', contact: { ...baseBooking.contact, name: 'Hoàng Linh' }, confirmedDate: '2026-10-20', confirmedStartTime: '09:00', confirmedEndTime: '10:00' },
  { ...baseBooking, _id: 'booking-3', bookingCode: 'PC-003', status: 'cancelled_by_client', contact: { ...baseBooking.contact, name: 'Thu Hà' } },
];
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/__fixture/requests') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(requests));
  }
  if (url.pathname.startsWith('/api/')) {
    let body = '';
    for await (const chunk of req) body += chunk;
    requests.push({
      path: url.pathname,
      query: url.search,
      method: req.method,
      body,
    });
    res.setHeader('Content-Type', 'application/json');
    if (req.headers['x-fixture-fail']) {
      res.statusCode = 503;
      return res.end(JSON.stringify({ message: 'Lỗi thử nghiệm' }));
    }
    let data = {};
    const p = url.pathname;
    if (p.includes('/auth/refresh')) data = { accessToken: 'fixture' };
    else if (p.includes('/users/me')) data = { user };
    else if (p.includes('csrf')) data = { csrfToken: 'fixture' };
    else if (p.endsWith('/dashboard/stats'))
      data = {
        stats: {
          totalUsers: 128,
          totalImages: 864,
          totalCategories: 12,
          categoryStats: [{ _id: 'cat-1', name: 'Phong cảnh', count: 8 }],
        },
        recentImages: images,
        recentUsers: users,
      };
    else if (p.endsWith('/moderation/pending'))
      data = {
        content: images
          .filter((x) => x.moderationStatus === 'pending')
          .map((x) => ({
            ...x,
            title: x.imageTitle,
            category: x.imageCategory,
          })),
      };
    else if (/\/moderation\/.+\/(approve|reject)$/.test(p)) {
      const id = p.split('/').at(-2);
      images = images.map((x) =>
        x._id === id
          ? {
              ...x,
              moderationStatus: p.endsWith('approve') ? 'approved' : 'rejected',
            }
          : x
      );
    } else if (p.endsWith('/admin/images')) {
      const q = url.searchParams.get('search') || '';
      const list = images.filter((x) =>
        x.imageTitle.toLowerCase().includes(q.toLowerCase())
      );
      data = {
        images: list,
        pagination: {
          page: Number(url.searchParams.get('page') || 1),
          pages: 1,
          total: list.length,
        },
      };
    } else if (p.endsWith('/admin/users'))
      data = { users, pagination: { page: 1, pages: 1, total: users.length } };
    else if (p.includes('/admin/users/') && req.method === 'DELETE')
      users = users.filter((x) => x._id !== p.split('/').at(-1));
    else if (p.endsWith('/categories/admin')) {
      if (req.method === 'POST')
        categories.push({
          ...JSON.parse(body),
          _id: 'cat-' + (categories.length + 1),
        });
      data = { categories };
    } else if (p.includes('/categories/admin/') && req.method === 'DELETE')
      categories = categories.filter((x) => x._id !== p.split('/').at(-1));
    else if (p.endsWith('/settings')) {
      if (req.method === 'PUT')
        settings = { ...settings, ...JSON.parse(body).settings };
      data = { settings };
    } else if (p.endsWith('/admin/roles')) data = { adminRoles: [{ _id: 'role-1', userId: user, role: 'super_admin', permissions: { viewUsers: true, viewImages: true, manageSettings: true }, active: true }] };
    else if (p.endsWith('/admin/collections')) data = { collections: [{ _id: 'collection-1', name: 'Những chuyến đi', description: 'Khoảnh khắc được lưu lại', createdBy: user, images: ['photo-1'], isPublic: true, views: 5, createdAt: '2026-10-15T03:00:00Z' }], pagination: { total: 1, pages: 1, page: 1 } };
    else if (p.endsWith('/admin/logs')) data = { logs: [{ _id: 'log-1', timestamp: '2026-10-15T03:00:00Z', level: 'info', message: 'Đã cập nhật cài đặt', userId: null }], pagination: { total: 1, pages: 1, page: 1 } };
    else if (p.endsWith('/bookings/admin')) {
      const q = (url.searchParams.get('search') || '').toLowerCase();
      const status = url.searchParams.get('status');
      const filtered = bookings.filter(b => (!status || b.status === status) && (!q || [b.bookingCode, b.contact.name, b.contact.phone].some(v => v.toLowerCase().includes(q))));
      data = { bookings: filtered, pagination: { total: filtered.length, pages: 1, page: 1 } };
    }
    else if (p.includes('/bookings/admin/') && req.method === 'PATCH') {
      const id = p.split('/').at(-1); const updates = JSON.parse(body);
      bookings = bookings.map(b => b._id === id ? { ...b, ...updates } : b);
      data = { booking: bookings.find(b => b._id === id) };
    }
    else if (p.includes('/packages')) data = { packages: [] };
    else if (p.includes('/bookings'))
      data = { bookings: [], pagination: { total: 0, pages: 1, page: 1 } };
    else
      data = {
        notifications: [],
        unreadCount: 0,
        images: [],
        collections: [],
        roles: [],
        logs: [],
        pagination: { total: 0, pages: 1, page: 1 },
      };
    return res.end(JSON.stringify(data));
  }
  let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (
    !file.startsWith(root + path.sep) ||
    !fs.existsSync(file) ||
    fs.statSync(file).isDirectory()
  )
    file = path.join(root, 'index.html');
  res.setHeader(
    'Content-Type',
    {
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.html': 'text/html',
      '.woff2': 'font/woff2',
    }[path.extname(file)] || 'application/octet-stream'
  );
  res.end(fs.readFileSync(file));
});
module.exports = server;
if (require.main === module)
  server.listen(
    Number(process.env.ADMIN_PREVIEW_PORT || 4188),
    '127.0.0.1',
    () =>
      console.log('Admin fixture: http://127.0.0.1:' + server.address().port)
  );

