import { useState, useRef, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUserStore } from '@/stores/useUserStore';
import { userService } from '@/services/userService';
import { toast } from 'sonner';
import { createChangePasswordSchema, type ProfileFormData, type ChangePasswordFormData } from '@/types/forms';
import { useSiteSettings } from '@/hooks/useSiteSettings';

export const useProfileEdit = () => {
  const { user, fetchMe } = useUserStore();
  const { settings } = useSiteSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create dynamic schema based on password requirements
  const changePasswordSchema = useMemo(() => {
    return createChangePasswordSchema({
      passwordMinLength: settings.passwordMinLength || 8,
      passwordRequireUppercase: settings.passwordRequireUppercase ?? true,
      passwordRequireLowercase: settings.passwordRequireLowercase ?? true,
      passwordRequireNumber: settings.passwordRequireNumber ?? true,
      passwordRequireSpecialChar: settings.passwordRequireSpecialChar ?? false,
    });
  }, [settings]);

  // Split displayName into firstName and lastName
  const nameParts = user?.displayName?.split(' ') || [];
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const { register, handleSubmit, setValue, watch } = useForm<ProfileFormData>({
    defaultValues: {
      firstName,
      lastName,
      email: user?.email || '',
      username: user?.username || '',
      location: '',
      phone: '',
      personalSite: 'https://',
      bio: user?.bio || '',
      interests: '',
      instagram: '',
      twitter: '',
      paypalEmail: '',
      showMessageButton: true,
    }
  });

  const bioText = watch('bio') || '';
  const bioCharCount = 500 - bioText.length;

  // Change password form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPasswordForm
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size must be less than 10MB');
        return;
      }

      setSelectedAvatar(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleAvatarButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onSubmit = useCallback(async (data: ProfileFormData) => {
    setIsSubmitting(true);
    setIsUploadingAvatar(!!selectedAvatar);

    try {
      const formData = new FormData();

      // Add text fields
      formData.append('firstName', data.firstName);
      formData.append('lastName', data.lastName);
      formData.append('email', data.email);
      if (data.bio) {
        formData.append('bio', data.bio);
      }
      // Always send location, phone, website, instagram, twitter to allow clearing fields
      formData.append('location', data.location || '');
      formData.append('phone', data.phone || '');
      const websiteValue = data.personalSite && data.personalSite !== 'https://' ? data.personalSite : '';
      formData.append('website', websiteValue);
      formData.append('instagram', data.instagram || '');
      formData.append('twitter', data.twitter || '');

      // Add avatar if selected
      if (selectedAvatar) {
        formData.append('avatar', selectedAvatar);
      }

      await userService.updateProfile(formData);

      // Refresh user data
      await fetchMe();

      // Clear avatar preview and selection
      setAvatarPreview(null);
      setSelectedAvatar(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      toast.success('Cập nhật thông tin thành công');
    } catch (error: unknown) {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to update profile. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
      setIsUploadingAvatar(false);
    }
  }, [selectedAvatar, fetchMe]);

  const onPasswordSubmit = useCallback(async (data: ChangePasswordFormData) => {
    setIsSubmitting(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    try {
      await userService.changePassword(
        data.password,
        data.newPassword,
        data.newPasswordMatch
      );
      setPasswordSuccess(true);
      resetPasswordForm();
      // Clear success message after 3 seconds
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (error: unknown) {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to change password. Please try again.";
      setPasswordError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [resetPasswordForm]);

  return {
    user,
    isSubmitting,
    passwordError,
    passwordSuccess,
    avatarPreview,
    selectedAvatar,
    isUploadingAvatar,
    fileInputRef,
    register,
    handleSubmit,
    setValue,
    watch,
    bioCharCount,
    registerPassword,
    handlePasswordSubmit,
    passwordErrors,
    handleAvatarChange,
    handleAvatarButtonClick,
    onSubmit,
    onPasswordSubmit,
  };
};





