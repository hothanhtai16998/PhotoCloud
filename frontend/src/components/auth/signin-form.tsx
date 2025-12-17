import { cn } from "../../lib/utils"

import { Card, CardContent } from "@/components/ui/card"

import { Link, useNavigate, useSearchParams } from "react-router"
import { Label } from "../ui/label"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { useForm } from "react-hook-form"
import { useEffect } from "react"
import { toast } from "sonner"

import { zodResolver } from "@hookform/resolvers/zod"
import { useAuthStore } from "@/stores/useAuthStore"
import { signInSchema, type SignInFormValue } from "@/types/forms"

export function SigninForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const { signIn } = useAuthStore();

    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignInFormValue>({
        resolver: zodResolver(signInSchema),
    })

    // Handle error query parameter from Facebook OAuth
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
        try {
            // Trim and validate before sending
            const username = data.username.trim();
            const password = data.password.trim();

            if (!username || !password) {
                return; // Form validation should prevent this, but double-check
            }

            //gọi backend để xử lý
            await signIn(username, password);
            // Only navigate on success (signIn throws on error)
            navigate("/");
        } catch {
            // Error is already handled by signIn in the store
            // Don't navigate on error
        }
    }

    const handleSocialLogin = (provider: string) => {
        if (provider === 'google') {
            // Google OAuth - redirect to backend
            const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
            window.location.href = `${apiUrl}/api/auth/google`;
        } else {
            // For other providers, show coming soon message
            alert(`Đăng nhập ${provider.charAt(0).toUpperCase() + provider.slice(1)} sẽ sớm ra mắt!`);
        }
    };

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card className="overflow-hidden p-0 border-border">
                <CardContent className="grid p-0 md:grid-cols-2">
                    <form className="p-6 md:p-8" onSubmit={handleSubmit(onSubmit)}>
                        <div className="flex flex-col gap-6">
                            {/* header - logo */}
                            <div className="flex flex-col items-center text-center-gap-2">
                                <Link to='/' className="mx-auto block w-fit text-center">
                                    <img src="/logo" alt="logo" />
                                </Link>
                                <h1 className="text-2xl font-bold">Chào mừng quay lại</h1>
                                <p className="text-muted-foreground text-balance">
                                    Đăng nhập tài khoản PhotoApp của bạn
                                </p>
                            </div>

                            {/* Social Login Buttons */}
                            <div className="flex gap-3 justify-center">
                                <button
                                    type="button"
                                    className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors"
                                    onClick={() => handleSocialLogin('google')}
                                    title="Sign in with Google"
                                >
                                    <span className="text-blue-600 font-semibold">G</span>
                                </button>
                            </div>

                            {/* Separator */}
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-muted-foreground">Hoặc</span>
                                </div>
                            </div>

                            {/** Tên tài khoản */}
                            <div className="flex flex-col gap-3">
                                <Label htmlFor='username' className="block text-sm" >
                                    Tên đăng nhập
                                </Label>
                                <Input type="text" id='username' {...register('username')} />
                                {errors.username && <p className="text-destructive text-sm">
                                    {errors.username.message}</p>}

                            </div>

                            {/*  Mật khẩu */}
                            <div className="flex flex-col gap-3">
                                <Label htmlFor='password' className="block text-sm" >
                                    Mật khẩu
                                </Label>
                                <Input type="password" id='password' {...register('password')} />
                                {errors.password && <p className="text-destructive text-sm">
                                    {errors.password.message}</p>}

                            </div>
                            {/*  Đăng nhập */}
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                Đăng nhập
                            </Button>
                            <div className="text-center text-sm">
                                Chưa có tài khoản? {" "}
                                <Link to='/signup' className="underline underline-offset-4">
                                    Đăng ky
                                </Link>
                            </div>
                        </div>
                    </form>
                    <div className="bg-muted relative hidden md:block">
                        <img
                            src="/placeholderSignin.jpeg"
                            alt="Image"
                            className="absolute h-full object-cover"
                        />
                    </div>
                </CardContent>
            </Card>
            <div className="text-xs text-balance px-6 text-center *:[a]:hover:text-primary text-muted-foreground *:[a]:underline *:[a]:underline-offset-4">
                Bằng cách tiếp tục, bạn đồng ý với <a href="#">điều khoản dịch vụ</a>{" "}
                và <Link to="#">chính sách bảo mật</Link> của chúng tôi.
            </div>
        </div >
    )
}
