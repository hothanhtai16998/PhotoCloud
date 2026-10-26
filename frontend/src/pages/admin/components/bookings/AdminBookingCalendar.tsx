import { formatRequestedTime } from '@/utils/bookingTime';
import { getAdminIntlLocale, adminText, useAdminLocale } from '@/pages/admin/adminLocale';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { bookingService } from '@/services/bookingService';
import type { Booking } from '@/types/booking';
import { BookingDetail } from './AdminBookingRequests';
import { adminError } from '../../hooks/useAdminResource';
import {
  bookingDate,
  bookingStatusLabels,
  bookingTone,
} from './bookingPresentation';
import './AdminBookingCalendar.css';

// Calendar arithmetic uses UTC civil dates, never local-midnight ISO conversion.
const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
const parse = (key: string) => new Date(key + 'T12:00:00Z');
const keyOf = (date: Date) => date.toISOString().slice(0, 10);
const shift = (key: string, days: number) => {
  const d = parse(key);
  d.setUTCDate(d.getUTCDate() + days);
  return keyOf(d);
};
const dateOf = (booking: Booking) =>
  (booking.confirmedDate || booking.requestedDate).slice(0, 10);
const closed = (booking: Booking) => bookingTone(booking.status) === 'closed';
const timeOf = (booking: Booking) =>
  booking.confirmedDate
    ? [booking.confirmedStartTime, booking.confirmedEndTime]
        .filter(Boolean)
        .join(' – ') || adminText("Chưa chốt giờ")
    : adminText(formatRequestedTime(booking)) || adminText("Chưa chọn giờ");

