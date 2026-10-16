import { useState, type ImgHTMLAttributes } from 'react';
import { Mail, Phone, MapPin, Instagram, Facebook, Star, Award, Users, CalendarDays, ImageOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { authorInfo } from '@/config/authorInfo';
import { BRAND } from '@/constants/brand';
import { openBookingModal } from '@/utils/bookingModalEvent';
import { useRevealOnScrollScope } from '@/hooks/useRevealOnScroll';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useStructuredData, schemaHelpers } from '@/hooks/useStructuredData';
import { Button } from '@/components/ui/button';
import './AboutPage.css';

interface SafeImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string;
  fallbackLabel?: string;
}

/**
 * Ảnh ngoại tuyến dễ tải lỗi (CDN, ảnh Unsplash, ảnh demo). Khi lỗi,
 * hiển thị khung tối giản với icon và nhãn thay vì để vỡ bố cục hoặc
 * in alt rỗng.
 */
function SafeImage({ src, alt, fallbackLabel, className, ...rest }: SafeImageProps) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div className={`about-img-fallback ${className ?? ''}`} role="img" aria-label={alt}>
        <ImageOff size={28} aria-hidden />
        {fallbackLabel && <span className="about-img-fallback-label">{fallbackLabel}</span>}
      </div>
    );
  }
  return (
    <img
      {...rest}
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      className={className}
    />
  );
}

const VALUE_PROPS = [
  {
    icon: Star,
    title: 'Kể chuyện bằng ánh sáng',
    description:
      'Mỗi buổi chụp là một câu chuyện riêng. Chúng tôi không chụp theo khuôn — chúng tôi lắng nghe, quan sát và ghi lại khoảnh khắc thật của bạn.',
  },
  {
    icon: Award,
    title: 'Ảnh chỉnh màu cao cấp',
    description:
      'Tất cả ảnh đều được retouch da, cân bằng màu tone đặc trưng của PhotoCloud. Không ai giống ai — gallery của bạn sẽ có phong cách riêng.',
  },
  {
    icon: Users,
    title: 'Cá nhân hoá từng buổi',
    description:
      'Questionnaire trước buổi chụp, tư vấn concept, hướng dẫn tạo dáng — đội ngũ đồng hành để bạn thoải mái nhất khi lên ảnh.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Tôi cần đặt trước bao lâu?',
    a: 'Tốt nhất đặt từ 1–2 tuần trước ngày mong muốn. Nếu bạn cần gấp (3–5 ngày), hãy gửi yêu cầu — chúng tôi sẽ cố gắng sắp xếp nếu có slot trống.',
  },
  {
    q: 'Có cần thanh toán trước không?',
    a: 'Không. Bạn chỉ gửi yêu cầu, đội ngũ sẽ liên hệ tư vấn và báo giá. Thanh toán sẽ được thống nhất sau khi xác nhận lịch.',
  },
  {
    q: 'Nhận ảnh sau bao lâu?',
    a: 'Ảnh chỉnh màu cao cấp được gửi qua gallery riêng trong 5–7 ngày làm việc sau buổi chụp. Ảnh RAW không chia sẻ.',
  },
  {
    q: 'Có chụp ngoại cảnh không?',
    a: 'Có. Tất cả gói đều có thể chụp outdoor tại TP.HCM. Địa điểm do khách chọn, chúng tôi sẽ tư vấn về ánh sáng và thời điểm phù hợp.',
  },
  {
    q: 'Có chỉnh sửa thêm sau khi nhận ảnh không?',
    a: 'Mỗi gói bao gồm 1 vòng chỉnh sửa thêm miễn phí (VD: thay nền, điều chỉnh ánh sáng). Retouch body/body edit có phụ phí.',
  },
];

