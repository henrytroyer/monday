/**
 * PrivateNotesSecurityCard.tsx — User settings: setup, unlock, and manage private notes.
 * Slim layout: create passphrase inline; change / recover / recovery key via dropdown.
 */

import { useEffect, useState } from 'react';
import { usePrivateNotesVault } from '../../hooks/usePrivateNotesVault';
import RecoveryKeyReveal from './RecoveryKeyReveal';

type ManageAction = '' | 'change' | 'recover' | 'recovery-key';

function statusLabel(
  status: ReturnType<typeof usePrivateNotesVault>['status'],
  recoveryConfigured: boolean,
): string {
  switch (status) {
    case 'unavailable':
      return 'Unavailable — sign in required';
    case 'loading':
      return 'Loading…';
    case 'needs_setup':
      return 'Not set up';
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

const inputClass =
  'w-full rounded-xl border border-crm-taupe/30 bg-crm-white px-3 py-2 text-sm';
const selectClass =
  'mt-1.5 w-full max-w-md rounded-xl border border-crm-taupe/30 bg-crm-white px-3 py-2 text-sm';

export default function PrivateNotesSecurityCard() {
  const vault = usePrivateNotesVault();
  const [setupPass, setSetupPass] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [unlockPass, setUnlockPass] = useState('');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newPassConfirm, setNewPassConfirm] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [recoverPass, setRecoverPass] = useState('');
  const [recoverPassConfirm, setRecoverPassConfirm] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [action, setAction] = useState<ManageAction>('');

  const canManage =
    vault.storeAvailable &&
    Boolean(vault.ownerUid) &&
    (vault.status === 'locked' || vault.status === 'unlocked');
  const canRecover =
    canManage &&
    vault.recoveryConfigured &&
    vault.status !== 'needs_setup';
  const canRotate =
    vault.isUnlocked && vault.storeAvailable && Boolean(vault.ownerUid);

  useEffect(() => {
    if (action === 'recover' && !canRecover) setAction('');
    if (action === 'recovery-key' && !canRotate) setAction('');
  }, [action, canRecover, canRotate]);

  const clearManageFields = () => {
    setCurrentPass('');
    setNewPass('');
    setNewPassConfirm('');
    setRecoveryKey('');
    setRecoverPass('');
    setRecoverPassConfirm('');
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setNote(null);
    if (setupPass !== setupConfirm) return;
    try {
      const { recoveryKey: next } = await vault.setup(setupPass);
      setSetupPass('');
      setSetupConfirm('');
      setRevealedKey(next);
    } catch {
      // vault.error
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setNote(null);
    try {
      await vault.unlock(unlockPass);
      setUnlockPass('');
      setNote('Private notes unlocked on this device.');
    } catch {
      // vault.error
    }
  };

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setNote(null);
    if (newPass !== newPassConfirm) return;
    try {
      await vault.changePassphrase(currentPass, newPass);
      clearManageFields();
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
      clearManageFields();
      setNote(
        'Vault recovered. You are unlocked with the new passphrase.',
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
    } catch {
      // vault.error
    }
  };

  const onActionChange = (next: ManageAction) => {
    setAction(next);
    clearManageFields();
    setNote(null);
  };

  return (
    <section className="rounded-2xl border border-crm-taupe/20 bg-crm-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-crm-slate">
            Private notes
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-crm-slate">
            Encrypted on your device. Only you can read them — not administrators.
          </p>
        </div>
        {vault.isUnlocked && !revealedKey && (
          <button
            type="button"
            onClick={() => void vault.lock()}
            disabled={vault.busy}
            className="shrink-0 rounded-lg border border-crm-taupe/30 px-3 py-1.5 text-xs font-medium text-crm-heading hover:bg-crm-taupe-50 disabled:opacity-50"
          >
            Lock
          </button>
        )}
      </div>

      <p className="mt-3 text-sm font-medium text-crm-heading">
        {statusLabel(vault.status, vault.recoveryConfigured)}
      </p>
      {vault.storeMode === 'localStorage' && (
        <p className="mt-1 text-xs text-crm-slate">
          Device-only store — cross-device sync needs a private-notes URL for this
          environment.
        </p>
      )}

      {revealedKey && (
        <div className="mt-4">
          <RecoveryKeyReveal
            recoveryKey={revealedKey}
            title="Save your recovery key"
            onContinue={() => {
              setRevealedKey(null);
              setNote(
                'Recovery key saved by you. Keep it offline — it is shown only once.',
              );
            }}
          />
        </div>
      )}

      {(vault.error || note) && !revealedKey && (
        <p
          className={`mt-3 text-xs ${vault.error ? 'text-red-600' : 'text-crm-heading'}`}
          role={vault.error ? 'alert' : undefined}
        >
          {vault.error || note}
        </p>
      )}

      {vault.status === 'needs_setup' &&
        vault.storeAvailable &&
        vault.ownerUid &&
        !revealedKey && (
          <form
            onSubmit={(e) => void handleSetup(e)}
            className="mt-4 space-y-2 border-t border-crm-taupe/15 pt-4"
          >
            <h3 className="text-sm font-semibold text-crm-heading">
              Create passphrase
            </h3>
            <p className="text-xs text-crm-slate">
              Sets up private notes for your account. A recovery key is shown
              once — save it offline.
            </p>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Passphrase (min 8 characters)"
              value={setupPass}
              onChange={(e) => setSetupPass(e.target.value)}
              className={inputClass}
              disabled={vault.busy}
            />
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Confirm passphrase"
              value={setupConfirm}
              onChange={(e) => setSetupConfirm(e.target.value)}
              className={inputClass}
              disabled={vault.busy}
            />
            {setupConfirm && setupPass !== setupConfirm && (
              <p className="text-xs text-red-600">Passphrases do not match</p>
            )}
            <button
              type="submit"
              disabled={
                vault.busy ||
                setupPass.trim().length < 8 ||
                setupPass !== setupConfirm
              }
              className="rounded-lg bg-crm-indigo px-3 py-1.5 text-sm font-medium text-white hover:bg-crm-indigo-dark disabled:opacity-50"
            >
              {vault.busy ? 'Creating…' : 'Create passphrase'}
            </button>
          </form>
        )}

      {vault.status === 'locked' && !revealedKey && (
        <form
          onSubmit={(e) => void handleUnlock(e)}
          className="mt-4 flex flex-wrap items-end gap-2 border-t border-crm-taupe/15 pt-4"
        >
          <label className="min-w-[12rem] flex-1 text-xs text-crm-slate">
            Unlock this device
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Passphrase"
              value={unlockPass}
              onChange={(e) => setUnlockPass(e.target.value)}
              className={`mt-1 ${inputClass}`}
              disabled={vault.busy}
            />
          </label>
          <button
            type="submit"
            disabled={vault.busy || unlockPass.trim().length < 1}
            className="rounded-lg bg-crm-indigo px-3 py-1.5 text-sm font-medium text-white hover:bg-crm-indigo-dark disabled:opacity-50"
          >
            {vault.busy ? 'Unlocking…' : 'Unlock'}
          </button>
        </form>
      )}

      {canManage && !revealedKey && (
        <div className="mt-4 space-y-3 border-t border-crm-taupe/15 pt-4">
          <label className="block text-sm text-crm-heading">
            Manage security
            <select
              value={action}
              onChange={(e) => onActionChange(e.target.value as ManageAction)}
              className={selectClass}
            >
              <option value="">Select an action…</option>
              <option value="change">Change passphrase</option>
              {canRecover && (
                <option value="recover">Reset with recovery key</option>
              )}
              {canRotate && (
                <option value="recovery-key">
                  {vault.recoveryConfigured
                    ? 'Rotate recovery key'
                    : 'Create recovery key'}
                </option>
              )}
            </select>
          </label>

          {action === 'change' && (
            <form
              onSubmit={(e) => void handleChange(e)}
              className="max-w-md space-y-2"
            >
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Current passphrase"
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                className={inputClass}
                disabled={vault.busy}
              />
              <input
                type="password"
                autoComplete="new-password"
                placeholder="New passphrase (min 8 characters)"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className={inputClass}
                disabled={vault.busy}
              />
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Confirm new passphrase"
                value={newPassConfirm}
                onChange={(e) => setNewPassConfirm(e.target.value)}
                className={inputClass}
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

          {action === 'recover' && canRecover && (
            <form
              onSubmit={(e) => void handleRecover(e)}
              className="max-w-md space-y-2"
            >
              <textarea
                rows={2}
                placeholder="Recovery key"
                value={recoveryKey}
                onChange={(e) => setRecoveryKey(e.target.value)}
                className={`${inputClass} font-mono tracking-wide`}
                disabled={vault.busy}
              />
              <input
                type="password"
                autoComplete="new-password"
                placeholder="New passphrase (min 8 characters)"
                value={recoverPass}
                onChange={(e) => setRecoverPass(e.target.value)}
                className={inputClass}
                disabled={vault.busy}
              />
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Confirm new passphrase"
                value={recoverPassConfirm}
                onChange={(e) => setRecoverPassConfirm(e.target.value)}
                className={inputClass}
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
                {vault.busy ? 'Working…' : 'Reset passphrase'}
              </button>
            </form>
          )}

          {action === 'recovery-key' && canRotate && (
            <div className="max-w-md space-y-2">
              <p className="text-xs text-crm-slate">
                {vault.recoveryConfigured
                  ? 'Creates a new recovery key and invalidates the previous one. Shown once.'
                  : 'Creates a recovery key so you can reset your passphrase later without losing notes.'}
              </p>
              <button
                type="button"
                onClick={() => void handleRotate()}
                disabled={vault.busy}
                className="rounded-xl border border-crm-taupe/30 bg-crm-white px-4 py-2 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50 disabled:opacity-50"
              >
                {vault.busy
                  ? 'Working…'
                  : vault.recoveryConfigured
                    ? 'Rotate recovery key'
                    : 'Create recovery key'}
              </button>
            </div>
          )}
        </div>
      )}

      {vault.status === 'unavailable' && (
        <p className="mt-4 text-xs text-amber-800">
          Private notes are available after you sign in.
        </p>
      )}
    </section>
  );
}

function normalizeLooksEmpty(value: string): boolean {
  return value.replace(/[\s-]+/g, '').length < 32;
}
