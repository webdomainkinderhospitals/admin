import React, { useEffect, useState } from 'react';
import { Icon } from './icons.jsx';

// Fire-and-forget toasts: toast('Saved') from anywhere, <ToastHost /> renders them.
let seq = 0;

export function toast(message, kind = 'success') {
  window.dispatchEvent(new CustomEvent('kinder-toast', { detail: { id: ++seq, message, kind } }));
}

export function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const onToast = (e) => {
      const t = e.detail;
      setToasts((cur) => [...cur, t]);
      setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== t.id)), 3200);
    };
    window.addEventListener('kinder-toast', onToast);
    return () => window.removeEventListener('kinder-toast', onToast);
  }, []);

  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          <Icon name={t.kind === 'error' ? 'alert' : 'check'} size={16} />
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
