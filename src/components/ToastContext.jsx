import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

function Toast({ message, type }) {
  let borderColor = 'var(--blue)';
  if (type === 'success') borderColor = 'var(--green)';
  if (type === 'coming-soon') borderColor = 'var(--gold)';

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px',
      background: 'var(--bg-card)', border: '1px solid var(--border-hover)',
      borderLeft: `3px solid ${borderColor}`,
      borderRadius: '8px', padding: '12px 18px',
      fontSize: '13px', color: 'var(--text-primary)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      zIndex: 9999,
      animation: 'slideIn 0.3s ease, fadeOut 0.3s ease 2.7s forwards'
    }}>
      {type === 'coming-soon' ? '⏰ ' : ''}{message}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
      `}} />
    </div>
  );
}
