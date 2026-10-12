import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import './BookingFAQ.css';

export interface FAQItem {
  q: string;
  a: string;
}

export const DEFAULT_FAQ: FAQItem[] = [
  {
    q: 'Đặt cọc bao nhiêu?',
    a: 'Hiện tại PhotoCloud không yêu cầu đặt cọc. Bạn chỉ gửi yêu cầu, đội ngũ sẽ liên hệ tư vấn và báo giá. Thanh toán sẽ được thống nhất sau khi xác nhận lịch.',
  },
  {
    q: 'Có thể đổi lịch không?',
    a: 'Có. Mỗi booking được đổi lịch 1 lần miễn phí nếu báo trước 48h. Sau 48h hoặc đổi lần 2 sẽ có phụ phí 200.000đ.',
  },
  {
    q: 'Bao lâu thì nhận ảnh?',
    a: 'Ảnh chỉnh màu cao cấp được gửi qua gallery riêng trong 5–7 ngày làm việc sau buổi chụp. Đối với gói event/wedding, thời gian có thể từ 7–14 ngày.',
  },
  {
    q: 'Có chỉnh sửa thêm sau khi nhận ảnh không?',
    a: 'Mỗi gói bao gồm 1 vòng chỉnh sửa thêm miễn phí. Ví dụ: thay nền, điều chỉnh tone màu, crop lại. Retouch body/body edit có phụ phí 80.000đ/ảnh.',
  },
  {
    q: 'Có chụp ngoại tỉnh không?',
    a: 'Có. Đối với buổi chụp ngoại tỉnh, phụ phí đi lại + ăn ở 2 ngày cho photographer tính theo thực tế. Vui lòng ghi rõ trong yêu cầu đặt lịch để chúng tôi báo giá chính xác.',
  },
  {
    q: 'Nếu trời mưa thì sao?',
    a: 'Buổi chụp ngoài trời sẽ được dời lịch nếu thời tiết xấu, hoặc chuyển sang chụp trong studio/quán cafe. Không tính phí đổi lịch khi do thời tiết.',
  },
];

interface BookingFAQProps {
  items?: FAQItem[];
  title?: string;
  eyebrow?: string;
  id?: string;
}

export function BookingFAQ({
  items = DEFAULT_FAQ,
  title = 'Câu hỏi thường gặp',
  eyebrow = 'THẮC MẮC',
  id = 'booking-faq',
}: BookingFAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="booking-faq" id={id} aria-label={title}>
      <p className="booking-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <div className="booking-faq-list">
        {items.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className={`booking-faq-item${isOpen ? ' is-open' : ''}`}
            >
              <button
                type="button"
                className="booking-faq-question"
                aria-expanded={isOpen}
                aria-controls={`${id}-answer-${index}`}
                onClick={() => setOpenIndex(isOpen ? null : index)}
              >
                <span>{item.q}</span>
                <ChevronDown size={18} className="booking-faq-chevron" aria-hidden />
              </button>
              <div
                id={`${id}-answer-${index}`}
                className="booking-faq-answer"
                role="region"
                aria-hidden={!isOpen}
              >
                <p>{item.a}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
