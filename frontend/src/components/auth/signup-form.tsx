import { cn } from "../../lib/utils"

import { Card, CardContent } from "@/components/ui/card"

import { Link, useNavigate } from "react-router"
import { Label } from "../ui/label"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { useForm } from "react-hook-form"

import { zodResolver } from "@hookform/resolvers/zod"
import { useAuthStore } from "@/stores/useAuthStore"
import { signUpSchemaAlt, type SignUpFormValueAlt as SignUpFormValue } from "@/types/forms"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { signUp } = useAuthStore();

  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignUpFormValue>({
    resolver: zodResolver(signUpSchemaAlt),
  })

  const onSubmit = async (data: SignUpFormValue) => {
    //gọi backend để xử lý
    const validatedData = data as SignUpFormValue;
    const { firstname, lastname, username, email, password } = validatedData;
    await signUp(username, password, email, firstname, lastname)
    navigate("/signin");
  }

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
                <h1 className="text-2xl font-bold">Tạo tài khoản PhotoApp</h1>
                <p className="text-muted-foreground text-balance">
                  Chào mừng bạn! Hãy đăng ký để bắt đầu
                </p>
              </div>
              {/* Họ và tên */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor='lastname' className="block text-sm" >
                    Họ
                  </Label>
                  <Input type="text" id='lastname' {...register('lastname')} />
                  {errors.lastname && <p className="text-destructive text-sm">
                    {errors.lastname.message}
                  </p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor='firstname' className="block text-sm" >
                    Tên
                  </Label>
                  <Input type="text" id='firstname'  {...register('firstname')} />
                  {errors.firstname && <p className="text-destructive text-sm">
                    {errors.firstname.message}
                  </p>}

                </div>
              </div>

              {/** Username */}
              <div className="flex flex-col gap-3">
                <Label htmlFor='username' className="block text-sm" >
                  Tên đăng nhập
                </Label>
                <Input type="text" id='username' {...register('username')} />
                {errors.username && <p className="text-destructive text-sm">
                  {errors.username.message}</p>}

              </div>
              {/*  */}
              <div className="flex flex-col gap-3">
                <Label htmlFor='email' className="block text-sm" >
                  Email
                </Label>
                <Input type="email" id='email'{...register('email')} />
                {errors.email && <p className="text-destructive text-sm">
                  {errors.email.message}</p>}

              </div>
              {/*  */}
              <div className="flex flex-col gap-3">
                <Label htmlFor='password' className="block text-sm" >
                  Mật khẩu
                </Label>
                <Input type="password" id='password' {...register('password')} />
                {errors.password && <p className="text-destructive text-sm">
                  {errors.password.message}</p>}

              </div>
              {/*  */}
              <div className="flex flex-col gap-3">
                <Label htmlFor='confirmpassword' className="block text-sm" >
                  Xác nhận mật khẩu
                </Label>
                <Input type="password" id='confirmpassword' {...register('confirmpassword')} />
                {errors.confirmpassword && <p className="text-destructive text-sm">
                  {errors.confirmpassword.message}</p>}

              </div>
              {/*  */}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                Tạo tài khoản
              </Button>
              <div className="text-center text-sm">
                Đã có tài khoản? {" "}
                <Link to='/signin' className="underline underline-offset-4">
                  Đăng nhập
                </Link>
              </div>
            </div>
          </form>
          <div className="bg-muted relative hidden md:block">
            <img
              src="/placeholderSignup.jpeg"
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
