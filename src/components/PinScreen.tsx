'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';

export default function PinScreen() {
  const { isInitialized, initialize, unlock, isLoading, error, clearError } = useApp();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (isInitialized) {
      await unlock(pin);
    } else {
      if (pin.length < 4) {
        clearError();
        return;
      }
      if (!showConfirm) {
        setShowConfirm(true);
        return;
      }
      if (pin !== confirmPin) {
        clearError();
        return;
      }
      await initialize(pin);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">{isInitialized ? 'Unlock' : 'Create PIN'}</h1>
          <p className="text-gray-500 mt-1">
            {isInitialized 
              ? 'Enter your PIN to access your encrypted notes' 
              : 'Create a PIN to secure your notes. Minimum 4 characters.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-1">
              {isInitialized ? 'PIN' : showConfirm ? 'Confirm PIN' : 'New PIN'}
            </label>
            <input
              id="pin"
              type="password"
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder={isInitialized ? '••••' : 'At least 4 characters'}
              disabled={isLoading}
              autoFocus
            />
          </div>

          {showConfirm && !isInitialized && (
            <div>
              <label htmlFor="confirmPin" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm PIN
              </label>
              <input
                id="confirmPin"
                type="password"
                autoComplete="off"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="••••"
                disabled={isLoading}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || pin.length < 4 || (showConfirm && !isInitialized && pin !== confirmPin)}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {isInitialized ? 'Unlocking...' : showConfirm ? 'Creating...' : 'Next'}
              </span>
            ) : (
              isInitialized ? 'Unlock' : showConfirm ? 'Create' : 'Next'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          Your data is encrypted client-side. PIN never leaves this browser.
        </p>
      </div>
    </div>
  );
}