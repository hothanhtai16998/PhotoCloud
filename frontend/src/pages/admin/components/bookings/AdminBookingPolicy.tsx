import { useEffect, useState } from 'react';
import { bookingService } from '@/services/bookingService';
import type { BookingPolicy } from '@/types/bookingFinal';
import { adminError } from '../../hooks/useAdminResource';
import './AdminBookingPolicy.css';
export function AdminBookingPolicy({
  onDirty,
}: {
  onDirty: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState<BookingPolicy | null>(null);
  const [saved, setSaved] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [retry, setRetry] = useState(0);
  const dirty = !!draft && JSON.stringify(draft) !== saved;
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    let active = true;
    bookingService
      .getPolicy()
      .then((result) => {
        if (active) {
          setDraft(result.policy);
          setSaved(JSON.stringify(result.policy));
          setError('');
        }
      })
      .catch((cause) => {
        if (active) setError(adminError(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry]);
  const update = (value: Partial<BookingPolicy>) => {
    setDraft((current) => (current ? { ...current, ...value } : current));
    setMessage('');
  };
  if (loading) return <p role="status">Đang tải chính sách…</p>;
  if (!draft)
    return (
      <div role="alert">
        <p>{error}</p>
        <button
          className="admin-btn"
          onClick={() => {
            setLoading(true);
            setRetry((v) => v + 1);
          }}
        >
          Thử lại
        </button>
      </div>
    );
  const rules = [...draft.cancellationRules].sort(
    (a, b) => b.minimumHoursBefore - a.minimumHoursBefore
  );
  const duration = (hours: number) =>
    hours % 24 === 0 ? `${hours / 24} ngày` : `${hours} giờ`;
  return (
    <form
      className="pc-policy"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy || !dirty) return;
        setBusy(true);
        setError('');
        setMessage('');
        try {
          const result = await bookingService.updatePolicy(draft);
          setDraft(result.policy);
          setSaved(JSON.stringify(result.policy));
          setMessage(
            'Đã lưu chính sách. Các yêu cầu tiếp theo sẽ được kiểm tra theo cài đặt này.'
          );
        } catch (cause) {
          setError(adminError(cause));
        } finally {
          setBusy(false);
        }
      }}
    >
      <header>
        <h2>Chính sách hủy và đổi lịch</h2>
        <p>
          Quy định dành cho yêu cầu của khách. Studio vẫn xem xét và xác nhận
          ngày chụp mới.
        </p>
      </header>
      <fieldset disabled={busy}>
        <section className="pc-policy-section">
          <h3>Đổi lịch</h3>
          <label className="pc-policy-toggle">
            <input
              type="checkbox"
              role="switch"
              checked={draft.allowOneReschedule}
              onChange={(e) => update({ allowOneReschedule: e.target.checked })}
            />
            <span>
              <strong>Cho phép một lần đổi lịch cá nhân</strong>
              <small>
                Chỉ tính lượt đã được studio xác nhận; yêu cầu đang chờ chưa làm
                thay đổi lịch chụp.
              </small>
            </span>
          </label>
          <label className="pc-policy-number">
            Thời hạn yêu cầu đổi lịch
            <div>
              <input
                className="admin-input"
                type="number"
                min="0"
                max="720"
                step="1"
                required
                disabled={!draft.allowOneReschedule}
                value={draft.rescheduleDeadlineHours}
                onChange={(e) =>
                  update({ rescheduleDeadlineHours: Number(e.target.value) })
                }
              />
              <span>giờ trước buổi chụp</span>
            </div>
          </label>
          <p className="pc-policy-help">
            Tính theo giờ đã chốt, múi giờ Việt Nam. Nếu chưa chốt giờ, tính từ
            00:00 ngày chụp.
          </p>
          <label className="pc-policy-toggle">
            <input
              type="checkbox"
              role="switch"
              checked={draft.weatherRescheduleAllowed}
              onChange={(e) =>
                update({ weatherRescheduleAllowed: e.target.checked })
              }
            />
            <span>
              <strong>Nhận yêu cầu đổi lịch vì thời tiết xấu</strong>
              <small>
                Khách phải nêu tình hình thời tiết; studio kiểm tra trước khi
                chấp thuận.
              </small>
            </span>
          </label>
          {draft.weatherRescheduleAllowed && (
            <div className="pc-policy-note">
              Yêu cầu thời tiết được gửi trước khi buổi chụp bắt đầu, kể cả khi
              đã quá thời hạn đổi lịch cá nhân hoặc đã dùng lượt đổi. Lượt đổi
              vì thời tiết không trừ vào lượt cá nhân. Đây là yêu cầu chờ duyệt,
              không tự động đổi lịch.
            </div>
          )}
        </section>
        <section className="pc-policy-section">
          <h3>Hủy lịch & hoàn cọc</h3>
          <label className="pc-policy-toggle">
            <input
              type="checkbox"
              role="switch"
              checked={draft.allowClientCancellation}
              onChange={(e) =>
                update({ allowClientCancellation: e.target.checked })
              }
            />
            <span>
              <strong>Cho phép khách tự hủy lịch chụp</strong>
              <small>Khi tắt, khách cần liên hệ studio để xử lý hủy.</small>
            </span>
          </label>
          <div className="pc-policy-refunds">
            <div className="pc-policy-rule pc-policy-rule-heading">
              <strong>Thời điểm hủy trước buổi chụp</strong>
              <strong>Tỷ lệ hoàn cọc</strong>
            </div>
            {rules.map((rule, index) => (
              <label className="pc-policy-rule" key={rule.minimumHoursBefore}>
                <span>
                  {index === 0
                    ? `Từ ${duration(rule.minimumHoursBefore)}`
                    : rule.minimumHoursBefore === 0
                      ? `Dưới ${duration(rules[index - 1].minimumHoursBefore)}`
                      : `Từ ${duration(rule.minimumHoursBefore)} đến dưới ${duration(rules[index - 1].minimumHoursBefore)}`}
                </span>
                <div>
                  <input
                    className="admin-input"
                    aria-label={`Tỷ lệ hoàn cọc từ ${rule.minimumHoursBefore} giờ`}
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    required
                    value={rule.refundPercent}
                    onChange={(e) =>
                      update({
                        cancellationRules: draft.cancellationRules.map(
                          (item) =>
                            item.minimumHoursBefore === rule.minimumHoursBefore
                              ? {
                                  ...item,
                                  refundPercent: Number(e.target.value),
                                }
                              : item
                        ),
                      })
                    }
                  />
                  <span>%</span>
                </div>
              </label>
            ))}
          </div>
          <p className="pc-policy-help">
            Tỷ lệ tính trên tiền cọc đã nhận, không phải giá gói. Hệ thống ghi
            nhận tỷ lệ khi khách hủy; studio đối soát và hoàn tiền riêng.
          </p>
        </section>
      </fieldset>
      {error && (
        <p className="admin-form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="pc-policy-success" role="status">
          {message}
        </p>
      )}
      <footer>
        <span>{dirty ? 'Có thay đổi chưa lưu' : 'Chính sách đã được lưu'}</span>
        <div>
          <button
            type="button"
            className="admin-btn"
            disabled={!dirty || busy}
            onClick={() => {
              setDraft(JSON.parse(saved));
              setError('');
              setMessage('');
            }}
          >
            Bỏ thay đổi
          </button>
          <button className="admin-btn primary" disabled={!dirty || busy}>
            {busy ? 'Đang lưu…' : 'Lưu chính sách'}
          </button>
        </div>
      </footer>
    </form>
  );
}
