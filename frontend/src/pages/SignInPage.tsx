import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@/stores/useAuthStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
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
        try {
            const username = data.username.trim();
            const password = data.password.trim();

            if (!username || !password) {
                return;
            }

            await signIn(username, password);
            navigate("/");
        } catch {
            // Error is handled by the store
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
            <h1>{t('auth.welcome')}</h1>
            <p className="auth-subtitle">{t('auth.signInToStart')}</p>
            <button type="button" className="social-btn" onClick={() => handleSocialLogin('google')}>
                <span className="social-icon" aria-hidden="true">G</span> Tiếp tục với Google
            </button>
            <div className="auth-separator">{t('auth.or')}</div>
                    <form onSubmit={handleSubmit(onSubmit)} className="signin-form" aria-busy={isSubmitting}>
                        <p className="form-switch">{t('auth.noAccount')} <Link to="/signup" className="form-link">{t('auth.signUp')}</Link></p>

                        {/* Username */}
                        <div className="form-group">
                            <label htmlFor="username">{t('auth.username')}</label>
                            <Input
                                autoComplete="username"
                                type="text"
                                id="username"
                                placeholder={t('auth.username')}
                                {...register('username')}
                                className={errors.username ? 'error' : ''}
                            />
                            {errors.username && (
                                <p className="error-message">{errors.username.message}</p>
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
                                    placeholder={t('auth.password')}
                                    {...register('password')}
                                    className={errors.password ? 'error' : ''}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="error-message">{errors.password.message}</p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            className="continue-btn"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
                        </Button>
                    </form>
        </AuthLayout>
    );
}

export default SignInPage;
