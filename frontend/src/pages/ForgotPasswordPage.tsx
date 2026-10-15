import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { userService } from '@/services/userService';
import { Button } from '@/components/ui/button';
import './ForgotPasswordPage.css';

/**
 * Public page — anyone can request a password reset.
 * Shows success immediately (backend returns 200 even if email not found
 * to prevent enumeration). Email is sent only if the account exists.
 */
export default memo(function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email.trim()) {
            setError('Vui lòng nhập địa chỉ email.');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setError('Email không hợp lệ.');
            return;
        }

        setSending(true);
        try {
            await userService.forgotPassword(email.trim());
            setSent(true);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
        } finally {
            setSending(false);
        }
    };

    if (sent) {
        return (
            <div className="forgot-password-page success-state">
                <div className="forgot-password-card">
                    <div className="forgot-password-icon success">
                        <CheckCircle size={48} aria-hidden="true" />
                    </div>
                    <h1>Kiểm tra email của bạn</h1>
                    <p>
                        Nếu tài khoản <strong>{email}</strong> tồn tại trong hệ thống,
                        chúng tôi đã gửi link đặt lại mật khẩu.
                    </p>
                    <p className="forgot-password-hint">
                        Kiểm tra cả hộp thư spam nếu không thấy email.
                        Link có hiệu lực trong 1 giờ.
                    </p>
                    <div className="forgot-password-actions">
                        <Link to="/signin" className="forgot-password-link">
                            <ArrowLeft size={14} aria-hidden="true" />
                            Quay lại đăng nhập
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="forgot-password-page">
            <div className="forgot-password-card">
                <div className="forgot-password-icon">
                    <Mail size={32} aria-hidden="true" />
                </div>
                <h1>Quên mật khẩu?</h1>
                <p className="forgot-password-subtitle">
                    Nhập email đã đăng ký. Chúng tôi sẽ gửi link đặt lại mật khẩu.
                </p>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="forgot-password-field">
                        <label htmlFor="reset-email" className="forgot-password-label">
                            Email <span className="forgot-password-required" aria-hidden="true">*</span>
                        </label>
                        <input
                            id="reset-email"
                            type="email"
                            className={`forgot-password-input ${error ? 'invalid' : ''}`}
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (error) setError('');
                            }}
                            placeholder="user@example.com"
                            autoComplete="email"
                            autoFocus
                            disabled={sending}
                        />
                        {error && (
                            <span className="forgot-password-error" role="alert">
                                <AlertCircle size={14} aria-hidden="true" />
                                {error}
                            </span>
                        )}
                    </div>

                    <Button
                        type="submit"
                        className="forgot-password-submit"
                        disabled={sending}
                    >
                        {sending ? 'Đang gửi…' : 'Gửi link đặt lại'}
                    </Button>
                </form>

                <div className="forgot-password-actions">
                    <Link to="/signin" className="forgot-password-link">
                        <ArrowLeft size={14} aria-hidden="true" />
                        Quay lại đăng nhập
                    </Link>
                </div>
            </div>
        </div>
    );
});
