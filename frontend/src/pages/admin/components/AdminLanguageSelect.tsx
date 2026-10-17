import { adminText, setAdminLocale, useAdminLocale } from '../adminLocale';
export function AdminLanguageSelect() {
  const locale = useAdminLocale();
  return <label className="admin-language-picker"><span>{adminText('Ngôn ngữ quản trị')}</span><select aria-label={adminText('Ngôn ngữ quản trị')} value={locale} onChange={event => { if (event.target.value === 'vi' || event.target.value === 'en') setAdminLocale(event.target.value); }}><option value="vi">Tiếng Việt</option><option value="en">English</option></select></label>;
}
