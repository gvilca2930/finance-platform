'use client';
import { X } from 'lucide-react';
import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}) {
  return <button className={`button button--${variant} ${className}`} {...props} />;
}
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {typeof children === 'object' && children ? (
        <span className="field-control">{children}</span>
      ) : (
        children
      )}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export const Input = (props: InputHTMLAttributes<HTMLInputElement>) => (
  <input className="input" {...props} />
);
export const Select = (props: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className="input" {...props} />
);
export const Textarea = (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className="input textarea" {...props} />
);
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'danger' | 'warning' | 'info';
}) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Skeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="skeleton" aria-label="Cargando">
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}
export function Modal({
  open,
  title,
  description,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
    >
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header>
          <div>
            <h2 id="modal-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="icon-button" aria-label="Cerrar" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onClose,
  busy,
  confirmLabel = 'Eliminar',
  busyLabel = 'Eliminando…',
}: {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onClose: () => void;
  busy?: boolean;
  confirmLabel?: string;
  busyLabel?: string;
}) {
  return (
    <Modal open={open} title={title} description={description} onClose={onClose}>
      <div className="form-actions">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="danger" disabled={busy} onClick={onConfirm}>
          {busy ? busyLabel : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(id);
  }, [message]);
  return {
    show: setMessage,
    toast: message ? (
      <div className="toast" role="status">
        {message}
      </div>
    ) : null,
  };
}
export function ErrorMessage({ error }: { error: unknown }) {
  return (
    <div className="error-message" role="alert">
      {error instanceof Error ? error.message : 'No pudimos completar la operación.'}
    </div>
  );
}
export function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  return (
    <nav className="pagination" aria-label="Paginación">
      <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Anterior
      </Button>
      <span>
        Página {page} de {Math.max(totalPages, 1)}
      </span>
      <Button variant="secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        Siguiente
      </Button>
    </nav>
  );
}
