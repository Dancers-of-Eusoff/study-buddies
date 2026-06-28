import type { InputHTMLAttributes } from 'react';
import { useId, useState } from 'react';
import styles from './FormField.module.css';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: string;
  error?: string;
}

export default function FormField({ label, icon, error, type, style: _style, id, ...rest }: FormFieldProps) {
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === 'password';
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={styles.field}>

      <label className={styles.label} htmlFor={inputId}>
        <span>{icon}</span> {label}
      </label>

      <div className={styles.inputWrap}>
        <input
          {...rest}
          id={inputId}
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