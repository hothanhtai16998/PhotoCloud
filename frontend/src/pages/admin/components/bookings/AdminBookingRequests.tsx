import { formatRequestedTime } from '@/utils/bookingTime';
import { adminText, useAdminLocale } from '@/pages/admin/adminLocale';
import { useCallback, useId, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  ArrowUpRight,
  CalendarDays,
  Phone,
  MapPin,
  CalendarClock,
  CheckCircle2,
  CircleX,
  MessageSquare,
  ClipboardCheck,
  ChevronRight,
  Clock3,
  SearchCheck,
  CalendarCheck2,
  CircleCheckBig,
  Hourglass,
} from 'lucide-react';
import { toast } from 'sonner';
import { bookingService } from '@/services/bookingService';
import type { Booking, BookingStatus } from '@/types/booking';
import { useAdminResource, adminError } from '../../hooks/useAdminResource';
import { AdminFeedback, AdminPagination, AdminEmpty } from '../AdminPrimitives';
import { AdminModal } from '../AdminModal';
import {
  bookingStatusLabels as labels,
  bookingTimeLabels,
  bookingTone,
  bookingNextStatuses,
  bookingDate,
  bookingMoney,
} from './bookingPresentation';
import './AdminBookingRequests.css';
import './BookingDetailModal.css';

