import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Check, Mail, X } from 'lucide-react';
import { newsletterService } from '@/services/newsletterService';
import { getErrorMessage } from '@/lib/utils';
import './NewsletterPage.css';

function NewsletterAction({ action, token }: { action: 'confirm' | 'unsubscribe'; token: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const valid = /^[a-f0-9]{64}$/.test(token);
  const unsubscribe = action === 'unsubscribe';
  return <main className="newsletter-page">
    {done ? <Check size={32} /> : unsubscribe ? <X size={32} /> : <Mail size={32} />}
    <h1>{done ? unsubscribe ? 'Đã hủy nhận tin' : 'Đã xác nhận nhận tin' : unsubscribe ? 'Hủy nhận tin từ PhotoCloud' : 'Xác nhận nhận tin từ PhotoCloud'}</h1>
    <p>{done ? unsubscribe ? 'Bạn sẽ không nhận thêm bản tin từ studio.' : 'Cảm ơn bạn đã đăng ký nhận tin từ studio.' : !valid ? 'Liên kết không hợp lệ. Bạn có thể đăng ký lại ở cuối trang.' : unsubscribe ? 'Bạn muốn ngừng nhận mẹo chụp ảnh và tin từ studio?' : 'Xác nhận để nhận mẹo chụp ảnh và tin mới từ studio. Bạn có thể hủy bất cứ lúc nào.'}</p>
    {error && <p role="alert">{error}</p>}
    {!done && valid && <button disabled={busy} aria-busy={busy} onClick={async () => {
      if (request.current) return;
      const controller = new AbortController(); request.current = controller;
      setBusy(true); setError('');
      try { await newsletterService.complete(action, token, controller.signal); setDone(true); }
      catch (failure) { if (!controller.signal.aborted) setError(getErrorMessage(failure, 'Chưa xử lý được. Vui lòng thử lại.')); }
      finally { request.current = null; if (!controller.signal.aborted) setBusy(false); }
    }}>{unsubscribe ? <X size={18} /> : <Check size={18} />}{busy ? 'Đang xử lý…' : unsubscribe ? 'Hủy nhận tin' : 'Xác nhận đăng ký'}</button>}
    <Link to="/">Về trang chủ</Link>
  </main>;
}

export default function NewsletterPage() {
  const location = useLocation();
  const token = new URLSearchParams(location.hash.slice(1)).get('token') ?? '';
  return <NewsletterAction key={location.pathname + token} action={location.pathname.endsWith('/unsubscribe') ? 'unsubscribe' : 'confirm'} token={token} />;
}
