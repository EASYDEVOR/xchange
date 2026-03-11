import { useState, useCallback } from 'react';

let toastId = 0;
let globalAddToast = null;

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((msg, type = 'success') => {
    const id = ++toastId;
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  globalAddToast = add;
  return { toasts, add };
}

export function toast(msg, type = 'success') {
  if (globalAddToast) globalAddToast(msg, type);
}

export function ToastContainer({ toasts }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 9999 }}>
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type} slide-in`}>
          {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'} {t.msg}
        </div>
      ))}
    </div>
  );
}