export function AdminBookingRequests() {
  useAdminLocale();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const query = params.get('q') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [search, setSearch] = useState(query);
  const loader = useCallback(
    () =>
      bookingService.getAdmin({
        page,
        limit: 20,
        status: status || undefined,
        search: query || undefined,
      }),
    [page, status, query]
  );
  const { data, loading, error, reload } = useAdminResource(loader);
  const [selected, setSelected] = useState<Booking | null>(null);
  const changeFilter = (value: string) => {
    const next = new URLSearchParams(params);
    next.delete('page');
    if (value) next.set('status', value);
    else next.delete('status');
    setParams(next);
  };
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const next = new URLSearchParams(params);
    next.delete('page');
    if (search.trim()) next.set('q', search.trim());
    else next.delete('q');
    setParams(next);
  };
  const bookings = data?.bookings || [];
  return (
    <section
      className="booking-requests"
      aria-label={adminText("Danh sách yêu cầu đặt lịch")}
    >
      <div className="booking-requests-heading">
        <div>
          <h2>{adminText("Yêu cầu đặt lịch")}</h2>
          <p>{adminText("Kiểm tra thông tin khách hàng và xác nhận buổi chụp.")}</p>
        </div>
        <button
          className="admin-btn"
          onClick={() => void reload()}
          disabled={loading}
        >
          <RefreshCw size={16} />
           {adminText("Làm mới")} </button>
      </div>
      <div className="booking-request-filters">
        <div
          className="booking-quick-filters"
          role="group"
          aria-label={adminText("Lọc nhanh trạng thái")}
        >
          {[
            ['', adminText("Tất cả")],
            ['pending', adminText("Chờ xử lý")],
            ['confirmed', adminText("Đã xác nhận")],
          ].map(([value, label]) => (
            <button
              key={value}
              className={status === value ? 'selected' : ''}
              aria-pressed={status === value}
              onClick={() => changeFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="booking-status-filter">
          <span className="sr-only">{adminText("Trạng thái yêu cầu")}</span>
          <select
            aria-label={adminText("Trạng thái yêu cầu")}
            value={status}
            onChange={(e) => changeFilter(e.target.value)}
          >
            <option value="">{adminText("Tất cả trạng thái")}</option>
            {Object.entries(labels).map(([key, value]) => (
              <option value={key} key={key}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <form onSubmit={submitSearch} className="booking-request-search">
          <label>
            <Search size={17} />
            <input
              aria-label={adminText("Tìm yêu cầu đặt lịch")}
              type="search"
              placeholder={adminText("Tìm mã lịch, tên hoặc số điện thoại…")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <button className="admin-btn" type="submit">
             {adminText("Tìm")} </button>
        </form>
      </div>
      {query && (
        <div className="booking-search-result">
           {adminText("Kết quả cho “")}{query}”
          <button
            className="admin-btn"
            onClick={() => {
              const next = new URLSearchParams(params);
              next.delete('q');
              next.delete('page');
              setSearch('');
              setParams(next);
            }}
          >
             {adminText("Xóa tìm kiếm")} </button>
        </div>
      )}
      <AdminFeedback error={error} retry={() => void reload()} />
      {loading && !data ? (
        <div className="admin-skeleton tall" />
      ) : (
        <>
          <div className="booking-request-table" aria-busy={loading}>
            <table>
              <thead>
                <tr>
                  <th>{adminText("Khách hàng & yêu cầu")}</th>
                  <th>{adminText("Buổi chụp")}</th>
                  <th>{adminText("Thời gian")}</th>
                  <th>{adminText("Trạng thái")}</th>
                  <th>
                    <span className="sr-only">{adminText("Chi tiết")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking._id}>
                    <td>
                      <strong>{booking.contact.name}</strong>
                      <a
                        className="booking-contact-phone"
                        href={'tel:' + booking.contact.phone}
                      >
                        {booking.contact.phone}
                      </a>
                      <small>
                        {booking.bookingCode}  {adminText("· Tạo ngày")}{' '}
                        {bookingDate(booking.createdAt)}
                      </small>
                    </td>
                    <td>
                      <strong>{booking.packageSnapshot.name}</strong>
                      <span>
                        {bookingMoney(booking.packageSnapshot.basePrice)}
                      </span>
                      <small className="booking-location">
                        <MapPin size={13} />
                        {booking.location.address || adminText("Chưa có địa điểm")}
                      </small>
                    </td>
                    <td>
                      <strong>
                        {bookingDate(
                          booking.confirmedDate || booking.requestedDate
                        )}
                      </strong>
                      <span>
                        {booking.confirmedStartTime
                          ? booking.confirmedStartTime +
                            (booking.confirmedEndTime
                              ? ' – ' + booking.confirmedEndTime
                              : '')
                          : adminText(formatRequestedTime(booking)) ||
                            adminText("Chưa chọn giờ")}
                      </span>
                      <small>
                        {booking.confirmedDate
                          ? adminText("Lịch đã chốt")
                          : adminText("Ngày khách mong muốn")}
                      </small>
                    </td>
                    <td>
                      <span
                        className={
                          'booking-state ' + bookingTone(booking.status)
                        }
                      >
                        <i aria-hidden="true" />
                        {adminText(labels[booking.status])}
                      </span>
                    </td>
                    <td>
                      <button
                        className="admin-btn booking-detail-btn"
                        onClick={() => setSelected(booking)}
                        aria-label={adminText("Xem chi tiết ") + booking.bookingCode}
                      >
                         {adminText("Chi tiết")} <ArrowUpRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="booking-request-mobile-list">
            {bookings.map((booking) => (
              <article key={booking._id}>
                <header>
                  <span className="booking-request-code">
                    {booking.bookingCode}
                  </span>
                  <span
                    className={'booking-state ' + bookingTone(booking.status)}
                  >
                    {adminText(labels[booking.status])}
                  </span>
                </header>
                <h3>{booking.contact.name}</h3>
                <p>
                  {booking.packageSnapshot.name} ·{' '}
                  {bookingMoney(booking.packageSnapshot.basePrice)}
                </p>
                <div className="booking-mobile-line">
                  <CalendarDays size={16} />
                  {bookingDate(
                    booking.confirmedDate || booking.requestedDate
                  )}{' '}
                  ·{' '}
                  {booking.confirmedStartTime ||
                    adminText(formatRequestedTime(booking))}
                </div>
                <div className="booking-mobile-line">
                  <Phone size={16} />
                  <a href={'tel:' + booking.contact.phone}>
                    {booking.contact.phone}
                  </a>
                </div>
                <footer>
                  <span>{booking.location.address || adminText("Chưa có địa điểm")}</span>
                  <button
                    className="admin-btn"
                    onClick={() => setSelected(booking)}
                  >
                     {adminText("Chi tiết")} <ArrowUpRight size={16} />
                  </button>
                </footer>
              </article>
            ))}
          </div>
          {!loading && !error && !bookings.length && (
            <AdminEmpty
              title={
                status || query
                  ? adminText("Không có yêu cầu phù hợp")
                  : adminText("Chưa có yêu cầu đặt lịch")
              }
              description={
                status || query
                  ? adminText("Thử đổi trạng thái hoặc từ khóa để tìm lại yêu cầu.")
                  : adminText("Các yêu cầu khách gửi từ website sẽ xuất hiện tại đây.")
              }
            />
          )}
          {data && (
            <AdminPagination
              page={page}
              pages={data.pagination.pages}
              total={data.pagination.total}
              loading={loading}
              onChange={(n) => {
                const next = new URLSearchParams(params);
                next.set('page', String(n));
                setParams(next);
              }}
            />
          )}
        </>
      )}
      {selected && (
        <BookingDetail
          key={selected._id}
          booking={selected}
          onClose={() => setSelected(null)}
          onSaved={() => void reload()}
        />
      )}
    </section>
  );
}

const bookingHistoryIcons = {
  pending: Clock3,
  reviewing: SearchCheck,
  needs_information: MessageSquare,
  confirmed: CalendarCheck2,
  rescheduled: CalendarClock,
  completed: CircleCheckBig,
  cancelled_by_client: CircleX,
  cancelled_by_photographer: CircleX,
  rejected: CircleX,
  expired: Hourglass,
} satisfies Record<BookingStatus, typeof Clock3>;

const bookingActionCopy: Partial<
  Record<BookingStatus, { title: string; description: string; button: string }>
> = {
  reviewing: {
    title: adminText("Xem xét yêu cầu"),
    description: adminText("Đang trao đổi và kiểm tra thông tin của khách."),
    button: adminText("Bắt đầu xem xét"),
  },
  needs_information: {
    title: adminText("Yêu cầu bổ sung"),
    description: adminText("Đề nghị khách cung cấp thông tin còn thiếu."),
    button: adminText("Yêu cầu bổ sung"),
  },
  confirmed: {
    title: adminText("Xác nhận lịch chụp"),
    description: adminText("Chốt ngày và khung giờ cho buổi chụp."),
    button: adminText("Xác nhận lịch chụp"),
  },
  rescheduled: {
    title: adminText("Đổi lịch chụp"),
    description: adminText("Điều chỉnh ngày hoặc giờ đã hẹn với khách."),
    button: adminText("Xác nhận đổi lịch"),
  },
  completed: {
    title: adminText("Hoàn thành buổi chụp"),
    description: adminText("Đánh dấu buổi chụp đã diễn ra và hoàn tất."),
    button: adminText("Xác nhận hoàn thành"),
  },
  cancelled_by_photographer: {
    title: adminText("Hủy lịch chụp"),
    description: adminText("Dừng lịch đã xác nhận và thông báo lý do."),
    button: adminText("Xác nhận hủy lịch"),
  },
  rejected: {
    title: adminText("Từ chối yêu cầu"),
    description: adminText("Không tiếp nhận yêu cầu này; cần có lý do."),
    button: adminText("Xác nhận từ chối"),
  },
};
export function BookingDetail({
  booking,
  onClose,
  onSaved,
}: {
  booking: Booking;
  onClose: () => void;
  onSaved: () => void;
}) {
  useAdminLocale();
  const formId = useId();
  const [detailTab, setDetailTab] = useState<'info' | 'history'>('info');
  const options = bookingNextStatuses(booking.status);
  const [status, setStatus] = useState<BookingStatus | ''>('');
  const [note, setNote] = useState('');
  const [declining, setDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [date, setDate] = useState(
    booking.rescheduleRequest?.requestedDate?.slice(0, 10) ||
      booking.confirmedDate?.slice(0, 10) ||
      booking.requestedDate.slice(0, 10)
  );
  const [start, setStart] = useState(
    booking.rescheduleRequest?.requestedAt
      ? ''
      : booking.confirmedStartTime || ''
  );
  const [end, setEnd] = useState(
    booking.rescheduleRequest?.requestedAt ? '' : booking.confirmedEndTime || ''
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsReason =
    status === 'rejected' || status === 'cancelled_by_photographer';
  const needsSchedule = status === 'confirmed' || status === 'rescheduled';
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!status || busy) return;
    if (needsReason && !note.trim()) {
      setError(adminText("Vui lòng nhập lý do để khách hiểu thay đổi này."));
      return;
    }
    if (needsSchedule && start && end && end <= start) {
      setError(adminText("Giờ kết thúc phải sau giờ bắt đầu."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await bookingService.updateAdmin(booking._id, {
        status,
        note: note.trim() || undefined,
        ...(needsSchedule
          ? {
              confirmedDate: date,
              confirmedStartTime: start || undefined,
              confirmedEndTime: end || undefined,
            }
          : {}),
      });
      toast.success(adminText("Đã cập nhật lịch chụp"));
      onSaved();
      onClose();
    } catch (cause) {
      setError(adminError(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <AdminModal
      open
      title={booking.bookingCode}
      description={adminText("Thông tin yêu cầu đặt lịch chụp")}
      size="lg"
      className="booking-detail-modal"
      onClose={() => {
        if (!busy) onClose();
      }}
      footer={
        <>
          <span className="booking-footer-hint" role="status">
            {detailTab === 'history'
              ? adminText("Lịch sử thay đổi của yêu cầu")
              : status
                ? bookingActionCopy[status]?.title
                : options.length
                  ? adminText("Chọn một hành động để tiếp tục")
                  : adminText("Chỉ xem thông tin")}
          </span>
          <div className="booking-footer-buttons">
            <button
              type="button"
              className="admin-btn"
              disabled={busy}
              onClick={onClose}
            >
               {adminText("Đóng")} </button>
            {!!options.length && detailTab === 'info' && (
              <button
                type="submit"
                form={formId}
                className={'admin-btn ' + (needsReason ? 'danger' : 'primary')}
                disabled={!status || busy}
              >
                {busy
                  ? adminText("Đang cập nhật…")
                  : status
                    ? bookingActionCopy[status]?.button || adminText("Lưu cập nhật")
                    : adminText("Lưu cập nhật")}
              </button>
            )}
          </div>
        </>
      }
    >
      <div
        className="booking-detail-tabs"
        role="tablist"
        aria-label={adminText("Chi tiết lịch chụp")}
      >
        {(['info', 'history'] as const).map((tab, index) => (
          <button
            key={tab}
            type="button"
            role="tab"
            id={formId + '-tab-' + tab}
            aria-controls={formId + '-panel-' + tab}
            aria-selected={detailTab === tab}
            tabIndex={detailTab === tab ? 0 : -1}
            onClick={() => setDetailTab(tab)}
            onKeyDown={(event) => {
              if (
                ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
              ) {
                event.preventDefault();
                const next =
                  event.key === 'Home'
                    ? 'info'
                    : event.key === 'End'
                      ? 'history'
                      : index === 0
                        ? 'history'
                        : 'info';
                setDetailTab(next);
                document.getElementById(formId + '-tab-' + next)?.focus();
              }
            }}
          >
            {tab === 'info'
              ? adminText("Thông tin yêu cầu")
              : adminText("Lịch sử trạng thái ({0})", { 0: booking.statusHistory?.length || 0 })}
          </button>
        ))}
      </div>
      <section
        className="booking-detail-panel"
        role="tabpanel"
        id={formId + '-panel-info'}
        aria-labelledby={formId + '-tab-info'}
        hidden={detailTab !== 'info'}
        tabIndex={0}
      >
        <div className="booking-detail-summary">
          <h3>{booking.contact.name}</h3>
          <span className={'booking-state ' + bookingTone(booking.status)}>
            {adminText(labels[booking.status])}
          </span>
        </div>
        {booking.rescheduleRequest?.requestedAt && (
          <div className="booking-reschedule-pending" role="status">
            <strong>
              {booking.rescheduleRequest.reason === 'weather'
                ? adminText("Yêu cầu đổi lịch vì thời tiết")
                : adminText("Yêu cầu đổi lịch cá nhân")}{' '}
               {adminText("· Chờ studio duyệt")} </strong>
            <p>
               {adminText("Ngày đề nghị:")}{' '}
              {bookingDate(booking.rescheduleRequest.requestedDate)} ·{' '}
              {adminText(bookingTimeLabels[
                booking.rescheduleRequest.requestedTimeSlot || ''
              ]) || adminText("Chưa chọn giờ")}
            </p>
            {booking.rescheduleRequest.note && (
              <p>{booking.rescheduleRequest.note}</p>
            )}
            <small>
               {adminText("Chọn “Đổi lịch chụp” bên dưới để xác nhận. Ngày đề nghị được điền sẵn; hãy chốt giờ mới trước khi lưu.")} </small>
            <button
              type="button"
              className="admin-btn"
              disabled={busy}
              onClick={() => setDeclining((v) => !v)}
            >
               {adminText("Không chấp thuận yêu cầu đổi lịch")} </button>
            {declining && (
              <div className="admin-settings-field">
                <label htmlFor={formId + '-decline'}>
                   {adminText("Lý do không chấp thuận")} </label>
                <textarea
                  id={formId + '-decline'}
                  className="admin-input"
                  maxLength={500}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                />
                <button
                  type="button"
                  className="admin-btn"
                  disabled={busy || !declineReason.trim()}
                  onClick={async () => {
                    setBusy(true);
                    setError(null);
                    try {
                      await bookingService.updateAdmin(booking._id, {
                        status: booking.status,
                        note:
                          adminText("Không chấp thuận đổi lịch: ") + declineReason.trim(),
                        dismissReschedule: true,
                      });
                      toast.success(adminText("Đã phản hồi yêu cầu đổi lịch"));
                      onSaved();
                      onClose();
                    } catch (cause) {
                      setError(adminError(cause));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                   {adminText("Gửi phản hồi, giữ lịch hiện tại")} </button>
                {error && <p role="alert">{error}</p>}
              </div>
            )}
          </div>
        )}
        <dl className="booking-detail-grid">
          <div>
            <dt>{adminText("Liên hệ")}</dt>
            <dd>
              <a href={'tel:' + booking.contact.phone}>
                {booking.contact.phone}
              </a>
              {booking.contact.email && (
                <a href={'mailto:' + booking.contact.email}>
                  {booking.contact.email}
                </a>
              )}
            </dd>
          </div>
          <div>
            <dt>{adminText("Gói chụp")}</dt>
            <dd>
              {booking.packageSnapshot.name}
              <small>
                {bookingMoney(booking.packageSnapshot.basePrice)}  {adminText("· Giá tham khảo")} </small>
            </dd>
          </div>
          <div>
            <dt>{adminText("Thời gian mong muốn")}</dt>
            <dd>
              {bookingDate(booking.requestedDate)}
              <small>{adminText(formatRequestedTime(booking))}</small>
            </dd>
          </div>
          <div>
            <dt>{adminText("Địa điểm")}</dt>
            <dd>{booking.location.address || adminText("Chưa có địa điểm")}</dd>
          </div>
          {booking.concept && (
            <div>
              <dt>{adminText("Ý tưởng buổi chụp")}</dt>
              <dd>{booking.concept}</dd>
            </div>
          )}
          {booking.notes && (
            <div>
              <dt>{adminText("Ghi chú của khách")}</dt>
              <dd>{booking.notes}</dd>
            </div>
          )}
        </dl>
        {options.length ? (
          <form id={formId} className="booking-update-form" onSubmit={save}>
            <h3>{adminText("Xử lý yêu cầu")}</h3>
            <p>{adminText("Khách sẽ nhận thông báo khi trạng thái được cập nhật.")}</p>
            <fieldset className="admin-form-fields" disabled={busy}>
              <fieldset className="booking-action-options">
                <legend>{adminText("Bạn muốn thực hiện việc gì?")}</legend>
                <div className="booking-action-grid">
                  {options.map((value) => (
                    <label
                      className={
                        'booking-action-choice' +
                        (status === value ? ' selected' : '') +
                        (['rejected', 'cancelled_by_photographer'].includes(
                          value
                        )
                          ? ' destructive'
                          : '')
                      }
                      key={value}
                    >
                      <input
                        type="radio"
                        name={formId + '-action'}
                        value={value}
                        checked={status === value}
                        onChange={() => {
                          setStatus(value);
                          setError(null);
                        }}
                      />
                      {value === 'completed' || value === 'confirmed' ? (
                        <CheckCircle2
                          className="booking-action-icon"
                          size={21}
                          aria-hidden="true"
                        />
                      ) : value === 'rescheduled' ? (
                        <CalendarClock
                          className="booking-action-icon"
                          size={21}
                          aria-hidden="true"
                        />
                      ) : value === 'rejected' ||
                        value === 'cancelled_by_photographer' ? (
                        <CircleX
                          className="booking-action-icon"
                          size={21}
                          aria-hidden="true"
                        />
                      ) : value === 'needs_information' ? (
                        <MessageSquare
                          className="booking-action-icon"
                          size={21}
                          aria-hidden="true"
                        />
                      ) : (
                        <ClipboardCheck
                          className="booking-action-icon"
                          size={21}
                          aria-hidden="true"
                        />
                      )}
                      <span className="booking-action-copy">
                        <strong>
                          {adminText(bookingActionCopy[value]?.title || labels[value])}
                        </strong>
                        <small>{adminText(bookingActionCopy[value]?.description || "")}</small>
                      </span>
                      {status === value ? (
                        <CheckCircle2
                          className="booking-action-indicator"
                          size={20}
                          aria-hidden="true"
                        />
                      ) : (
                        <ChevronRight
                          className="booking-action-chevron"
                          size={18}
                          aria-hidden="true"
                        />
                      )}
                    </label>
                  ))}
                </div>
              </fieldset>
              {needsSchedule && (
                <div className="booking-schedule-fields">
                  <label className="admin-settings-field">
                     {adminText("Ngày chụp")} <input
                      type="date"
                      className="admin-input"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </label>
                  <label className="admin-settings-field">
                     {adminText("Bắt đầu")} <input
                      type="time"
                      className="admin-input"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                    />
                  </label>
                  <label className="admin-settings-field">
                     {adminText("Kết thúc")} <input
                      type="time"
                      className="admin-input"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                    />
                  </label>
                </div>
              )}
              {status && (
                <label className="admin-settings-field">
                  {needsReason
                    ? adminText("Lý do thay đổi (bắt buộc)")
                    : adminText("Ghi chú cho lần cập nhật")}
                  <textarea
                    className="admin-input"
                    rows={3}
                    maxLength={500}
                    required={needsReason}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={
                      needsReason
                        ? adminText("Giải thích lý do để khách hiểu thay đổi này…")
                        : adminText("Nhập nội dung cần trao đổi với khách (không bắt buộc)…")
                    }
                  />
                </label>
              )}
            </fieldset>
            {error && (
              <p className="admin-form-error" role="alert">
                {error}
              </p>
            )}
          </form>
        ) : (
          <div className="booking-closed-note">
            <p>{adminText("Yêu cầu đã kết thúc. Thông tin được giữ lại để tra cứu.")}</p>
          </div>
        )}
      </section>
      <section
        className="booking-detail-panel"
        role="tabpanel"
        id={formId + '-panel-history'}
        aria-labelledby={formId + '-tab-history'}
        hidden={detailTab !== 'history'}
        tabIndex={0}
      >
        <h3>{adminText("Lịch sử trạng thái")}</h3>
        {booking.statusHistory?.length ? (
          <ol className="booking-history-timeline">
            {booking.statusHistory.map((item, i) => {
              const StatusIcon = bookingHistoryIcons[item.to] || Clock3;
              return (
                <li
                  key={i}
                  data-status={item.to}
                  data-tone={bookingTone(item.to)}
                >
                  <span className="booking-history-icon" aria-hidden="true">
                    <StatusIcon size={18} />
                  </span>
                  <strong>{adminText(labels[item.to])}</strong>
                  <time dateTime={item.createdAt}>
                    {bookingDate(item.createdAt)}
                  </time>
                  {item.note && <p>{item.note}</p>}
                </li>
              );
            })}
          </ol>
        ) : (
          <p>{adminText("Chưa có lịch sử thay đổi trạng thái.")}</p>
        )}
      </section>
    </AdminModal>
  );
}