export function AdminBookingCalendar() {
  useAdminLocale();
  const [anchor, setAnchor] = useState(today);
  const [mode, setMode] = useState<'day' | 'week' | 'month'>('month');
  const [filter, setFilter] = useState('active');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<Booking | null>(null);
  useEffect(() => {
    let current = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const items: Booking[] = [];
        let page = 1,
          pages = 1;
        do {
          const result = await bookingService.getAdmin({ page, limit: 100 });
          items.push(...result.bookings);
          pages = result.pagination.pages;
          page++;
        } while (page <= pages && current);
        if (current) setBookings(items);
      } catch (cause) {
        if (current) setError(adminError(cause));
      } finally {
        if (current) setLoading(false);
      }
    }
    void load();
    return () => {
      current = false;
    };
  }, [revision]);
  const date = parse(anchor);
  const month = anchor.slice(0, 7);
  const first = month + '-01';
  const weekStart = shift(anchor, -date.getUTCDay());
  const start =
    mode === 'month'
      ? shift(first, -parse(first).getUTCDay())
      : mode === 'week'
        ? weekStart
        : anchor;
  const end =
    mode === 'month'
      ? shift(start, 41)
      : mode === 'week'
        ? shift(start, 6)
        : anchor;
  const visible = bookings
    .filter(
      (item) =>
        filter === 'all' || (filter === 'closed' ? closed(item) : !closed(item))
    )
    .sort((a, b) =>
      (dateOf(a) + timeOf(a)).localeCompare(dateOf(b) + timeOf(b))
    );
  const inRange = visible.filter(
    (item) => dateOf(item) >= start && dateOf(item) <= end
  );
  const nearest = [...visible].sort(
    (a, b) =>
      Math.abs(parse(dateOf(a)).getTime() - date.getTime()) -
      Math.abs(parse(dateOf(b)).getTime() - date.getTime())
  )[0];
  const navigate = (direction: number) => {
    if (mode === 'month') {
      const next = parse(first);
      next.setUTCMonth(next.getUTCMonth() + direction);
      setAnchor(keyOf(next));
    } else setAnchor(shift(anchor, direction * (mode === 'week' ? 7 : 1)));
  };
  const event = (item: Booking) => (
    <button
      key={item._id}
      type="button"
      className={'pc-calendar-event ' + bookingTone(item.status)}
      onClick={() => setSelected(item)}
      aria-label={`${item.contact.name}, ${item.packageSnapshot.name}, ${bookingDate(dateOf(item))}, ${adminText(bookingStatusLabels[item.status])}`}
    >
      <span className="pc-calendar-event-time">
        {timeOf(item)} · {item.confirmedDate ? adminText("Đã chốt") : adminText("Dự kiến")}
      </span>
      <strong>{item.packageSnapshot.name}</strong>
      <span>{item.contact.name}</span>
      <span className={'booking-state ' + bookingTone(item.status)}>
        {adminText(bookingStatusLabels[item.status])}
      </span>
    </button>
  );
  return (
    <section className="pc-calendar" aria-label={adminText("Lịch chụp")}>
      <div className="pc-calendar-heading">
        <div>
          <h2>{adminText("Lịch chụp")}</h2>
          <p>
             {adminText("Ngày đã chốt được ưu tiên. Yêu cầu chưa chốt được ghi rõ là dự kiến.")} </p>
        </div>
        <button
          className="admin-btn"
          disabled={loading}
          onClick={() => setRevision((v) => v + 1)}
        >
          <RefreshCw size={16} />  {adminText("Làm mới")} </button>
      </div>
      <div className="pc-calendar-toolbar">
        <div className="pc-calendar-navigation">
          <button
            className="admin-btn"
            aria-label={adminText("Khoảng trước")}
            onClick={() => navigate(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <strong aria-live="polite">
            {mode === 'month'
              ? date.toLocaleDateString(getAdminIntlLocale(), {
                  month: 'long',
                  year: 'numeric',
                  timeZone: 'UTC',
                })
              : mode === 'week'
                ? `${bookingDate(start)} – ${bookingDate(end)}`
                : bookingDate(anchor)}
          </strong>
          <button
            className="admin-btn"
            aria-label={adminText("Khoảng sau")}
            onClick={() => navigate(1)}
          >
            <ChevronRight size={18} />
          </button>
          <button className="admin-btn" onClick={() => setAnchor(today())}>
             {adminText("Hôm nay")} </button>
        </div>
        <div
          className="pc-calendar-modes"
          role="group"
          aria-label={adminText("Chế độ xem lịch")}
        >
          {(['day', 'week', 'month'] as const).map((value) => (
            <button
              className={'admin-btn ' + (mode === value ? 'primary' : '')}
              aria-pressed={mode === value}
              key={value}
              onClick={() => setMode(value)}
            >
              {value === 'day' ? adminText("Ngày") : value === 'week' ? adminText("Tuần") : adminText("Tháng")}
            </button>
          ))}
        </div>
        <label className="pc-calendar-picker">
           {adminText("Chọn ngày")} <input
            type="date"
            className="admin-input"
            value={anchor}
            onChange={(e) => {
              if (e.target.value) setAnchor(e.target.value);
            }}
          />
        </label>
        <label className="pc-calendar-filter">
           {adminText("Hiển thị")} <select
            aria-label={adminText("Hiển thị")}
            className="admin-input"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="active">{adminText("Lịch đang hoạt động và hoàn thành")}</option>
            <option value="all">{adminText("Tất cả trạng thái")}</option>
            <option value="closed">{adminText("Đã hủy, từ chối và hết hạn")}</option>
          </select>
        </label>
      </div>
      <div className="pc-calendar-legend">
        <span className="booking-state pending">{adminText("Chờ xử lý")}</span>
        <span className="booking-state confirmed">
           {adminText("Đã xác nhận / Hoàn thành")} </span>
        <span className="booking-state closed">{adminText("Đã hủy / Hết hạn")}</span>
        <span>{adminText("Múi giờ Việt Nam")}</span>
      </div>
      {loading ? (
        <p role="status">{adminText("Đang tải lịch chụp…")}</p>
      ) : error ? (
        <div role="alert">
          <p>{error}</p>
          <button
            className="admin-btn"
            onClick={() => setRevision((v) => v + 1)}
          >
             {adminText("Thử lại")} </button>
        </div>
      ) : (
        <>
          {mode === 'month' ? (
            <div className="pc-calendar-scroll">
              <div className="pc-calendar-grid">
                {Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(getAdminIntlLocale(), { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 7 + index)))).map((day) => (
                  <div className="pc-calendar-weekday" key={day}>
                    {day}
                  </div>
                ))}
                {Array.from({ length: 42 }, (_, i) => {
                  const key = shift(start, i);
                  const items = inRange.filter((item) => dateOf(item) === key);
                  return (
                    <div
                      key={key}
                      className={
                        'pc-calendar-cell ' +
                        (!key.startsWith(month) ? 'muted' : '') +
                        (key === today() ? ' today' : '')
                      }
                    >
                      <button
                        className="pc-calendar-date"
                        aria-label={adminText("Xem ngày ") + bookingDate(key)}
                        aria-current={key === today() ? 'date' : undefined}
                        onClick={() => {
                          setAnchor(key);
                          setMode('day');
                        }}
                      >
                        {parse(key).getUTCDate()}
                      </button>
                      {items.slice(0, 3).map(event)}
                      {items.length > 3 && (
                        <button
                          className="admin-btn"
                          onClick={() => {
                            setAnchor(key);
                            setMode('day');
                          }}
                        >
                          +{items.length - 3}  {adminText("lịch khác")} </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="pc-calendar-agenda">
              {Array.from({ length: mode === 'week' ? 7 : 1 }, (_, i) => {
                const key = shift(start, i);
                const items = inRange.filter((item) => dateOf(item) === key);
                return (
                  <section
                    className="pc-calendar-agenda-row"
                    key={key}
                    aria-label={adminText("Lịch ngày ") + bookingDate(key)}
                  >
                    <div className="pc-calendar-day-label">
                      <strong>
                        {parse(key).toLocaleDateString(getAdminIntlLocale(), {
                          weekday: 'long',
                          timeZone: 'UTC',
                        })}
                      </strong>
                      <span>{bookingDate(key)}</span>
                      {key === today() && <small>{adminText("Hôm nay")}</small>}
                    </div>
                    <div>
                      {items.length ? (
                        items.map(event)
                      ) : (
                        <p className="pc-calendar-free">
                           {adminText("Không có lịch chụp trong ngày.")} </p>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
          {!inRange.length && (
            <div className="pc-calendar-empty" role="status">
              <strong>{adminText("Không có lịch phù hợp trong khoảng thời gian này.")}</strong>
              <p>
                {nearest
                  ? adminText("Lịch gần nhất theo bộ lọc: {0} · {1}.", { 0: bookingDate(dateOf(nearest)), 1: nearest.contact.name })
                  : adminText("Bạn có thể chọn ngày khác hoặc đổi bộ lọc trạng thái.")}
              </p>
              {nearest && (
                <button
                  className="admin-btn primary"
                  onClick={() => setAnchor(dateOf(nearest))}
                >
                   {adminText("Đến lịch gần nhất")} </button>
              )}
            </div>
          )}
        </>
      )}
      {selected && (
        <BookingDetail
          booking={selected}
          onClose={() => setSelected(null)}
          onSaved={() => setRevision((v) => v + 1)}
        />
      )}
    </section>
  );
}