export default function AboutPage() {
  useDocumentMeta({
    title: 'Về PhotoCloud Studio',
    description: `Tìm hiểu về đội ngũ và câu chuyện của ${BRAND.nameLong}. ${authorInfo.bio}`,
  });
  const pageRef = useRevealOnScrollScope<HTMLDivElement>();
  useStructuredData(schemaHelpers.faqPage(FAQ_ITEMS));

  // Lọc stats có giá trị thật. Số liệu mẫu cần được chủ studio xác nhận.
  const stats = [
    authorInfo.stats.bookingsCompleted != null && {
      value: `${authorInfo.stats.bookingsCompleted}+`,
      label: 'Buổi chụp đã hoàn thành',
    },
    authorInfo.stats.averageRating != null && {
      value: `${authorInfo.stats.averageRating}/5`,
      label: 'Điểm trung bình từ khách',
    },
    authorInfo.stats.yearsActive != null && {
      value: `${authorInfo.stats.yearsActive} năm`,
      label: 'Hoạt động tại TP.HCM',
    },
    authorInfo.stats.clientSatisfaction != null && {
      value: `${authorInfo.stats.clientSatisfaction}%`,
      label: 'Khách hàng hài lòng',
    },
  ].filter(Boolean) as { value: string; label: string }[];

  const phoneAvailable = Boolean(authorInfo.phoneDisplay && authorInfo.phoneHref);
  const perYearSentence =
    authorInfo.stats.bookingsPerYear != null
      ? `Mỗi năm, hơn ${authorInfo.stats.bookingsPerYear} buổi chụp được thực hiện.`
      : 'Mỗi buổi là một câu chuyện mới. Đó là lý do chúng tôi vẫn làm điều này.';

  return (
    <div className="about-page" ref={pageRef}>
      {/* Hero */}
      <section className="about-hero studio-reveal">
        <div className="about-container">
          <h1 className="about-title">
            Kể chuyện bằng <span className="about-title-accent">ánh sáng</span>
          </h1>
          <p className="about-hero-sub">
            {authorInfo.bio}
          </p>
        </div>
      </section>

      {/* Stats */}
      {stats.length > 0 && (
        <section className="about-stats studio-reveal">
          <div className="about-container">
            <div className="about-stats-grid">
              {stats.map((stat) => (
                <div key={stat.label} className="about-stat">
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Story */}
      <section className="about-story studio-reveal">
        <div className="about-container">
          <div className="about-story-inner">
            <div className="about-story-text">
              <h2>Tại sao chúng tôi bắt đầu</h2>
              <p>
                PhotoCloud bắt đầu từ một chiếc máy ảnh và một ý tưởng đơn giản: hầu hết các buổi chụp ảnh đều quá giống nhau. Cùng một góc chụp, cùng một pose, cùng một bộ lọc màu.
              </p>
              <p>
                Chúng tôi muốn tạo ra điều khác biệt — một quy trình mà khách hàng cảm thấy được lắng nghe, được tư vấn, và cuối cùng nhận được những bức ảnh đúng với con người họ, không phải một bản sao của ai đó trên mạng.
              </p>
              <p>{perYearSentence}</p>
            </div>
            <div className="about-story-image">
              <SafeImage
                src="https://images.unsplash.com/photo-1606216794079-73c1c46c6cf5?w=800&q=80&auto=format&fit=crop"
                alt="Minh Châu — Lead Photographer tại PhotoCloud Studio"
                fallbackLabel="Ảnh minh họa đang tải lại"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="about-team studio-reveal">
        <div className="about-container">
          <h2 className="about-section-title">Những người đứng sau ống kính</h2>
          <div className="about-team-grid">
            {authorInfo.team.map((member) => (
              <div key={member.name} className="about-team-card">
                <div className="about-team-avatar">
                  <SafeImage
                    src={member.avatar}
                    alt={member.name}
                    fallbackLabel={member.name}
                    loading="lazy"
                  />
                </div>
                <div className="about-team-info">
                  <h3>{member.name}</h3>
                  <p className="about-team-role">{member.role}</p>
                  <p className="about-team-bio">{member.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="about-values studio-reveal">
        <div className="about-container">
          <h2 className="about-section-title">Cam kết với từng buổi chụp</h2>
          <div className="about-values-grid">
            {VALUE_PROPS.map((item) => (
              <div key={item.title} className="about-value-card">
                <div className="about-value-icon">
                  <item.icon size={24} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="about-faq studio-reveal">
        <div className="about-container about-container--narrow">
          <h2 className="about-section-title">Câu hỏi thường gặp</h2>
          <div className="about-faq-list">
            {FAQ_ITEMS.map((item) => (
              <details key={item.q} className="about-faq-item">
                <summary className="about-faq-question">
                  <span>{item.q}</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <div className="about-faq-answer">
                  <p>{item.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="about-cta studio-reveal">
        <div className="about-container about-container--narrow">
          <h2>Sẵn sàng cho buổi chụp tiếp theo?</h2>
          <p>Đặt lịch ngay — phản hồi trong 24h, chưa cần thanh toán trước.</p>
          <div className="about-cta-actions">
            <Button onClick={openBookingModal}>
              <CalendarDays size={17} /> Đặt lịch chụp
            </Button>
            <Link to="/packages" className="about-cta-secondary-link">
              Xem các gói chụp
            </Link>
          </div>
        </div>
      </section>

      {/* Contact info (compact, at bottom) */}
      <section className="about-contact studio-reveal">
        <div className="about-container about-container--narrow">
          <div className="about-contact-grid">
            <div className="about-contact-item">
              <Mail size={17} />
              <a href={`mailto:${authorInfo.email}`}>{authorInfo.email}</a>
            </div>
            {phoneAvailable && (
              <div className="about-contact-item">
                <Phone size={17} />
                <a href={`tel:${authorInfo.phoneHref}`}>{authorInfo.phoneDisplay}</a>
              </div>
            )}
            <div className="about-contact-item">
              <MapPin size={17} />
              <span>{authorInfo.address}</span>
            </div>
          </div>
          <div className="about-social">
            {authorInfo.social.instagram && (
              <a href={authorInfo.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <Instagram size={20} />
              </a>
            )}
            {authorInfo.social.facebook && (
              <a href={authorInfo.social.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <Facebook size={20} />
              </a>
            )}
            {authorInfo.social.tiktok && (
              <a href={authorInfo.social.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.77 1.52V6.73a4.85 4.85 0 01-1-.04z" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
