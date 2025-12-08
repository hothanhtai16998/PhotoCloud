import { z } from 'zod';

interface PasswordRequirements {
    passwordMinLength?: number;
    passwordRequireUppercase?: boolean;
    passwordRequireLowercase?: boolean;
    passwordRequireNumber?: boolean;
    passwordRequireSpecialChar?: boolean;
}

// Create dynamic Sign Up Form Schema based on password requirements
export const createSignUpSchema = (requirements: PasswordRequirements = {}) => {
    const minLength = requirements.passwordMinLength || 8;
    const requireUppercase = requirements.passwordRequireUppercase ?? true;
    const requireLowercase = requirements.passwordRequireLowercase ?? true;
    const requireNumber = requirements.passwordRequireNumber ?? true;
    const requireSpecialChar = requirements.passwordRequireSpecialChar ?? false;

    // Build regex pattern based on requirements
    const regexParts: string[] = [];
    if (requireLowercase) regexParts.push('(?=.*[a-z])');
    if (requireUppercase) regexParts.push('(?=.*[A-Z])');
    if (requireNumber) regexParts.push('(?=.*\\d)');
    if (requireSpecialChar) regexParts.push('(?=.*[^a-zA-Z0-9])');

    // Build error message
    const messageParts: string[] = [];
    messageParts.push(`ít nhất ${minLength} ký tự`);
    if (requireLowercase) messageParts.push('chữ thường');
    if (requireUppercase) messageParts.push('chữ hoa');
    if (requireNumber) messageParts.push('số');
    if (requireSpecialChar) messageParts.push('ký tự đặc biệt');

    const passwordValidation = regexParts.length > 0
        ? z.string()
            .min(minLength, { message: `Mật khẩu phải từ ${minLength} ký tự trở lên.` })
            .regex(new RegExp(`^${regexParts.join('')}.{${minLength},}$`), {
                message: `Mật khẩu phải có ${messageParts.join(', ')}.`
            })
        : z.string()
            .min(minLength, { message: `Mật khẩu phải từ ${minLength} ký tự trở lên.` });

    return z.object({
        username: z.string()
            .min(6, { message: "Tên tài khoản phải từ 6 ký tự trở lên." })
            .max(20, { message: "Tên tài khoản phải từ 20 ký tự trở xuống." })
            .regex(/^[a-zA-Z0-9_]+$/, { message: "Tên tài khoản chỉ có thể chứa chữ, số và gạch dưới." }),
        firstName: z.string()
            .min(2, { message: "Họ không được để trống." })
            .trim(),
        lastName: z.string()
            .min(2, { message: "Tên không được để trống." })
            .trim(),
        email: z.string().email({ message: "Vui lòng nhập email hợp lệ." }),
        password: passwordValidation,
        confirmPassword: z.string(),
    }).refine((data) => data.password === data.confirmPassword, {
        message: "Xác nhận mật khẩu không chính xác.",
        path: ["confirmPassword"],
    });
};

// Default schema (for backward compatibility)
export const signUpSchema = createSignUpSchema();

export type SignUpFormValue = z.infer<ReturnType<typeof createSignUpSchema>>;

// Alternative Sign Up Schema (for signup-form.tsx component)
export const signUpSchemaAlt = z.object({
    firstname: z.string().min(2, { message: "Họ không được để trống." }),
    lastname: z.string().min(2, { message: "Tên không được để trống." }),
    username: z.string().min(6, { message: "Tên đăng nhập phải có ít nhất 3 ký tự." }),
    email: z.string().email({ message: "Email không hợp lệ." }),
    password: z.string().min(8, { message: "Mật khẩu phải có ít nhất 8 ký tự." }),
    confirmpassword: z.string()
}).refine((data) => data.password === data.confirmpassword, {
    message: "Mật khẩu không khớp.",
    path: ["confirmpassword"],
});

export type SignUpFormValueAlt = z.infer<typeof signUpSchemaAlt>;

// Sign In Form Schema
export const signInSchema = z.object({
    username: z.string().min(1, { message: "Tên tải khoản không được để trống." }),
    password: z.string().min(1, { message: "Mật khẩu không được để trống." }),
});

export type SignInFormValue = z.infer<typeof signInSchema>;

// Profile Form Data
export interface ProfileFormData {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    location: string;
    phone: string;
    personalSite: string;
    bio: string;
    interests: string;
    instagram: string;
    twitter: string;
    paypalEmail: string;
    showMessageButton: boolean;
}

// Create dynamic Change Password Form Schema based on password requirements
export const createChangePasswordSchema = (requirements: PasswordRequirements = {}) => {
    const minLength = requirements.passwordMinLength || 8;
    const requireUppercase = requirements.passwordRequireUppercase ?? true;
    const requireLowercase = requirements.passwordRequireLowercase ?? true;
    const requireNumber = requirements.passwordRequireNumber ?? true;
    const requireSpecialChar = requirements.passwordRequireSpecialChar ?? false;

    // Build regex pattern based on requirements
    const regexParts: string[] = [];
    if (requireLowercase) regexParts.push('(?=.*[a-z])');
    if (requireUppercase) regexParts.push('(?=.*[A-Z])');
    if (requireNumber) regexParts.push('(?=.*\\d)');
    if (requireSpecialChar) regexParts.push('(?=.*[^a-zA-Z0-9])');

    // Build error message
    const messageParts: string[] = [];
    messageParts.push(`ít nhất ${minLength} ký tự`);
    if (requireLowercase) messageParts.push('chữ thường');
    if (requireUppercase) messageParts.push('chữ hoa');
    if (requireNumber) messageParts.push('số');
    if (requireSpecialChar) messageParts.push('ký tự đặc biệt');

    const newPasswordValidation = regexParts.length > 0
        ? z.string()
            .min(minLength, { message: `Mật khẩu phải từ ${minLength} ký tự trở lên.` })
            .regex(new RegExp(`^${regexParts.join('')}.{${minLength},}$`), {
                message: `Mật khẩu phải có ${messageParts.join(', ')}.`
            })
        : z.string()
            .min(minLength, { message: `Mật khẩu phải từ ${minLength} ký tự trở lên.` });

    return z.object({
        password: z.string().min(1, { message: "Mật khẩu hiện tại không được để trống" }),
        newPassword: newPasswordValidation,
        newPasswordMatch: z.string().min(1, { message: "Xác nhận mật khẩu không được để trống" }),
    }).refine((data) => data.newPassword === data.newPasswordMatch, {
        message: "Mật khẩu mới không khớp",
        path: ["newPasswordMatch"],
    });
};

// Default schema (for backward compatibility)
export const changePasswordSchema = createChangePasswordSchema();

export type ChangePasswordFormData = z.infer<ReturnType<typeof createChangePasswordSchema>>;

// Upload Form Schema
export const uploadSchema = z.object({
    image: z.instanceof(FileList).refine(files => files?.length === 1, 'Image is required.'),
    imageTitle: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
    imageCategory: z.string().min(1, 'Category is required'),
    location: z.string().optional(),
    cameraModel: z.string().optional(),
});

export type UploadFormValues = z.infer<typeof uploadSchema>;

