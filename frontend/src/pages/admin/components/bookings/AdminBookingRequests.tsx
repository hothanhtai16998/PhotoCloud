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
      aria-label="Danh sách yêu cầu đặt lịch"
    >
      <div className="booking-requests-heading">
        <div>
          <h2>Yêu cầu đặt lịch</h2>
          <p>Kiểm tra thông tin khách hàng và xác nhận buổi chụp.</p>
        </div>
        <button
          className="admin-btn"
          onClick={() => void reload()}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Làm mới
        </button>
      </div>
      <div className="booking-request-filters">
        <div
          className="booking-quick-filters"
          role="group"
          aria-label="Lọc nhanh trạng thái"
        >
          {[
            ['', 'Tất cả'],
            ['pending', 'Chờ xử lý'],
            ['confirmed', 'Đã xác nhận'],
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
          <span className="sr-only">Trạng thái yêu cầu</span>
          <select
            aria-label="Trạng thái yêu cầu"
            value={status}
            onChange={(e) => changeFilter(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
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
              aria-label="Tìm yêu cầu đặt lịch"
              type="search"
              placeholder="Tìm mã lịch, tên hoặc số điện thoại…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <button className="admin-btn" type="submit">
            Tìm
          </button>
        </form>
      </div>
      {query && (
        <div className="booking-search-result">
          Kết quả cho “{query}”
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
            Xóa tìm kiếm
          </button>
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
                  <th>Khách hàng & yêu cầu</th>
                  <th>Buổi chụp</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                  <th>
                    <span className="sr-only">Chi tiết</span>
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
                        {booking.bookingCode} · Tạo ngày{' '}
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
                        {booking.location.address || 'Chưa có địa điểm'}
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
                          : bookingTimeLabels[booking.requestedTimeSlot] ||
                            'Chưa chọn giờ'}
                      </span>
                      <small>
                        {booking.confirmedDate
                          ? 'Lịch đã chốt'
                          : 'Ngày khách mong muốn'}
                      </small>
                    </td>
                    <td>
                      <span
                        className={
                          'booking-state ' + bookingTone(booking.status)
                        }
                      >
                        <i aria-hidden="true" />
                        {labels[booking.status]}
                      </span>
                    </td>
                    <td>
                      <button
                        className="admin-btn booking-detail-btn"
                        onClick={() => setSelected(booking)}
                        aria-label={'Xem chi tiết ' + booking.bookingCode}
                      >
                        Chi tiết
                        <ArrowUpRight size={16} />
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
                    {labels[booking.status]}
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
                    bookingTimeLabels[booking.requestedTimeSlot]}
                </div>
                <div className="booking-mobile-line">
                  <Phone size={16} />
                  <a href={'tel:' + booking.contact.phone}>
                    {booking.contact.phone}
                  </a>
                </div>
                <footer>
                  <span>{booking.location.address || 'Chưa có địa điểm'}</span>
                  <button
                    className="admin-btn"
                    onClick={() => setSelected(booking)}
                  >
                    Chi tiết
                    <ArrowUpRight size={16} />
                  </button>
                </footer>
              </article>
            ))}
          </div>
          {!loading && !error && !bookings.length && (
            <AdminEmpty
              title={
                status || query
                  ? 'Không có yêu cầu phù hợp'
                  : 'Chưa có yêu cầu đặt lịch'
              }
              description={
                status || query
                  ? 'Thử đổi trạng thái hoặc từ khóa để tìm lại yêu cầu.'
                  : 'Các yêu cầu khách gửi từ website sẽ xuất hiện tại đây.'
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
    title: 'Xem xét yêu cầu',
    description: 'Đang trao đổi và kiểm tra thông tin của khách.',
    button: 'Bắt đầu xem xét',
  },
  needs_information: {
    title: 'Yêu cầu bổ sung',
    description: 'Đề nghị khách cung cấp thông tin còn thiếu.',
    button: 'Yêu cầu bổ sung',
  },
  confirmed: {
    title: 'Xác nhận lịch chụp',
    description: 'Chốt ngày và khung giờ cho buổi chụp.',
    button: 'Xác nhận lịch chụp',
  },
  rescheduled: {
    title: 'Đổi lịch chụp',
    description: 'Điều chỉnh ngày hoặc giờ đã hẹn với khách.',
    button: 'Xác nhận đổi lịch',
  },
  completed: {
    title: 'Hoàn thành buổi chụp',
    description: 'Đánh dấu buổi chụp đã diễn ra và hoàn tất.',
    button: 'Xác nhận hoàn thành',
  },
  cancelled_by_photographer: {
    title: 'Hủy lịch chụp',
    description: 'Dừng lịch đã xác nhận và thông báo lý do.',
    button: 'Xác nhận hủy lịch',
  },
  rejected: {
    title: 'Từ chối yêu cầu',
    description: 'Không tiếp nhận yêu cầu này; cần có lý do.',
    button: 'Xác nhận từ chối',
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
      setError('Vui lòng nhập lý do để khách hiểu thay đổi này.');
      return;
    }
    if (needsSchedule && start && end && end <= start) {
      setError('Giờ kết thúc phải sau giờ bắt đầu.');
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
      toast.success('Đã cập nhật lịch chụp');
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
      description="Thông tin yêu cầu đặt lịch chụp"
      size="lg"
      className="booking-detail-modal"
      onClose={() => {
        if (!busy) onClose();
      }}
      footer={
        <>
          <span className="booking-footer-hint" role="status">
            {detailTab === 'history'
              ? 'Lịch sử thay đổi của yêu cầu'
              : status
                ? bookingActionCopy[status]?.title
                : options.length
                  ? 'Chọn một hành động để tiếp tục'
                  : 'Chỉ xem thông tin'}
          </span>
          <div className="booking-footer-buttons">
            <button
              type="button"
              className="admin-btn"
              disabled={busy}
              onClick={onClose}
            >
              Đóng
            </button>
            {!!options.length && detailTab === 'info' && (
              <button
                type="submit"
                form={formId}
                className={'admin-btn ' + (needsReason ? 'danger' : 'primary')}
                disabled={!status || busy}
              >
                {busy
                  ? 'Đang cập nhật…'
                  : status
                    ? bookingActionCopy[status]?.button || 'Lưu cập nhật'
                    : 'Lưu cập nhật'}
              </button>
            )}
          </div>
        </>
      }
    >
      <div
        className="booking-detail-tabs"
        role="tablist"
        aria-label="Chi tiết lịch chụp"
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
              ? 'Thông tin yêu cầu'
              : `Lịch sử trạng thái (${booking.statusHistory?.length || 0})`}
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
            {labels[booking.status]}
          </span>
        </div>
        {booking.rescheduleRequest?.requestedAt && (
          <div className="booking-reschedule-pending" role="status">
            <strong>
              {booking.rescheduleRequest.reason === 'weather'
                ? 'Yêu cầu đổi lịch vì thời tiết'
                : 'Yêu cầu đổi lịch cá nhân'}{' '}
              · Chờ studio duyệt
            </strong>
            <p>
              Ngày đề nghị:{' '}
              {bookingDate(booking.rescheduleRequest.requestedDate)} ·{' '}
              {bookingTimeLabels[
                booking.rescheduleRequest.requestedTimeSlot || ''
              ] || 'Chưa chọn giờ'}
            </p>
            {booking.rescheduleRequest.note && (
              <p>{booking.rescheduleRequest.note}</p>
            )}
            <small>
              Chọn “Đổi lịch chụp” bên dưới để xác nhận. Ngày đề nghị được điền
              sẵn; hãy chốt giờ mới trước khi lưu.
            </small>
            <button
              type="button"
              className="admin-btn"
              disabled={busy}
              onClick={() => setDeclining((v) => !v)}
            >
              Không chấp thuận yêu cầu đổi lịch
            </button>
            {declining && (
              <div className="admin-settings-field">
                <label htmlFor={formId + '-decline'}>
                  Lý do không chấp thuận
                </label>
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
                          'Không chấp thuận đổi lịch: ' + declineReason.trim(),
                        dismissReschedule: true,
                      });
                      toast.success('Đã phản hồi yêu cầu đổi lịch');
                      onSaved();
                      onClose();
                    } catch (cause) {
                      setError(adminError(cause));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Gửi phản hồi, giữ lịch hiện tại
                </button>
                {error && <p role="alert">{error}</p>}
              </div>
            )}
          </div>
        )}
        <dl className="booking-detail-grid">
          <div>
            <dt>Liên hệ</dt>
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
            <dt>Gói chụp</dt>
            <dd>
              {booking.packageSnapshot.name}
              <small>
                {bookingMoney(booking.packageSnapshot.basePrice)} · Giá tham
                khảo
              </small>
            </dd>
          </div>
          <div>
            <dt>Thời gian mong muốn</dt>
            <dd>
              {bookingDate(booking.requestedDate)}
              <small>{bookingTimeLabels[booking.requestedTimeSlot]}</small>
            </dd>
          </div>
          <div>
            <dt>Địa điểm</dt>
            <dd>{booking.location.address || 'Chưa có địa điểm'}</dd>
          </div>
          {booking.concept && (
            <div>
              <dt>Ý tưởng buổi chụp</dt>
              <dd>{booking.concept}</dd>
            </div>
          )}
          {booking.notes && (
            <div>
              <dt>Ghi chú của khách</dt>
              <dd>{booking.notes}</dd>
            </div>
          )}
        </dl>
        {options.length ? (
          <form id={formId} className="booking-update-form" onSubmit={save}>
            <h3>Xử lý yêu cầu</h3>
            <p>Khách sẽ nhận thông báo khi trạng thái được cập nhật.</p>
            <fieldset className="admin-form-fields" disabled={busy}>
              <fieldset className="booking-action-options">
                <legend>Bạn muốn thực hiện việc gì?</legend>
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
                          {bookingActionCopy[value]?.title || labels[value]}
                        </strong>
                        <small>{bookingActionCopy[value]?.description}</small>
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
                    Ngày chụp
                    <input
                      type="date"
                      className="admin-input"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </label>
                  <label className="admin-settings-field">
                    Bắt đầu
                    <input
                      type="time"
                      className="admin-input"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                    />
                  </label>
                  <label className="admin-settings-field">
                    Kết thúc
                    <input
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
                    ? 'Lý do thay đổi (bắt buộc)'
                    : 'Ghi chú cho lần cập nhật'}
                  <textarea
                    className="admin-input"
                    rows={3}
                    maxLength={500}
                    required={needsReason}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={
                      needsReason
                        ? 'Giải thích lý do để khách hiểu thay đổi này…'
                        : 'Nhập nội dung cần trao đổi với khách (không bắt buộc)…'
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
            <p>Yêu cầu đã kết thúc. Thông tin được giữ lại để tra cứu.</p>
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
        <h3>Lịch sử trạng thái</h3>
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
                  <strong>{labels[item.to]}</strong>
                  <time dateTime={item.createdAt}>
                    {bookingDate(item.createdAt)}
                  </time>
                  {item.note && <p>{item.note}</p>}
                </li>
              );
            })}
          </ol>
        ) : (
          <p>Chưa có lịch sử thay đổi trạng thái.</p>
        )}
      </section>
    </AdminModal>
  );
}
