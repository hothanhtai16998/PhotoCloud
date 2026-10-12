import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, CalendarDays, Clock3 } from 'lucide-react';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useStructuredData, schemaHelpers } from '@/hooks/useStructuredData';
import { BRAND } from '@/constants/brand';
import './BlogPage.css';

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  cover: string;
  author: string;
  publishedAt: string;
  readingMinutes: number;
  tag: 'concept' | 'behind-the-scenes' | 'story';
}

const POSTS: BlogPost[] = [
  {
    slug: 'cach-chon-goc-anh-chan-dung',
    title: 'Cách chọn góc ánh sáng cho buổi chụp chân dung',
    excerpt:
      'Ánh sáng tự nhiên là yếu tố quan trọng nhất trong chân dung. Ba kỹ thuật golden hour, soft shade và rim light giúp bạn tạo nên bức ảnh có chiều sâu.',
    body: `Ánh sáng tự nhiên là yếu tố quan trọng nhất trong chân dung. Bạn không cần thiết bị đắt tiền — chỉ cần hiểu cách mặt trời di chuyển và đọc được bóng đổ.

**1. Golden hour (giờ vàng)**
Khoảng 1 giờ sau bình minh hoặc trước hoàng hôn, ánh sáng dịu, ấm, tạo viền mềm quanh tóc và vai. Đây là lúc chân dung đẹp nhất trong ngày.

**2. Soft shade (bóng mềm)**
Đặt chủ thể dưới bóng cây, mái hiên, hoặc tường trắng ngược sáng. Ánh sáng khuếch tán giúp da đều màu, không bị hot-spot.

**3. Rim light (viền sáng)**
Đặt chủ thể hơi quay lưng về phía mặt trời, máy ảnh chụp từ phía trước. Tóc và vai sẽ có viền sáng, tách chủ thể ra khỏi nền.

Tại ${BRAND.nameLong}, mỗi buổi chụp đều bắt đầu bằng 10 phút "đọc sáng" — chọn hướng, chọn giờ, chọn backdrop. Đó là lý do ảnh của chúng tôi luôn có chiều sâu.`,
    cover:
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1280&q=80&auto=format&fit=crop',
    author: 'Phòng trưng bày',
    publishedAt: '2026-09-28',
    readingMinutes: 4,
    tag: 'concept',
  },
  {
    slug: 'mot-ngay-cung-nhiep-anh-gia',
    title: 'Một ngày cùng nhiếp ảnh gia tại studio',
    excerpt:
      'Từ 7h sáng setup đèn, 9h đón khách, đến 13h giao ảnh preview — theo chân ê-kíp trong một buổi chụp couple tại studio.',
    body: `7:00 — Setup
Ê-kíp 3 người tới studio, lắp đèn softbox, kiểm tra backdrop, test máy ảnh với thẻ nhớ mới.

9:00 — Đón khách
Cặp đôi tới, uống trà, nói chuyện về concept đã chốt qua tin nhắn. Photographer chụp thử 5-10 pose tự nhiên để khách quen ống kính.

9:30 — Bắt đầu buổi chụp
Ba set: trong studio với đèn, ngoài ban công ánh sáng tự nhiên, và rooftop golden hour. Mỗi set 30-40 phút.

12:30 — Xem lại ảnh
Photographer chọn 30 ảnh đẹp nhất, khách chọn 10 ảnh để chỉnh màu chi tiết.

13:00 — Preview
Ảnh preview gửi qua email trong 24h. Ảnh chỉnh màu cao cấp giao trong 5-7 ngày làm việc.

Toàn bộ quy trình được thiết kế để khách cảm thấy thoải mái, không vội, và có ảnh đẹp — không phải ảnh "trông giống ai đó trên mạng".`,
    cover:
      'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=1280&q=80&auto=format&fit=crop',
    author: 'Phòng trưng bày',
    publishedAt: '2026-09-15',
    readingMinutes: 5,
    tag: 'behind-the-scenes',
  },
  {
    slug: 'tai-so-chup-anh-couple-quan-trong',
    title: 'Tại sao buổi chụp ảnh couple lại quan trọng hơn bạn nghĩ',
    excerpt:
      'Một bức ảnh đẹp không chỉ là về ánh sáng hay trang phục — đó là bằng chứng cho 10 năm sau, khi mọi thứ đã đổi khác.',
    body: `Bạn sẽ có bao nhiêu bức ảnh chụp cùng người mình yêu trong 5 năm qua? 1? 5? Hay chỉ vài tấm selfie trên điện thoại đã bị mất khi đổi máy?

Một buổi chụp couple chuyên nghiệp không chỉ cho bạn ảnh đẹp. Nó cho bạn:

- **Khoảnh khắc dừng lại**: 60-90 phút không điện thoại, không tin nhắn, chỉ có hai bạn và ống kính.
- **Kỷ niệm vật lý**: Ảnh in ra treo tường, lưu album, đưa cho con sau này xem.
- **Lời nhắc nhở**: 10 năm sau, khi mọi thứ đã đổi, bạn vẫn có bằng chứng rằng "chúng tôi đã yêu nhau thế này".

Tại ${BRAND.nameLong}, mỗi buổi chụp couple đều bắt đầu bằng câu hỏi: "Bạn muốn 10 năm sau nhìn lại bức ảnh này và cảm thấy gì?"

Câu trả lời của bạn sẽ quyết định concept, ánh sáng, biểu cảm — không phải xu hướng trên Instagram.`,
    cover:
      'https://images.unsplash.com/photo-1529634597503-139d3726fed5?w=1280&q=80&auto=format&fit=crop',
    author: 'Phòng trưng bày',
    publishedAt: '2026-08-30',
    readingMinutes: 3,
    tag: 'story',
  },
];

