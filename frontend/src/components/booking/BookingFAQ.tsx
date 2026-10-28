import { useId, useState } from 'react';
import { DraftNotice } from '../home/DraftNotice';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';
import './BookingFAQ.css';

const QUESTIONS = [
  {
    question: 'Không biết tạo dáng có chụp được không?',
    answer: 'Bạn không cần chuẩn bị sẵn các dáng chụp. Hãy chia sẻ phong cách bạn thích và những điều khiến bạn chưa tự tin khi trao đổi concept; studio sẽ cùng bạn thống nhất cách chụp phù hợp.',
  },
  {
    question: 'Cần chuẩn bị trang phục thế nào?',
    answer: 'Ưu tiên trang phục vừa vặn, thoải mái và phù hợp với bối cảnh. Bạn có thể gửi ảnh các bộ đồ dự định mặc khi trao đổi với studio. Với buổi chụp couple hoặc gia đình, nên phối màu hài hòa giữa các thành viên.',
  },
  {
    question: 'Giá gói chụp bao gồm những gì?',
    answer: 'Mỗi gói có thời lượng, số lượng ảnh chỉnh màu và các hạng mục riêng, được ghi trong phần chi tiết gói chụp. Các nhu cầu thêm như makeup, thuê địa điểm hoặc concept riêng cần được trao đổi và xác nhận trong báo giá trước buổi chụp.',
  },
  {
    question: 'Bao lâu tôi nhận được ảnh?',
    answer: 'Thời gian giao ảnh phụ thuộc vào gói chụp; nhiều gói có thời gian dự kiến 5–7 ngày. Hãy xem mốc giao ảnh trong chi tiết gói và xác nhận với studio khi chốt lịch, đặc biệt nếu bạn cần ảnh cho một dịp cụ thể.',
  },
  {
    question: 'Nếu cần đổi lịch hoặc gặp trời mưa thì sao?',
    answer: 'Hãy liên hệ studio sớm để trao đổi ngày thay thế hoặc phương án chụp phù hợp. Khả năng đổi lịch, chi phí phát sinh và phương án khi thời tiết xấu cần được xác nhận với studio theo buổi chụp của bạn.',
  },
  {
    question: 'Tôi muốn một concept riêng thì làm thế nào?',
    answer: 'Bạn có thể gửi yêu cầu báo giá riêng, kèm ảnh tham khảo, số người tham gia, địa điểm và thời gian mong muốn. Những thông tin này giúp studio tư vấn phương án và báo giá sát với ý tưởng của bạn.',
  },
];

export function BookingFAQ() {
  const [ref] = useRevealOnScroll<HTMLElement>({ threshold: 0.08 });
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const id = useId();
  const reducedMotion = useReducedMotion();

  return (
    <section ref={ref} className="home-booking-faq" aria-labelledby={`${id}-title`}>
      <div className="home-faq-inner">
        <div className="home-faq-heading">
          <span className="home-faq-eyebrow">TRƯỚC BUỔI CHỤP</span>
          <h2 id={`${id}-title`}>Một chút chuẩn bị,<br /><em>thật nhiều an tâm.</em></h2>
          <p>Những câu hỏi thường gặp trước khi bạn chọn gói và gửi yêu cầu đặt lịch.</p>
          <Link to="/contact" className="home-faq-contact">Trao đổi với studio <ArrowUpRight size={17} aria-hidden="true" /></Link>
        </div>
        <div className="home-faq-list">
          <DraftNotice />
          {QUESTIONS.map((item, index) => {
            const open = openIndex === index;
            return (
              <div key={item.question} className={`home-faq-item${open ? ' is-open' : ''}`}>
                <h3>
                  <button type="button" id={`${id}-question-${index}`} aria-expanded={open}
                    aria-controls={`${id}-answer-${index}`} onClick={() => setOpenIndex(open ? null : index)}>
                    <span className="home-faq-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                    <span>{item.question}</span>
                    <Plus size={20} className="home-faq-toggle" aria-hidden="true" />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {open && <motion.div key="answer" id={`${id}-answer-${index}`} role="region"
                    aria-labelledby={`${id}-question-${index}`}
                    initial={{ height: reducedMotion ? 'auto' : 0, opacity: reducedMotion ? 1 : 0 }}
                    animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: reducedMotion ? 0 : 0.25, ease: 'easeInOut' }}
                    className="home-faq-answer"><p>{item.answer}</p></motion.div>}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
