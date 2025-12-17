import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { UseFormRegister, UseFormHandleSubmit, UseFormWatch } from 'react-hook-form';
import type { ProfileFormData } from '@/types/forms';
import type { User } from '@/types/user';
import { t } from '@/i18n';

interface ProfileFormProps {
  user: User;
  avatarPreview: string | null;
  isUploadingAvatar: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  bioCharCount: number;
  register: UseFormRegister<ProfileFormData>;
  handleSubmit: UseFormHandleSubmit<ProfileFormData>;
  watch: UseFormWatch<ProfileFormData>;
  handleAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAvatarButtonClick: () => void;
  onSubmit: (data: ProfileFormData) => void;
  isSubmitting: boolean;
}

export const ProfileForm = ({
  user,
  avatarPreview,
  isUploadingAvatar,
  fileInputRef,
  bioCharCount,
  register,
  handleSubmit,
  handleAvatarChange,
  handleAvatarButtonClick,
  onSubmit,
  isSubmitting,
}: ProfileFormProps) => {
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="profile-form">

      {/* Profile Image Section */}
      <div className="profile-image-section">
        <div className="profile-image-container">
          <div className="profile-image-wrapper">
            {avatarPreview ? (
              <img src={avatarPreview} alt={t('profile.preview')} className="profile-image" />
            ) : user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.displayName} className="profile-image" />
            ) : (
              <div className="profile-image-placeholder">
                {user.displayName?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase()}
              </div>
            )}
            {isUploadingAvatar && (
              <div className="image-upload-overlay">
                <div className="upload-spinner"></div>
                <p className="upload-text">{t('common.loading')}</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
            disabled={user?.isOAuthUser}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="change-image-btn"
            onClick={handleAvatarButtonClick}
            disabled={isUploadingAvatar || user?.isOAuthUser}
            loading={isUploadingAvatar}
          >
            {t('profile.changeAvatar')}
          </Button>
          {user?.isOAuthUser && (
            <p className="field-hint" style={{ fontSize: '0.8125rem', color: '#767676', marginTop: '8px', textAlign: 'center' }}>
              {t('profile.oauthAvatarNote')}
            </p>
          )}
        </div>

        <div className="profile-basic-info">
          <div className="form-row">
            <div className="form-field">
              <Label htmlFor="firstName">{t('profile.firstName')}</Label>
              <Input id="firstName" {...register('firstName')} />
            </div>
            <div className="form-field">
              <Label htmlFor="lastName">{t('profile.lastName')}</Label>
              <Input id="lastName" {...register('lastName')} />

            </div>
          </div>
          <div className="form-field">
            <Label htmlFor="email">{t('admin.email')}</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              readOnly={user?.isOAuthUser}
              className={user?.isOAuthUser ? 'readonly-field' : ''}
            />
            {user?.isOAuthUser && (
              <p className="field-hint" style={{ fontSize: '0.8125rem', color: '#767676', marginTop: '4px' }}>
                {t('profile.oauthEmailNote')}
              </p>
            )}
          </div>
          <div className="form-field">
            <Label htmlFor="username">{t('auth.username')}</Label>
            <Input id="username" {...register('username')} readOnly />

          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="form-section">
        <h3 className="section-title">{t('profile.about')}</h3>
        <div className="form-field">
          <Label htmlFor="location">{t('image.location')}</Label>
          <Input id="location" {...register('location')} placeholder="e.g., New York, USA" />
        </div>
        <div className="form-field">
          <Label htmlFor="phone">{t('profile.phone')}</Label>
          <Input id="phone" {...register('phone')} type="tel" placeholder="e.g., +1 234 567 8900" />
        </div>
        <div className="form-field">
          <Label htmlFor="personalSite">{t('profile.personalSite')}</Label>
          <Input id="personalSite" {...register('personalSite')} placeholder="https://" />
        </div>
        <div className="form-field">
          <Label htmlFor="bio">{t('profile.bio')}</Label>
          <textarea
            id="bio"
            {...register('bio')}
            className="bio-textarea"
            maxLength={500}
            placeholder={t('profile.bioPlaceholder')}
          />
          <div className="char-counter">{bioCharCount}</div>
        </div>
      </div>

      {/* Social Section */}
      <div className="form-section">
        <h3 className="section-title">{t('profile.social')}</h3>
        <div className="form-row">
          <div className="form-field">
            <Label htmlFor="instagram">{t('profile.instagramAccount')}</Label>
            <div className="input-with-prefix">
              <span className="input-prefix">@</span>
              <Input id="instagram" {...register('instagram')} placeholder="username" />
            </div>
            <p className="field-hint">{t('profile.instagramHint')}</p>
          </div>
          <div className="form-field">
            <Label htmlFor="twitter">{t('profile.twitterAccount')}</Label>
            <div className="input-with-prefix">
              <span className="input-prefix">@</span>
              <Input id="twitter" {...register('twitter')} placeholder="username" />
            </div>
            <p className="field-hint">{t('profile.twitterHint')}</p>
          </div>
        </div>
      </div>


      {/* Submit Button */}
      <div className="form-actions">
        <Button type="submit" loading={isSubmitting} className="update-btn">
          {t('profile.updateAccount')}
        </Button>
      </div>
    </form>
  );
};

