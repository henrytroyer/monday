/**
 * PrivateNotesSecurityCard.tsx — User settings: change / recover / rotate recovery key.
 */

import { useState } from 'react';
import { usePrivateNotesVault } from '../../hooks/usePrivateNotesVault';
import RecoveryKeyReveal from './RecoveryKeyReveal';

function statusLabel(
  status: ReturnType<typeof usePrivateNotesVault>['status'],
  recoveryConfigured: boolean,
): string {
  switch (status) {
    case 'unavailable':
      return 'Unavailable (sign in / configure store)';
    case 'loading':
      return 'Loading…';
    case 'needs_setup':
      return 'Not set up — create a passphrase when adding a private note';
    case 'locked':
      return recoveryConfigured
        ? 'Locked · recovery key on file'
        : 'Locked · no recovery key';
    case 'unlocked':
      return recoveryConfigured
        ? 'Unlocked · recovery key on file'
        : 'Unlocked · no recovery key yet';
    default:
      return status;
  }
}

export default function PrivateNotesSecurityCard() {
  const vault = usePrivateNotesVault();
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newPassConfirm, setNewPassConfirm] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [recoverPass, setRecoverPass] = useState('');
  const [recoverPassConfirm, setRecoverPassConfirm] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  const canChange =
    vault.storeAvailable &&
    vault.ownerUid &&
    (vault.status === 'locked' || vault.status === 'unlocked');
  const canRecover =
    vault.storeAvailable &&
    vault.ownerUid &&
    vault.recoveryConfigured &&
    vault.status !== 'needs_setup' &&
    vault.status !== 'unavailable';
  const canRotate =
    vault.isUnlocked && vault.storeAvailable && Boolean(vault.ownerUid);

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setNote(null);
    if (newPass !== newPassConfirm) return;
    try {
      await vault.changePassphrase(currentPass, newPass);
      setCurrentPass('');
      setNewPass('');
      setNewPassConfirm('');
      setNote('Passphrase updated. Your private notes were kept.');
    } catch {
      // vault.error
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setNote(null);
    if (recoverPass !== recoverPassConfirm) return;
    try {
      await vault.recover(recoveryKey, recoverPass);
      setRecoveryKey('');
      setRecoverPass('');
      setRecoverPassConfirm('');
      setNote(
        'Vault recovered. You are unlocked with the new passphrase. Private notes were kept.',
      );
    } catch {
      // vault.error
    }
  };

  const handleRotate = async () => {
    setNote(null);
    try {
      const { recoveryKey: next } = await vault.rotateRecovery();
      setRevealedKey(next);
      setNote(null);
    } catch {
      // vault.error
    }
  };

  return (
    <section className="rounded-2xl border border-crm-taupe/20 bg-crm-surface p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-crm-slate">
        Private notes
      </h2>
      <p className="mt-2 text-sm text-crm-slate">
        End-to-end encrypted notes on contacts. Passphrase and recovery key never
        leave your device in readable form. Manage recovery under this account
        only.
      </p>
      <p className="mt-2 text-sm font-medium text-crm-heading">
        Status: {statusLabel(vault.status, vault.recoveryConfigured)}
      </p>
      {vault.storeMode === 'localStorage' && (
        <p className="mt-1 text-xs text-amber-800">
          Ciphertext is stored in this browser only. Set VITE_PRIVATE_NOTES_URL
          (or run private-notes:proxy) to sync across devices.
        </p>
      )}

      {revealedKey && (
        <div className="mt-4">
          <RecoveryKeyReveal
            recoveryKey={revealedKey}
            title="Save your new recovery key"
            onContinue={() => {
              setRevealedKey(null);
              setNote(
                'Recovery key saved locally by you. The previous recovery key no longer works.',
              );
            }}
          />
        </div>
      )}

      {(vault.error || note) && (
        <p
          className={`mt-3 text-sm ${vault.error ? 'text-red-600' : 'text-crm-heading'}`}
          role={vault.error ? 'alert' : undefined}
        >
          {vault.error || note}
        </p>
      )}

      {canChange && !revealedKey && (
        <form onSubmit={(e) => void handleChange(e)} className="mt-5 space-y-2">
          <h3 className="text-sm font-semibold text-crm-heading">
            Change passphrase
          </h3>
          <p className="text-xs text-crm-slate">
            Requires your current passphrase. Notes stay encrypted; only the
            wrapping key changes.
          </p>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Current passphrase"
            value={currentPass}
            onChange={(e) => setCurrentPass(e.target.value)}
            className="w-full rounded-xl border border-crm-taupe/30 bg-crm-white px-3 py-2 text-sm"
            disabled={vault.busy}
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="New passphrase (min 8 characters)"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            className="w-full rounded-xl border border-crm-taupe/30 bg-crm-white px-3 py-2 text-sm"
            disabled={vault.busy}
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Confirm new passphrase"
            value={newPassConfirm}
            onChange={(e) => setNewPassConfirm(e.target.value)}
            className="w-full rounded-xl border border-crm-taupe/30 bg-crm-white px-3 py-2 text-sm"
            disabled={vault.busy}
          />
          {newPassConfirm && newPass !== newPassConfirm && (
            <p className="text-xs text-red-600">Passphrases do not match</p>
          )}
          <button
            type="submit"
            disabled={
              vault.busy ||
              currentPass.trim().length < 1 ||
              newPass.trim().length < 8 ||
              newPass !== newPassConfirm
            }
            className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white hover:bg-crm-indigo-dark disabled:opacity-50"
          >
            {vault.busy ? 'Working…' : 'Update passphrase'}
          </button>
        </form>
      )}

      {canRecover && !revealedKey && (
        <form onSubmit={(e) => void handleRecover(e)} className="mt-6 space-y-2">
          <h3 className="text-sm font-semibold text-crm-heading">
            Recover with recovery key
          </h3>
          <p className="text-xs text-crm-slate">
            Use if you forgot your passphrase. Sets a new passphrase and unlocks
            this device. Only you can do this — admins cannot.
          </p>
          <textarea
            rows={2}
            placeholder="Recovery key"
            value={recoveryKey}
            onChange={(e) => setRecoveryKey(e.target.value)}
            className="w-full rounded-xl border border-crm-taupe/30 bg-crm-white px-3 py-2 font-mono text-sm tracking-wide"
            disabled={vault.busy}
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="New passphrase (min 8 characters)"
            value={recoverPass}
            onChange={(e) => setRecoverPass(e.target.value)}
            className="w-full rounded-xl border border-crm-taupe/30 bg-crm-white px-3 py-2 text-sm"
            disabled={vault.busy}
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Confirm new passphrase"
            value={recoverPassConfirm}
            onChange={(e) => setRecoverPassConfirm(e.target.value)}
            className="w-full rounded-xl border border-crm-taupe/30 bg-crm-white px-3 py-2 text-sm"
            disabled={vault.busy}
          />
          {recoverPassConfirm && recoverPass !== recoverPassConfirm && (
            <p className="text-xs text-red-600">Passphrases do not match</p>
          )}
          <button
            type="submit"
            disabled={
              vault.busy ||
              normalizeLooksEmpty(recoveryKey) ||
              recoverPass.trim().length < 8 ||
              recoverPass !== recoverPassConfirm
            }
            className="rounded-xl bg-crm-heading px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {vault.busy ? 'Working…' : 'Recover vault'}
          </button>
        </form>
      )}

      {!vault.recoveryConfigured &&
        vault.status !== 'needs_setup' &&
        vault.status !== 'unavailable' &&
        !revealedKey && (
          <p className="mt-4 text-xs text-amber-800">
            No recovery key on file. Unlock private notes, then create one below
            (or set up a new vault from a contact note).
          </p>
        )}

      {canRotate && !revealedKey && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-crm-heading">
            {vault.recoveryConfigured
              ? 'Rotate recovery key'
              : 'Create recovery key'}
          </h3>
          <p className="mt-1 text-xs text-crm-slate">
            {vault.recoveryConfigured
              ? 'Creates a new recovery key and invalidates the previous one. Shown once — save it offline.'
              : 'Creates a recovery key so you can reset your passphrase later without losing notes.'}
          </p>
          <button
            type="button"
            onClick={() => void handleRotate()}
            disabled={vault.busy}
            className="mt-2 rounded-xl border border-crm-taupe/30 bg-crm-white px-4 py-2 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50 disabled:opacity-50"
          >
            {vault.busy
              ? 'Working…'
              : vault.recoveryConfigured
                ? 'Rotate recovery key'
                : 'Create recovery key'}
          </button>
        </div>
      )}

      {vault.isUnlocked && !revealedKey && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => void vault.lock()}
            disabled={vault.busy}
            className="rounded-xl border border-crm-taupe/30 px-4 py-2 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50 disabled:opacity-50"
          >
            Lock private notes on this device
          </button>
        </div>
      )}
    </section>
  );
}

function normalizeLooksEmpty(value: string): boolean {
  return value.replace(/[\s-]+/g, '').length < 32;
}
