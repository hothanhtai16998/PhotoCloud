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
import "./SignInPage.css";

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
        <div className="signin-page">
            {/* Background Image */}
            <div className="signin-background">
                <div className="background-overlay"></div>
                <div className="background-logo">
                    <span className="logo-text">Be PhotoApp</span>
                </div>
            </div>

            {/* Signin Modal */}
            <div className="signin-modal">
                <div className="signin-modal-content">
                    <div className="signin-header">
                        <h1 className="signin-title">{t('auth.welcome')}</h1>
                        <p className="signin-subtitle">{t('auth.signInToStart')}</p>
                    </div>

                    {/* Social Login Buttons */}
                    <div className="social-login-section">
                        <button
                            type="button"
                            className="social-btn google-btn"
                            onClick={() => handleSocialLogin('google')}
                        >
                            <span className="social-icon">G</span>
                        </button>
                        <button
                            type="button"
                            className="social-btn apple-btn"
                            onClick={() => handleSocialLogin('facebook')}
                        >
                            <span className="social-icon facebook-btn">F</span>
                        </button>
                        <button
                            type="button"
                            className="social-btn apple-btn"
                            onClick={() => handleSocialLogin('apple')}
                        >
                            <span className="social-icon">A</span>
                        </button>
                    </div>

                    {/* Separator */}
                    <div className="signin-separator">
                        <div className="separator-line"></div>
                        <span className="separator-text">{t('auth.or')}</span>
                        <div className="separator-line"></div>
                    </div>

                    {/* Email Signin Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="signin-form">
                        <div className="signin-form-header">
                            <h2 className="form-subtitle">{t('auth.signInWithAccount')}</h2>
                            <p className="form-switch">
                                {t('auth.noAccount')}{" "}
                                <Link to="/signup" className="form-link">
                                    {t('auth.signUp')}
                                </Link>
                            </p>
                        </div>

                        {/* Username */}
                        <div className="form-group">
                            <Input
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
                            <div className="password-input-wrapper">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    placeholder={t('auth.password')}
                                    {...register('password')}
                                    className={errors.password ? 'error' : ''}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
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
                </div>
            </div>

            {/* Footer */}
            {/* <footer className="signin-footer">
                <p className="footer-text">
                    Copyright © 2025 PhotoApp. All rights reserved.
                </p>
                <div className="footer-links">
                    <a href="#" className="footer-link">Terms of Use</a>
                    <a href="#" className="footer-link">Cookie preferences</a>
                    <a href="#" className="footer-link">Privacy</a>
                    <a href="#" className="footer-link">Do not sell or share my personal information</a>
                </div>
            </footer> */}
        </div>
    );
}

export default SignInPage;
