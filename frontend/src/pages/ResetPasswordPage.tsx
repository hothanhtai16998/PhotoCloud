import { memo, useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, CheckCircle, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { userService } from '@/services/userService';
import { Button } from '@/components/ui/button';
import './ForgotPasswordPage.css';

interface PasswordErrors {
    password?: string;
    confirm?: string;
}

function validate(password: string, confirm: string): PasswordErrors {
    const errors: PasswordErrors = {};
    if (!password) {
        errors.password = 'Vui lòng nhập mật khẩu mới.';
    } else if (password.length < 8) {
        errors.password = 'Mật khẩu phải có ít nhất 8 ký tự.';
    } else if (password.length > 100) {
        errors.password = 'Mật khẩu không được dài quá 100 ký tự.';
    }
    if (password !== confirm) {
        errors.confirm = 'Mật khẩu nhập lại không khớp.';
    }
    return errors;
}

function getPasswordStrength(p: string): 'weak' | 'fair' | 'good' | 'strong' {
    if (p.length < 8) return 'weak';
    let score = 0;
    if (/[a-z]/.test(p)) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^a-zA-Z0-9]/.test(p)) score++;
    if (p.length >= 12) score++;
    if (score <= 2) return 'weak';
    if (score === 3) return 'fair';
    if (score === 4) return 'good';
    return 'strong';
}

export default memo(function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<PasswordErrors>({});
    const [success, setSuccess] = useState(false);
    const [apiError, setApiError] = useState('');

    // If no token in URL, this page is useless — show helpful error.
    useEffect(() => {
        if (!token) {
            setApiError('Link đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu link mới.');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setApiError('');

        const errs = validate(password, confirm);
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }

        if (!token) return;

        setSaving(true);
        try {
            await userService.resetPassword(token, password);
            setSuccess(true);
            // Redirect to sign-in after a short delay so user reads the success message.
            window.setTimeout(() => navigate('/signin'), 3000);
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
            setApiError(msg);
        } finally {
            setSaving(false);
        }
    };

    if (success) {
        return (
            <div className="forgot-password-page success-state">
                <div className="forgot-password-card">
                    <div className="forgot-password-icon success">
                        <CheckCircle size={48} aria-hidden="true" />
                    </div>
                    <h1>Mật khẩu đã được đặt lại</h1>
                    <p>
                        Mật khẩu của bạn đã được cập nhật thành công.
                    </p>
                    <p className="forgot-password-hint">
                        Bạn sẽ được chuyển đến trang đăng nhập sau vài giây.
                    </p>
                    <div className="forgot-password-actions">
                        <Link to="/signin" className="forgot-password-link">
                            <ArrowLeft size={14} aria-hidden="true" />
                            Đăng nhập ngay
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const strength = password ? getPasswordStrength(password) : null;

    return (
        <div className="forgot-password-page">
            <div className="forgot-password-card">
                <div className="forgot-password-icon">
                    <Lock size={32} aria-hidden="true" />
                </div>
                <h1>Đặt lại mật khẩu</h1>
                <p className="forgot-password-subtitle">
                    Nhập mật khẩu mới cho tài khoản của bạn.
                </p>

                {apiError && (
                    <div className="reset-password-error" role="alert">
                        <AlertCircle size={14} aria-hidden="true" />
                        <span>{apiError}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                    <div className="forgot-password-field">
                        <label htmlFor="new-password" className="forgot-password-label">
                            Mật khẩu mới <span className="forgot-password-required" aria-hidden="true">*</span>
                        </label>
                        <div className="reset-password-input-wrap">
                            <input
                                id="new-password"
                                type={showPassword ? 'text' : 'password'}
                                className={`forgot-password-input ${errors.password ? 'invalid' : ''}`}
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                                }}
                                placeholder="Ít nhất 8 ký tự"
                                autoComplete="new-password"
                                autoFocus
                                disabled={!token || saving}
                            />
                            <button
                                type="button"
                                className="reset-password-toggle"
                                onClick={() => setShowPassword((v) => !v)}
                                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {errors.password && (
                            <span className="forgot-password-error" role="alert">
                                <AlertCircle size={14} aria-hidden="true" />
                                {errors.password}
                            </span>
                        )}
                    </div>

                    {strength && (
                        <div className={`reset-password-strength tone-${strength}`} aria-live="polite">
                            <div className="reset-password-strength-bar">
                                <span />
                                <span />
                                <span />
                                <span />
                            </div>
                            <span className="reset-password-strength-label">
                                {strength === 'weak' && 'Yếu'}
                                {strength === 'fair' && 'Trung bình'}
                                {strength === 'good' && 'Tốt'}
                                {strength === 'strong' && 'Mạnh'}
                            </span>
                        </div>
                    )}

                    <div className="forgot-password-field">
                        <label htmlFor="confirm-password" className="forgot-password-label">
                            Nhập lại mật khẩu <span className="forgot-password-required" aria-hidden="true">*</span>
                        </label>
                        <input
                            id="confirm-password"
                            type={showPassword ? 'text' : 'password'}
                            className={`forgot-password-input ${errors.confirm ? 'invalid' : ''}`}
                            value={confirm}
                            onChange={(e) => {
                                setConfirm(e.target.value);
                                if (errors.confirm) setErrors((p) => ({ ...p, confirm: undefined }));
                            }}
                            placeholder="Nhập lại mật khẩu mới"
                            autoComplete="new-password"
                            disabled={!token || saving}
                        />
                        {errors.confirm && (
                            <span className="forgot-password-error" role="alert">
                                <AlertCircle size={14} aria-hidden="true" />
                                {errors.confirm}
                            </span>
                        )}
                    </div>

                    <Button
                        type="submit"
                        className="forgot-password-submit"
                        disabled={saving || !token}
                    >
                        {saving ? 'Đang đặt lại…' : 'Đặt lại mật khẩu'}
                    </Button>
                </form>

                <div className="forgot-password-actions">
                    <Link to="/forgot-password" className="forgot-password-link">
                        <ArrowLeft size={14} aria-hidden="true" />
                        Yêu cầu link mới
                    </Link>
                </div>
            </div>
        </div>
    );
});
