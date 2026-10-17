import { getAdminIntlLocale, adminText, useAdminLocale } from '@/pages/admin/adminLocale';
import { useEffect, useState } from 'react';
import { CalendarOff, Plus, Save, Trash2 } from 'lucide-react';
import { bookingService, type BookingAvailability } from '@/services/bookingService';
import { getErrorMessage } from '@/lib/utils';
import './AdminBookingAvailability.css';

const names = [adminText("Chủ nhật"), adminText("Thứ 2"), adminText("Thứ 3"), adminText("Thứ 4"), adminText("Thứ 5"), adminText("Thứ 6"), adminText("Thứ 7")];
export function AdminBookingAvailability({ onDirty }: { onDirty: (dirty: boolean) => void }) {
  useAdminLocale();
  const [draft, setDraft] = useState<BookingAvailability | null>(null);
  const [saved, setSaved] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [date, setDate] = useState('');
  const dirty = draft !== null && JSON.stringify(draft) !== saved;
  const load = async () => {
    setLoading(true); setError('');
    try { const { availability } = await bookingService.getAvailability(); setDraft(availability); setSaved(JSON.stringify(availability)); }
    catch (e) { setError(getErrorMessage(e, adminText("Không thể tải lịch làm việc."))); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => { onDirty(dirty); return () => onDirty(false); }, [dirty, onDirty]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const update = (next: BookingAvailability) => { setDraft(next); setError(''); setMessage(''); };
  if (loading) return <p className="pc-availability" role="status">{adminText("Đang tải lịch làm việc…")}</p>;
  if (!draft) return <div className="pc-availability" role="alert"><p>{error}</p><button className="admin-btn" onClick={() => void load()}>{adminText("Thử lại")}</button></div>;
  return <form className="pc-availability" onSubmit={async (event) => {
    event.preventDefault(); if (busy) return;
    if (draft.weekly.some(day => day.enabled && (!day.startTime || !day.endTime || day.startTime >= day.endTime))) { setError(adminText("Giờ kết thúc phải sau giờ bắt đầu ở mỗi ngày nhận lịch.")); return; }
    setBusy(true); setError(''); setMessage('');
    try { await bookingService.updateAvailability(draft); setSaved(JSON.stringify(draft)); setMessage(adminText("Đã lưu lịch làm việc và ngày nghỉ.")); }
    catch (e) { setError(getErrorMessage(e, adminText("Không thể lưu lịch. Nội dung đã nhập được giữ lại."))); }
    finally { setBusy(false); }
  }}>
    <header><h2>{adminText("Lịch làm việc và ngày nghỉ")}</h2><p>{adminText("Chọn ngày nhận lịch và khung giờ làm việc của studio.")}</p><span className="pc-availability-zone">{adminText("Múi giờ: Việt Nam (UTC+7)")}</span></header>
    <fieldset disabled={busy}>
      <section><h3>{adminText("Khung giờ hằng tuần")}</h3><p>{adminText("Tắt ngày studio nghỉ. Khung giờ được áp dụng lặp lại mỗi tuần.")}</p>
        {[1, 2, 3, 4, 5, 6, 0].map(weekday => {
          const day = draft.weekly.find(item => item.weekday === weekday);
          if (!day) return null;
          const changeDay = (patch: Partial<typeof day>) => update({ ...draft, weekly: draft.weekly.map(item => item.weekday === weekday ? { ...item, ...patch } : item) });
          return <div className="pc-availability-day" key={weekday}>
            <label className="pc-availability-switch"><input type="checkbox" role="switch" checked={day.enabled} onChange={e => changeDay({ enabled: e.target.checked })} /><span>{adminText(names[weekday])}</span></label>
            <span className={`pc-availability-status ${day.enabled ? 'is-open' : ''}`}>{day.enabled ? adminText("Nhận lịch") : adminText("Ngày nghỉ")}</span>
            <div className="pc-availability-hours"><label><span>{adminText("Từ")}</span><input type="time" aria-label={adminText("Giờ bắt đầu {0}", { 0: adminText(names[weekday]) })} required={day.enabled} disabled={!day.enabled} value={day.startTime} onChange={e => changeDay({ startTime: e.target.value })} /></label><label><span>{adminText("Đến")}</span><input type="time" aria-label={adminText("Giờ kết thúc {0}", { 0: adminText(names[weekday]) })} required={day.enabled} disabled={!day.enabled} value={day.endTime} onChange={e => changeDay({ endTime: e.target.value })} /></label></div>
          </div>;
        })}
      </section>
      <section className="pc-availability-days-off"><h3><CalendarOff size={20} />  {adminText("Ngày nghỉ riêng")}</h3><p>{adminText("Studio không nhận yêu cầu đặt lịch mới vào các ngày này.")}</p>
        <div className="pc-availability-add"><label>{adminText("Chọn ngày nghỉ")}<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label><button type="button" className="admin-btn" disabled={!date} onClick={() => {
          if (draft.blockedDates.some(item => item.date.slice(0, 10) === date)) { setError(adminText("Ngày này đã có trong danh sách nghỉ.")); return; }
          update({ ...draft, blockedDates: [...draft.blockedDates, { date }].sort((a, b) => a.date.localeCompare(b.date)) }); setDate('');
        }}><Plus size={17} />  {adminText("Thêm ngày nghỉ")}</button></div>
        {draft.blockedDates.length ? <ul>{draft.blockedDates.map((item, index) => <li key={`${item.date}-${index}`}><div><strong>{new Intl.DateTimeFormat(getAdminIntlLocale(), { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date(item.date))}</strong>{item.reason && <span>{item.reason}</span>}</div><button type="button" className="admin-btn" aria-label={adminText("Xóa ngày nghỉ {0}", { 0: item.date.slice(0, 10) })} onClick={() => update({ ...draft, blockedDates: draft.blockedDates.filter((_, i) => i !== index) })}><Trash2 size={16} />  {adminText("Xóa")}</button></li>)}</ul> : <p className="pc-availability-empty">{adminText("Chưa có ngày nghỉ riêng. Lịch nhận yêu cầu theo khung giờ hằng tuần.")}</p>}
      </section>
    </fieldset>
    {error && <p role="alert" className="admin-form-error">{error}</p>}{message && <p role="status">{message}</p>}
    <footer><span>{dirty ? adminText("Có thay đổi chưa lưu") : adminText("Lịch làm việc đã được lưu")}</span><div><button type="button" className="admin-btn" disabled={!dirty || busy} onClick={() => { setDraft(JSON.parse(saved)); setError(''); setMessage(''); }}>{adminText("Bỏ thay đổi")}</button><button className="admin-btn primary" disabled={!dirty || busy}><Save size={17} />{busy ? adminText("Đang lưu…") : adminText("Lưu lịch rảnh")}</button></div></footer>
  </form>;
}
