import React from 'react';
import styles from './Toggle.module.css';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  id?: string;
}

export function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
  description,
  id,
}: ToggleProps) {
  const toggleId = id || `toggle-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div className={styles.container}>
      <label className={styles.toggle} htmlFor={toggleId}>
        <input
          type="checkbox"
          id={toggleId}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className={styles.input}
          role="switch"
          aria-checked={checked}
        />
        <span className={styles.slider} aria-hidden="true" />
      </label>
      {(label || description) && (
        <div className={styles.content}>
          {label && (
            <label htmlFor={toggleId} className={styles.label}>
              {label}
            </label>
          )}
          {description && (
            <p className={styles.description}>{description}</p>
          )}
        </div>
      )}
    </div>
  );
}
