import { useState } from 'react';
import { FormEvent } from 'react';
import { Facebook, Linkedin, Send, Mail, Phone, MapPin, Clock3, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { BRAND } from '@/constants/brand';
import { authorInfo } from '@/config/authorInfo';
import './ContactPage.css';

interface ContactForm {
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
}

const initialForm: ContactForm = {
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
};

function ContactPage() {
    useDocumentMeta({
        title: 'Liên hệ',
        description: `Liên hệ ${BRAND.nameLong} để được tư vấn, đặt lịch chụp ảnh hoặc hợp tác. Phản hồi trong 24h.`,
    });

    const [form, setForm] = useState<ContactForm>(initialForm);
    const [submitting, setSubmitting] = useState(false);

    const update = <K extends keyof ContactForm>(key: K, value: ContactForm[K]) => {
        setForm((current) => ({ ...current, [key]: value }));
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
            toast.error('Vui lòng điền họ tên, email và nội dung.');
            return;
        }
        setSubmitting(true);
        try {
            // Build mailto fallback - opens user's mail client
            const subject = encodeURIComponent(form.subject || 'Liên hệ từ PhotoCloud');
            const body = encodeURIComponent(
                `Họ tên: ${form.name}\nEmail: ${form.email}\nSĐT: ${form.phone}\n\n${form.message}`
            );
            const mailto = `mailto:${authorInfo.email}?subject=${subject}&body=${body}`;
            window.location.href = mailto;
            toast.success('Đã mở ứng dụng email. Bạn có thể gửi ngay!');
        } catch {
            toast.error('Không thể mở ứng dụng email. Vui lòng thử lại.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="contact-page">
            <div className="contact-container">
                <header className="contact-header">
                    <p className="contact-eyebrow">{BRAND.nameLong.toUpperCase()}</p>
                    <h1>Liên hệ với chúng tôi</h1>
                    <p className="contact-subtitle">
                        Bạn có thắc mắc về gói chụp, cần tư vấn concept, hoặc muốn hợp tác?
                        Gửi tin nhắn — đội ngũ sẽ phản hồi trong vòng 24 giờ.
                    </p>
                </header>

                <div className="contact-grid">
                    <aside className="contact-info">
                        <ContactCard icon={<Mail size={18} />} label="Email" value={authorInfo.email} href={`mailto:${authorInfo.email}`} />
                        <ContactCard icon={<Phone size={18} />} label="Số điện thoại" value={authorInfo.phone} href={`tel:${authorInfo.phone.replace(/\s/g, '')}`} />
                        <ContactCard icon={<MapPin size={18} />} label="Địa chỉ studio" value={authorInfo.address} />
                        <ContactCard icon={<Clock3 size={18} />} label="Giờ làm việc" value="Thứ 2 – Chủ nhật · 09:00 – 21:00" />
                    </aside>

                    <form className="contact-form" onSubmit={submit}>
                        <h2>Gửi tin nhắn</h2>
                        <div className="contact-fields">
                            <label>
                                Họ và tên
                                <input
                                    value={form.name}
                                    onChange={(event) => update('name', event.target.value)}
                                    placeholder="Nguyễn Văn A"
                                    required
                                />
                            </label>
                            <label>
                                Email
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(event) => update('email', event.target.value)}
                                    placeholder="you@example.com"
                                    required
                                />
                            </label>
                            <label>
                                Số điện thoại
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={(event) => update('phone', event.target.value)}
                                    placeholder="(không bắt buộc)"
                                />
                            </label>
                            <label>
                                Chủ đề
                                <input
                                    value={form.subject}
                                    onChange={(event) => update('subject', event.target.value)}
                                    placeholder="Ví dụ: Tư vấn gói chụp couple"
                                />
                            </label>
                            <label>
                                Nội dung
                                <textarea
                                    rows={5}
                                    value={form.message}
                                    onChange={(event) => update('message', event.target.value)}
                                    placeholder="Chia sẻ thêm về nhu cầu của bạn..."
                                    required
                                />
                            </label>
                        </div>
                        <button type="submit" className="contact-submit" disabled={submitting}>
                            <Send size={15} /> {submitting ? 'Đang mở email…' : 'Gửi qua email'}
                        </button>
                    </form>
                </div>

                <section className="contact-social">
                    <h2>Theo dõi {BRAND.nameLong}</h2>
                    <div className="contact-social-links">
                        {authorInfo.social.facebook && (
                            <a href={authorInfo.social.facebook} target="_blank" rel="noopener noreferrer" className="contact-social-link">
                                <Facebook size={18} /> Facebook
                            </a>
                        )}
                        {authorInfo.social.tiktok && (
                            <a href={authorInfo.social.tiktok} target="_blank" rel="noopener noreferrer" className="contact-social-link">
                                <MessageSquare size={18} /> TikTok
                            </a>
                        )}
                        {authorInfo.social.linkedin && (
                            <a href={authorInfo.social.linkedin} target="_blank" rel="noopener noreferrer" className="contact-social-link">
                                <Linkedin size={18} /> LinkedIn
                            </a>
                        )}
                        {authorInfo.social.github && (
                            <a href={authorInfo.social.github} target="_blank" rel="noopener noreferrer" className="contact-social-link">
                                <MessageSquare size={18} /> GitHub
                            </a>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

function ContactCard({
    icon,
    label,
    value,
    href,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    href?: string;
}) {
    const content = (
        <>
            <span className="contact-card-icon">{icon}</span>
            <div>
                <span className="contact-card-label">{label}</span>
                <span className="contact-card-value">{value}</span>
            </div>
        </>
    );

    return href ? (
        <a href={href} className="contact-card contact-card--link">
            {content}
        </a>
    ) : (
        <div className="contact-card">{content}</div>
    );
}

export default ContactPage;
