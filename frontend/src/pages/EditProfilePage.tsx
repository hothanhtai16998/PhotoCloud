import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "@/stores/useUserStore";
import Header from "@/components/Header";
import { useProfileEdit } from "./profile/hooks/useProfileEdit";
import { ProfileForm } from "./profile/components/ProfileForm";
import { PasswordForm } from "./profile/components/PasswordForm";
import { ActiveSessions } from "./profile/components/ActiveSessions";
import { t } from "@/i18n";
import "./EditProfilePage.css";

// Profile settings section IDs
const SECTION_IDS = {
    EDIT_PROFILE: 'edit-profile',
    CHANGE_PASSWORD: 'change-password',
    ACTIVE_SESSIONS: 'active-sessions',
    DOWNLOAD_HISTORY: 'download-history',
} as const;

const ROUTES = {
    SIGNIN: '/signin',
} as const;

// Helper function to determine if a menu item should be shown
function shouldShowMenuItem(itemId: string, isOAuthUser: boolean): boolean {
    // Hide "Change password" for OAuth users
    if (isOAuthUser && itemId === SECTION_IDS.CHANGE_PASSWORD) {
        return false;
    }
    return true;
}

// Helper function to check if user can change password
function canChangePassword(user: { isOAuthUser?: boolean } | null | undefined): boolean {
    return user !== null && user !== undefined && !user.isOAuthUser;
}

// Helper function to check if section is a "coming soon" section
function isComingSoonSection(activeSection: string): boolean {
    return activeSection !== SECTION_IDS.EDIT_PROFILE && 
           activeSection !== SECTION_IDS.CHANGE_PASSWORD && 
           activeSection !== SECTION_IDS.ACTIVE_SESSIONS;
}

type SectionId = typeof SECTION_IDS[keyof typeof SECTION_IDS];

function EditProfilePage() {
    const { user } = useUserStore();
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState<SectionId>(SECTION_IDS.EDIT_PROFILE);

    const {
        isSubmitting,
        passwordError,
        passwordSuccess,
        avatarPreview,
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
    } = useProfileEdit();

    useEffect(() => {
        if (!user) {
            navigate(ROUTES.SIGNIN);
            return;
        }
        // Set form values when user data is available
        const nameParts = user.displayName?.split(' ') ?? [];

        // Initialize form with user data
        setValue('firstName', nameParts[0] ?? '');
        setValue('lastName', nameParts.slice(1).join(' ') ?? '');
        setValue('email', user.email ?? '');
        setValue('username', user.username ?? '');
        setValue('bio', user.bio ?? '');
        setValue('location', user.location ?? '');
        setValue('phone', user.phone ?? '');
        setValue('personalSite', user.website ?? 'https://');
        setValue('instagram', user.instagram ?? '');
        setValue('twitter', user.twitter ?? '');
    }, [user, navigate, setValue]);

    // Define all available menu items
    const allMenuItems = [
        { id: SECTION_IDS.EDIT_PROFILE, label: t('profile.editInfo') },
        { id: SECTION_IDS.ACTIVE_SESSIONS, label: t('profile.activeSessions') },
        { id: SECTION_IDS.DOWNLOAD_HISTORY, label: t('profile.downloadHistory') },
        { id: SECTION_IDS.CHANGE_PASSWORD, label: t('profile.changePassword') },
    ];

    // Filter menu items based on user type (hide password change for OAuth users)
    const menuItems = allMenuItems.filter(item =>
        shouldShowMenuItem(item.id, user?.isOAuthUser ?? false)
    );

    return (
        <>
            <Header />
            <main className="profile-settings-page">
                <div className="profile-settings-container">
                    {/* Left Sidebar */}
                    <aside className="profile-sidebar">
                        <h2 className="sidebar-title">Cài đặt tài khoản</h2>
                        <nav className="sidebar-nav">
                            {menuItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveSection(item.id)}
                                    className={`sidebar-link ${activeSection === item.id ? 'active' : ''}`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                    </aside>

                    {/* Right Main Content */}
                    <div className="profile-main-content">
                        {activeSection === SECTION_IDS.EDIT_PROFILE && user && (
                            <ProfileForm
                                user={user}
                                avatarPreview={avatarPreview}
                                isUploadingAvatar={isUploadingAvatar}
                                fileInputRef={fileInputRef}
                                bioCharCount={bioCharCount}
                                register={register}
                                handleSubmit={handleSubmit}
                                watch={watch}
                                handleAvatarChange={handleAvatarChange}
                                handleAvatarButtonClick={handleAvatarButtonClick}
                                onSubmit={onSubmit}
                                isSubmitting={isSubmitting}
                            />
                        )}

                        {activeSection === SECTION_IDS.CHANGE_PASSWORD && canChangePassword(user) && (
                            <PasswordForm
                                register={registerPassword}
                                handleSubmit={handlePasswordSubmit}
                                errors={passwordErrors}
                                onSubmit={onPasswordSubmit}
                                isSubmitting={isSubmitting}
                                passwordError={passwordError}
                                passwordSuccess={passwordSuccess}
                            />
                        )}

                        {activeSection === SECTION_IDS.ACTIVE_SESSIONS && (
                            <ActiveSessions />
                        )}

                        {isComingSoonSection(activeSection) && (
                            <div className="coming-soon">
                                <h2>{menuItems.find(item => item.id === activeSection)?.label}</h2>
                                <p>Phần này sẽ sớm ra mắt.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}

export default EditProfilePage;
