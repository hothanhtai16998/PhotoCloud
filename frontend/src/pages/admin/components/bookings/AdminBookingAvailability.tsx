import { useEffect, useState } from 'react';
import { CalendarOff, Plus, Save, Trash2 } from 'lucide-react';
import { bookingService, type BookingAvailability } from '@/services/bookingService';
import { getErrorMessage } from '@/lib/utils';
import './AdminBookingAvailability.css';

const names = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
export function AdminBookingAvailability({ onDirty }: { onDirty: (dirty: boolean) => void }) {
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
    catch (e) { setError(getErrorMessage(e, 'Không thể tải lịch làm việc.')); }
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
  if (loading) return <p className="pc-availability" role="status">Đang tải lịch làm việc…</p>;
  if (!draft) return <div className="pc-availability" role="alert"><p>{error}</p><button className="admin-btn" onClick={() => void load()}>Thử lại</button></div>;
  return <form className="pc-availability" onSubmit={async (event) => {
    event.preventDefault(); if (busy) return;
    if (draft.weekly.some(day => day.enabled && (!day.startTime || !day.endTime || day.startTime >= day.endTime))) { setError('Giờ kết thúc phải sau giờ bắt đầu ở mỗi ngày nhận lịch.'); return; }
    setBusy(true); setError(''); setMessage('');
    try { await bookingService.updateAvailability(draft); setSaved(JSON.stringify(draft)); setMessage('Đã lưu lịch làm việc và ngày nghỉ.'); }
    catch (e) { setError(getErrorMessage(e, 'Không thể lưu lịch. Nội dung đã nhập được giữ lại.')); }
    finally { setBusy(false); }
  }}>
    <header><h2>Lịch làm việc và ngày nghỉ</h2><p>Chọn ngày nhận lịch và khung giờ làm việc của studio.</p><span className="pc-availability-zone">Múi giờ: Việt Nam (UTC+7)</span></header>
    <fieldset disabled={busy}>
      <section><h3>Khung giờ hằng tuần</h3><p>Tắt ngày studio nghỉ. Khung giờ được áp dụng lặp lại mỗi tuần.</p>
        {[1, 2, 3, 4, 5, 6, 0].map(weekday => {
          const day = draft.weekly.find(item => item.weekday === weekday);
          if (!day) return null;
          const changeDay = (patch: Partial<typeof day>) => update({ ...draft, weekly: draft.weekly.map(item => item.weekday === weekday ? { ...item, ...patch } : item) });
          return <div className="pc-availability-day" key={weekday}>
            <label className="pc-availability-switch"><input type="checkbox" role="switch" checked={day.enabled} onChange={e => changeDay({ enabled: e.target.checked })} /><span>{names[weekday]}</span></label>
            <span className={`pc-availability-status ${day.enabled ? 'is-open' : ''}`}>{day.enabled ? 'Nhận lịch' : 'Ngày nghỉ'}</span>
            <div className="pc-availability-hours"><label><span>Từ</span><input type="time" aria-label={`Giờ bắt đầu ${names[weekday]}`} required={day.enabled} disabled={!day.enabled} value={day.startTime} onChange={e => changeDay({ startTime: e.target.value })} /></label><label><span>Đến</span><input type="time" aria-label={`Giờ kết thúc ${names[weekday]}`} required={day.enabled} disabled={!day.enabled} value={day.endTime} onChange={e => changeDay({ endTime: e.target.value })} /></label></div>
          </div>;
        })}
      </section>
      <section className="pc-availability-days-off"><h3><CalendarOff size={20} /> Ngày nghỉ riêng</h3><p>Studio không nhận yêu cầu đặt lịch mới vào các ngày này.</p>
        <div className="pc-availability-add"><label>Chọn ngày nghỉ<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label><button type="button" className="admin-btn" disabled={!date} onClick={() => {
          if (draft.blockedDates.some(item => item.date.slice(0, 10) === date)) { setError('Ngày này đã có trong danh sách nghỉ.'); return; }
          update({ ...draft, blockedDates: [...draft.blockedDates, { date }].sort((a, b) => a.date.localeCompare(b.date)) }); setDate('');
        }}><Plus size={17} /> Thêm ngày nghỉ</button></div>
        {draft.blockedDates.length ? <ul>{draft.blockedDates.map((item, index) => <li key={`${item.date}-${index}`}><div><strong>{new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date(item.date))}</strong>{item.reason && <span>{item.reason}</span>}</div><button type="button" className="admin-btn" aria-label={`Xóa ngày nghỉ ${item.date.slice(0, 10)}`} onClick={() => update({ ...draft, blockedDates: draft.blockedDates.filter((_, i) => i !== index) })}><Trash2 size={16} /> Xóa</button></li>)}</ul> : <p className="pc-availability-empty">Chưa có ngày nghỉ riêng. Lịch nhận yêu cầu theo khung giờ hằng tuần.</p>}
      </section>
    </fieldset>
    {error && <p role="alert" className="admin-form-error">{error}</p>}{message && <p role="status">{message}</p>}
    <footer><span>{dirty ? 'Có thay đổi chưa lưu' : 'Lịch làm việc đã được lưu'}</span><div><button type="button" className="admin-btn" disabled={!dirty || busy} onClick={() => { setDraft(JSON.parse(saved)); setError(''); setMessage(''); }}>Bỏ thay đổi</button><button className="admin-btn primary" disabled={!dirty || busy}><Save size={17} />{busy ? 'Đang lưu…' : 'Lưu lịch rảnh'}</button></div></footer>
  </form>;
}