const TAG_LABELS: Record<BlogPost['tag'], string> = {
  concept: 'Concept',
  'behind-the-scenes': 'Hậu trường',
  story: 'Câu chuyện',
};

export default function BlogPage() {
  return <BlogList />;
}

function BlogList() {
  useDocumentMeta({
    title: 'Blog',
    description: `Câu chuyện, concept và hậu trường từ ${BRAND.nameLong}.`,
  });

  const navigate = useNavigate();

  return (
    <main className="blog-page">
      <section className="blog-hero">
        <div className="blog-hero-inner">
          <p className="booking-eyebrow">BLOG · CÂU CHUYỆN</p>
          <h1>
            Kể chuyện <em>bằng ánh sáng</em>
          </h1>
          <p>
            Concept chụp, hậu trường studio, và những câu chuyện nhỏ từ {BRAND.nameLong}.
          </p>
        </div>
      </section>

      <section className="blog-list">
        {POSTS.map((post) => (
          <article
            key={post.slug}
            className="blog-card"
            onClick={() => navigate(`/blog/${post.slug}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/blog/${post.slug}`); }}
          >
            <div className="blog-card-cover" style={{ backgroundImage: `url(${post.cover})` }} aria-hidden />
            <div className="blog-card-body">
              <span className="blog-card-tag">{TAG_LABELS[post.tag]}</span>
              <h2>{post.title}</h2>
              <p>{post.excerpt}</p>
              <div className="blog-card-meta">
                <span><CalendarDays size={13} /> {new Date(post.publishedAt).toLocaleDateString('vi-VN')}</span>
                <span><Clock3 size={13} /> {post.readingMinutes} phút đọc</span>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function BlogDetail() {
  const { slug } = useParams<{ slug: string }>();
  const post = POSTS.find((p) => p.slug === slug);
  const navigate = useNavigate();

  useDocumentMeta({
    title: post?.title ?? 'Blog',
    description: post?.excerpt ?? `Blog ${BRAND.nameLong}`,
  });

  useStructuredData(
    post
      ? schemaHelpers.article({
          title: post.title,
          description: post.excerpt,
          url: `${BRAND.siteUrl}/blog/${post.slug}`,
          image: post.cover,
          datePublished: post.publishedAt,
        })
      : schemaHelpers.organization(),
  );

  if (!post) {
    return (
      <main className="blog-page">
        <div className="blog-empty">
          <BookOpen size={48} aria-hidden />
          <h2>Không tìm thấy bài viết</h2>
          <button type="button" onClick={() => navigate('/blog')} className="booking-secondary-button">
            <ArrowLeft size={15} /> Quay lại blog
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="blog-page">
      <article className="blog-detail">
        <button
          type="button"
          className="blog-back"
          onClick={() => navigate('/blog')}
        >
          <ArrowLeft size={15} /> Quay lại blog
        </button>

        <header className="blog-detail-header">
          <span className="blog-card-tag">{TAG_LABELS[post.tag]}</span>
          <h1>{post.title}</h1>
          <div className="blog-detail-meta">
            <span><CalendarDays size={13} /> {new Date(post.publishedAt).toLocaleDateString('vi-VN')}</span>
            <span><Clock3 size={13} /> {post.readingMinutes} phút đọc</span>
            <span>{post.author}</span>
          </div>
        </header>

        <div
          className="blog-detail-cover"
          style={{ backgroundImage: `url(${post.cover})` }}
          role="img"
          aria-label={post.title}
        />

        <div className="blog-detail-body">
          {post.body.split('\n\n').map((paragraph, index) => {
            const trimmed = paragraph.trim();
            if (!trimmed) return null;
            if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
              return <h3 key={index}>{trimmed.replace(/\*\*/g, '')}</h3>;
            }
            // Inline bold
            const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
            return (
              <p key={index}>
                {parts.map((part, i) =>
                  part.startsWith('**') && part.endsWith('**') ? (
                    <strong key={i}>{part.replace(/\*\*/g, '')}</strong>
                  ) : (
                    <span key={i}>{part}</span>
                  ),
                )}
              </p>
            );
          })}
        </div>
      </article>
    </main>
  );
}

// Export detail for separate route
export { BlogDetail };
