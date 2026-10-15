import { memo, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import './AdminForm.css';

interface AdminFieldProps {
    label: string;
    htmlFor: string;
    required?: boolean;
    error?: string;
    hint?: string;
    children: ReactNode;
}

/** Label + child input + optional error/hint block. */
export const AdminField = memo(function AdminField({
    label,
    htmlFor,
    required,
    error,
    hint,
    children,
}: AdminFieldProps) {
    return (
        <div className="admin-field">
            <label htmlFor={htmlFor} className="admin-field-label">
                {label}
                {required && <span className="admin-field-required" aria-hidden="true">*</span>}
            </label>
            {children}
            {error ? (
                <p className="admin-field-error" role="alert">
                    <AlertCircle size={12} aria-hidden="true" />
                    {error}
                </p>
            ) : hint ? (
                <p className="admin-field-hint">{hint}</p>
            ) : null}
        </div>
    );
});

interface AdminInputProps extends InputHTMLAttributes<HTMLInputElement> {
    invalid?: boolean;
}

export const AdminInput = memo(function AdminInput({ invalid, className, ...props }: AdminInputProps) {
    return (
        <input
            className={`admin-input ${invalid ? 'invalid' : ''} ${className ?? ''}`}
            aria-invalid={invalid || undefined}
            {...props}
        />
    );
});

interface AdminTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    invalid?: boolean;
}

export const AdminTextarea = memo(function AdminTextarea({ invalid, className, ...props }: AdminTextareaProps) {
    return (
        <textarea
            className={`admin-input admin-textarea ${invalid ? 'invalid' : ''} ${className ?? ''}`}
            aria-invalid={invalid || undefined}
            {...props}
        />
    );
});

interface AdminSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    invalid?: boolean;
}

export const AdminSelect = memo(function AdminSelect({ invalid, className, children, ...props }: AdminSelectProps) {
    return (
        <select
            className={`admin-input admin-select ${invalid ? 'invalid' : ''} ${className ?? ''}`}
            aria-invalid={invalid || undefined}
            {...props}
        >
            {children}
        </select>
    );
});
