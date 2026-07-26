import type { InputHTMLAttributes } from 'react';
import { useState } from 'react';
import styles from './FormField.module.css';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: string;
  error?: string;
}

export default function FormField({ label, icon, error, type, style: _style, ...rest }: FormFieldProps) {
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className={styles.field}>

      <label htmlFor={label} className={styles.label}>
        <span>{icon}</span> {label}
      </label>

      <div className={styles.inputWrap}>
        <input
          {...rest}
          id={label}
          type={isPassword ? (showPw ? 'text' : 'password') : type}
          className={`${styles.input} ${error ? styles.inputError : ''}`}
          style={isPassword ? { paddingRight: 44 } : undefined}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw((p) => !p)}
            className={styles.toggleBtn}
          >{showPw ? '🙈' : '👁️'}</button>
        )}
      </div>

      {error && (
        <span className={styles.error}>⚠️ {error}</span>
      )}
    </div>
  );
}
