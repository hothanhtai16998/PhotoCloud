import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@/stores/useAuthStore";
import { SignUpForm } from "./auth/components/SignUpForm";
import { useSignUpValidation } from "./auth/hooks/useSignUpValidation";
import { createSignUpSchema, type SignUpFormValue } from "@/types/forms";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { t } from "@/i18n";
import { AuthLayout } from "./auth/components/AuthLayout";

function SignUpPage() {
    const { signUp } = useAuthStore();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { settings } = useSiteSettings();

    // Create dynamic schema based on password requirements
    const signUpSchema = useMemo(() => {
        return createSignUpSchema({
            passwordMinLength: settings.passwordMinLength || 8,
            passwordRequireUppercase: settings.passwordRequireUppercase ?? true,
            passwordRequireLowercase: settings.passwordRequireLowercase ?? true,
            passwordRequireNumber: settings.passwordRequireNumber ?? true,
            passwordRequireSpecialChar: settings.passwordRequireSpecialChar ?? false,
        });
    }, [settings]);

    const { register, handleSubmit, watch, formState: { errors } } = useForm<SignUpFormValue>({
        resolver: zodResolver(signUpSchema),
    });

    // Watch password, email, and username for real-time validation
    const email = watch('email') || '';
    const username = watch('username') || '';

    // Use validation hook
    const { emailStatus, usernameStatus } = useSignUpValidation(email, username);

    const onSubmit = async (data: SignUpFormValue) => {
        setIsSubmitting(true);
        try {
            await signUp(
                data.username,
                data.password,
                data.email,
                data.firstName,
                data.lastName
            );
            navigate("/signin");
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
            <h1>{t('auth.createAccount')}</h1>
            <p className="auth-subtitle">Lưu giữ cảm hứng, kết nối cùng PhotoCloud.</p>
            <button type="button" className="social-btn" onClick={() => handleSocialLogin('google')}>
                <span className="social-icon" aria-hidden="true">G</span> Tiếp tục với Google
            </button>
            <div className="auth-separator">{t('auth.or')}</div>
                    <SignUpForm
                        register={register}
                        handleSubmit={handleSubmit}
                        watch={watch}
                        errors={errors}
                        onSubmit={onSubmit}
                        isSubmitting={isSubmitting}
                        emailStatus={emailStatus}
                        usernameStatus={usernameStatus}
                        passwordRequirements={{
                            minLength: settings.passwordMinLength || 8,
                            requireUppercase: settings.passwordRequireUppercase ?? true,
                            requireLowercase: settings.passwordRequireLowercase ?? true,
                            requireNumber: settings.passwordRequireNumber ?? true,
                            requireSpecialChar: settings.passwordRequireSpecialChar ?? false,
                        }}
                    />
        </AuthLayout>
    );
}

export default SignUpPage;
