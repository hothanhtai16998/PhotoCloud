import { useId, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './AuthLayout.css';

function PullLamp() {
    const id = useId().replace(/:/g, '');
    const [on, setOn] = useState(true);
    const [pull, setPull] = useState(0);
    const gesture = useRef<{ id: number; y: number; distance: number; moved: boolean } | null>(null);
    const suppressClick = useRef(false);
    const start = (event: PointerEvent<HTMLButtonElement>) => {
        if (!event.isPrimary || event.button !== 0 || gesture.current) return;
        suppressClick.current = false;
        gesture.current = { id: event.pointerId, y: event.clientY, distance: 0, moved: false };
        event.currentTarget.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent<HTMLButtonElement>) => {
        const active = gesture.current;
        if (!active || active.id !== event.pointerId) return;
        const delta = event.clientY - active.y;
        active.moved ||= Math.abs(delta) > 4;
        active.distance = Math.min(64, Math.max(0, delta));
        setPull(active.distance);
    };
    const finish = (event: PointerEvent<HTMLButtonElement>, cancelled = false) => {
        const active = gesture.current;
        if (!active || active.id !== event.pointerId) return;
        suppressClick.current = cancelled || active.moved;
        if (!cancelled && active.distance >= 24) setOn(value => !value);
        gesture.current = null;
        setPull(0);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    };
    return <div className={`auth-lamp ${on ? 'is-on' : ''} ${pull > 0 ? 'is-pulling' : ''}`} style={{ '--pull': `${pull}px` } as CSSProperties}>
        <svg viewBox="0 0 480 460" aria-hidden="true">
            <defs>
                <filter id={`${id}-soft`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7" /></filter>
                <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#687267" /><stop offset=".3" stopColor="#363e36" /><stop offset="1" stopColor="#171e1a" /></linearGradient>
                <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#f6cc78" stopOpacity=".65" /><stop offset="1" stopColor="#f6cc78" stopOpacity="0" /></linearGradient>
                <linearGradient id={`${id}-metal`}><stop stopColor="#171918" /><stop offset=".5" stopColor="#66665e" /><stop offset="1" stopColor="#202321" /></linearGradient>
                <radialGradient id={`${id}-pool`}><stop stopColor="#f5cf8b" stopOpacity=".65" /><stop offset="1" stopColor="#f5cf8b" stopOpacity="0" /></radialGradient>
            </defs>
            <path className="auth-lamp-light" d="M184 145 L296 145 L415 385 L65 385 Z" fill={`url(#${id}-beam)`} filter={`url(#${id}-soft)`} />
            <ellipse className="auth-lamp-light" cx="240" cy="386" rx="180" ry="32" fill={`url(#${id}-pool)`} />
            <path d="M45 399 H435" stroke="#a7a99f" strokeOpacity=".35" />
            <ellipse cx="240" cy="390" rx="62" ry="9" fill="#111914" opacity=".35" filter={`url(#${id}-soft)`} />
            <rect x="236" y="141" width="8" height="238" rx="4" fill={`url(#${id}-metal)`} />
            <ellipse cx="240" cy="383" rx="47" ry="9" fill="#202421" />
            <ellipse cx="240" cy="379" rx="42" ry="7" fill={`url(#${id}-metal)`} />
            <ellipse className="auth-lamp-bulb auth-lamp-light" cx="240" cy="148" rx="47" ry="8" fill="#ffe0a0" />
            <path d="M179 145 Q183 91 218 88 H262 Q297 91 301 145 Z" fill={`url(#${id}-shade)`} stroke="#87907c" strokeOpacity=".25" />
            <path d="M190 122 Q198 96 220 96 H260" fill="none" stroke="#a1ad96" strokeOpacity=".45" strokeWidth="1.5" />
            <path d="M179 145 H301" stroke="#101613" strokeWidth="5" strokeLinecap="round" />
        </svg>
        <div className="auth-lamp-cord"><div className="auth-lamp-string" />
            <button type="button" className="auth-lamp-switch" aria-label={on ? 'Tắt đèn' : 'Bật đèn'} aria-pressed={on}
                onPointerDown={start} onPointerMove={move} onPointerUp={event => finish(event)} onPointerCancel={event => finish(event, true)} onLostPointerCapture={event => finish(event, true)}
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') suppressClick.current = false; }}
                onClick={() => { if (!suppressClick.current) setOn(value => !value); suppressClick.current = false; }}><span /></button>
        </div>
    </div>;
}

export function AuthLayout({ children }: { children: ReactNode }) {
    return <main className="auth-layout">
        <section className="auth-scene" aria-label="Đèn studio tương tác">
            <Link to="/" className="auth-brand">photocloud<span>STUDIO</span></Link>
            <PullLamp />
            <div className="auth-scene-copy"><p>MỖI KHUNG HÌNH, MỘT CÂU CHUYỆN</p><h2>Kể chuyện<br /><em>bằng ánh sáng.</em></h2></div>
        </section>
        <section className="auth-panel"><div className="auth-panel-content">{children}</div></section>
    </main>;
}
