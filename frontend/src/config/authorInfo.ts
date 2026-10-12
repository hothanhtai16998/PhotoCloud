/**
 * PhotoCloud Studio — Author / Contact / Team Configuration
 * Chỉnh sửa file này để cập nhật thông tin hiển thị trên About page.
 */

export const authorInfo = {
  name: 'PhotoCloud Studio',
  email: 'contact@photocloud.vn',
  phone: '+84 9xx xxx xxx',
  address: 'TP. Hồ Chí Minh, Việt Nam',
  website: 'https://photocloud.vn',
  bio: 'PhotoCloud Studio nhận chụp ảnh chân dung, couple, gia đình và mini session theo yêu cầu tại TP.HCM. Mỗi buổi chụp là một câu chuyện — được kể bằng ánh sáng, cảm xúc và sự riêng tư.',
  social: {
    instagram: 'https://www.instagram.com/photocloud.studio',
    facebook: 'https://www.facebook.com/photocloud.studio',
    tiktok: 'https://www.tiktok.com/@photocloud.studio',
  },
  stats: {
    bookingsCompleted: 500,
    averageRating: 4.9,
    yearsActive: 5,
    clientSatisfaction: 98,
  },
  team: [
    {
      name: 'Minh Châu',
      role: 'Founder · Lead Photographer',
      bio: '10 năm kinh nghiệm chân dung và couple. Chuyên về ánh sáng tự nhiên và studio.',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80&auto=format&fit=crop&crop=face',
    },
    {
      name: 'Hoàng Phong',
      role: 'Photographer · Lighting Specialist',
      bio: 'Chuyên gia ánh sáng tự nhiên và studio. Thành thạo softbox, rim light và golden hour.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80&auto=format&fit=crop&crop=face',
    },
    {
      name: 'Thuỳ Linh',
      role: 'Retoucher · Art Director',
      bio: 'Retouch da, màu tone đặc trưng PhotoCloud. 4 năm làm việc với ảnh chân dung và couple.',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80&auto=format&fit=crop&crop=face',
    },
  ],
} as const;
