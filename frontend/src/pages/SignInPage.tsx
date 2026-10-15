import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@/stores/useAuthStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, ArrowLeft, ArrowRight, LoaderCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { signInSchema, type SignInFormValue } from "@/types/forms";
import { t } from "@/i18n";
import { AuthLayout } from "./auth/components/AuthLayout";

function SignInPage() {
    const { signIn } = useAuthStore();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [capsLock, setCapsLock] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<SignInFormValue>({
        resolver: zodResolver(signInSchema),
    });

    // Handle error query parameter from OAuth
    useEffect(() => {
        const error = searchParams.get('error');
        if (error) {
            toast.error(decodeURIComponent(error));
            // Remove error from URL
            searchParams.delete('error');
            setSearchParams(searchParams, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const onSubmit = async (data: SignInFormValue) => {
        setIsSubmitting(true);
        setSubmitError('');
        try {
            const username = data.username.trim();
            const password = data.password.trim();

            if (!username || !password) {
                return;
            }

            await signIn(username, password);
            navigate("/");
        } catch (error: unknown) {
            setSubmitError((error as { response?: { data?: { message?: string } } })?.response?.data?.message || t('auth.signInFailed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSocialLogin = (provider: string) => {
        if (provider === 'google') {
            // Google OAuth - redirect to backend
            const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
            window.location.href = `${apiUrl}/api/auth/google`;
        } else {
            // For other providers, show coming soon message
            alert(t('auth.socialComingSoon', { provider: provider.charAt(0).toUpperCase() + provider.slice(1) }));
        }
    };

    return (
        <AuthLayout>
            <Link to="/" className="auth-back"><ArrowLeft size={16} /> Về trang chủ</Link>
            <h1>{t('auth.welcome')}</h1>
            <p className="auth-subtitle">{t('auth.signInToStart')}</p>
            <button type="button" className="social-btn" onClick={() => handleSocialLogin('google')}>
                <span className="social-icon" aria-hidden="true">G</span> Tiếp tục với Google
            </button>
            <div className="auth-separator">{t('auth.or')}</div>
                    <form onSubmit={handleSubmit(onSubmit)} className="signin-form" aria-busy={isSubmitting}>
                        {submitError && <p className="auth-submit-error" role="alert"><AlertCircle size={16} />{submitError}</p>}

                        {/* Username */}
                        <div className="form-group">
                            <label htmlFor="username">{t('auth.username')}</label>
                            <Input
                                autoComplete="username"
                                autoCapitalize="none"
                                spellCheck={false}
                                aria-invalid={!!errors.username}
                                aria-describedby={errors.username ? 'username-error' : undefined}
                                type="text"
                                id="username"
                                placeholder={t('auth.username')}
                                {...register('username')}
                                className={errors.username ? 'error' : ''}
                            />
                            {errors.username && (
                                <p id="username-error" className="error-message">{errors.username.message}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div className="form-group">
                            <label htmlFor="password">{t('auth.password')}</label>
                            <div className="password-input-wrapper">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    autoComplete="current-password"
                                    aria-invalid={!!errors.password}
                                    aria-describedby={errors.password ? 'password-error' : undefined}
                                    placeholder={t('auth.password')}
                                    {...register('password')}
                                    onKeyDown={event => setCapsLock(event.getModifierState('CapsLock'))}
                                    onKeyUp={event => setCapsLock(event.getModifierState('CapsLock'))}
                                    onBlur={event => { void register('password').onBlur(event); setCapsLock(false); }}
                                    className={errors.password ? 'error' : ''}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                    aria-pressed={showPassword}
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            {errors.password && (
                                <p id="password-error" className="error-message">{errors.password.message}</p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            className="continue-btn"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
                            {isSubmitting ? <LoaderCircle size={17} className="auth-loading" /> : <ArrowRight size={17} />}
                        </Button>
                        {capsLock && <p className="auth-caps-warning" role="status">Caps Lock đang bật</p>}
                        <p className="auth-forgot-link">
                            <Link to="/forgot-password" className="form-link">Quên mật khẩu?</Link>
                        </p>
                    </form>
            <p className="auth-switch-footer">{t('auth.noAccount')} <Link to="/signup" className="form-link">{t('auth.signUp')}</Link></p>
        </AuthLayout>
    );
}

export default SignInPage;
