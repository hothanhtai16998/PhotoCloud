import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { UseFormRegister, UseFormHandleSubmit, FieldErrors } from 'react-hook-form';
import type { ChangePasswordFormData } from '@/types/forms';
import { t } from '@/i18n';

interface PasswordFormProps {
  register: UseFormRegister<ChangePasswordFormData>;
  handleSubmit: UseFormHandleSubmit<ChangePasswordFormData>;
  errors: FieldErrors<ChangePasswordFormData>;
  onSubmit: (data: ChangePasswordFormData) => void;
  isSubmitting: boolean;
  passwordError: string | null;
  passwordSuccess: boolean;
}

export const PasswordForm = ({
  register,
  handleSubmit,
  errors,
  onSubmit,
  isSubmitting,
  passwordError,
  passwordSuccess,
}: PasswordFormProps) => {
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="change-password-form">

      <div className="form-field">
        <Label htmlFor="password">{t('profile.currentPassword')}</Label>
        <Input
          id="password"
          type="password"
          {...register('password')}
          autoFocus
        />
        {errors.password && (
          <p className="field-error">{errors.password.message}</p>
        )}
      </div>

      <div className="form-field">
        <Label htmlFor="newPassword">{t('profile.newPassword')}</Label>
        <Input
          id="newPassword"
          type="password"
          {...register('newPassword')}
        />
        {errors.newPassword && (
          <p className="field-error">{errors.newPassword.message}</p>
        )}
      </div>

      <div className="form-field">
        <Label htmlFor="newPasswordMatch">{t('profile.confirmPassword')}</Label>
        <Input
          id="newPasswordMatch"
          type="password"
          {...register('newPasswordMatch')}
        />
        {errors.newPasswordMatch && (
          <p className="field-error">{errors.newPasswordMatch.message}</p>
        )}
      </div>

      {passwordError && (
        <div className="password-error-message">
          {passwordError}
        </div>
      )}

      {passwordSuccess && (
        <div className="password-success-message">
          {t('profile.passwordChanged')}
        </div>
      )}

      <div className="form-actions">
        <Button
          type="submit"
          loading={isSubmitting}
          className="update-btn"
        >
          {t('profile.changePassword')}
        </Button>
      </div>
    </form>
  );
};





