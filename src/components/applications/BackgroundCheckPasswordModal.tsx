import { useEffect, useState, type FormEvent } from 'react';
import type { VolunteerFile } from '../../types/volunteer';
import { verifyBackgroundCheckPassword } from '../../config/backgroundCheck';
import OverlayBackButton from '../layout/OverlayBackButton';

interface BackgroundCheckPasswordModalProps {
  file: VolunteerFile;
  backLabel?: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function BackgroundCheckPasswordModal({
  file,
  backLabel = 'files',
  onSuccess,
  onClose,
}: BackgroundCheckPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (verifyBackgroundCheckPassword(password)) {
      setError(null);
      onSuccess();
      return;
    }
    setError('Incorrect password');
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="background-check-password-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/25 backdrop-blur-sm"
        aria-label={`Back to ${backLabel}`}
        onClick={onClose}
      />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-2xl border border-crm-taupe/20 bg-crm-surface p-6 shadow-2xl"
      >
        <OverlayBackButton backLabel={backLabel} onBack={onClose} />
        <h2
          id="background-check-password-title"
          className="mt-3 text-lg font-semibold text-crm-heading"
        >
          Background check
        </h2>
        <p className="mt-2 text-sm text-crm-slate">
          Enter the coordinator password to view{' '}
          <span className="font-medium text-crm-heading">{file.name}</span>.
        </p>

        <label
          htmlFor="background-check-password"
          className="mt-4 block text-sm font-medium text-crm-heading"
        >
          Password
        </label>
        <input
          id="background-check-password"
          type="password"
          autoComplete="off"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(null);
          }}
          className="mt-2 w-full rounded-xl border border-crm-taupe/20 px-4 py-2.5 text-sm text-crm-text outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
        />

        {error && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="submit"
            className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white hover:bg-crm-indigo-dark"
          >
            Unlock
          </button>
        </div>
      </form>
    </div>
  );
}
