import React, { forwardRef } from 'react';
import styles from './Input.module.css';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  description?: string;
  error?: string;
  suffix?: React.ReactNode;
  onChange?: (value: string) => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      description,
      error,
      suffix,
      onChange,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
    const hasError = Boolean(error);

    return (
      <div className={`${styles.container} ${className}`}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        )}
        <div className={styles.inputWrapper}>
          <input
            ref={ref}
            id={inputId}
            className={`${styles.input} ${hasError ? styles.error : ''}`}
            onChange={(e) => onChange?.(e.target.value)}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${inputId}-error` : description ? `${inputId}-description` : undefined
            }
            {...props}
          />
          {suffix && <span className={styles.suffix}>{suffix}</span>}
        </div>
        {description && !error && (
          <p id={`${inputId}-description`} className={styles.description}>
            {description}
          </p>
        )}
        {error && (
          <p id={`${inputId}-error`} className={styles.errorMessage} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
