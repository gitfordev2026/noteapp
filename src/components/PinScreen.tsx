'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import {
  Lock,
  Unlock,
  Shield,
  Sparkles,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  GitBranch,
  Zap,
  Brain,
  ShieldCheck,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';

interface ReleaseNote {
  version: string;
  date: string;
  features: string[];
  fixes: string[];
  vision?: string[];
}

const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: '2.0.0',
    date: '2026-10-21',
    features: [
      'Zero-knowledge architecture - PIN never leaves your browser',
      'AES-256-GCM encryption with PBKDF2 (600k iterations)',
      'Full CRUD for encrypted notes (pin, tag, search)',
      'Encrypted file storage with metadata',
      'Cloudflare Pages deployment with auto-deploy',
      'PWA support - install as native app',
    ],
    fixes: [
      'Removed wrangler.toml conflict with Cloudflare Pages',
      'Fixed build configuration for static export',
    ],
    vision: [
      'AI-powered note summarization & insights',
      'Semantic search across encrypted content',
      'Cross-device sync with end-to-end encryption',
      'Smart tags & auto-categorization',
      'Encrypted analytics dashboard',
    ],
  },
];

export default function PinScreen() {
  const { isInitialized, initialize, unlock, isLoading, error, clearError } = useApp();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [showVision, setShowVision] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (isInitialized) {
      if (pin.length < 4) return;
      await unlock(pin);
    } else {
      if (pin.length < 4) return;
      if (!showConfirm) {
        setShowConfirm(true);
        return;
      }
      if (pin !== confirmPin) return;
      await initialize(pin);
    }
  };

  const currentNote = RELEASE_NOTES[0];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 -z-10 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(var(--color-border) 1px, transparent 1px),
            linear-gradient(90deg, var(--color-border) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Radial Gradient Glow */}
      <div className="fixed inset-0 -z-5 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, var(--color-primary-light) 0%, transparent 70%),
            radial-gradient(ellipse 60% 40% at 80% 100%, #FFEDD5 0%, transparent 60%),
            radial-gradient(ellipse 50% 30% at 10% 80%, var(--color-primary-light) 0%, transparent 50%)
          `,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative"
      >
        {/* Card */}
        <div className="card rounded-2xl overflow-hidden">
          {/* Top Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent" />

          <div className="p-8">
            {/* Logo & Title */}
            <div className="text-center mb-8">
              <motion.div
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary animate-pulse opacity-30" />
                <div className="relative z-10 flex items-center justify-center w-full h-full bg-card rounded-xl">
                  <Brain className="w-10 h-10 bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent" />
                </div>
                <div className="absolute inset-0 border border-border/50 rounded-2xl" />
              </motion.div>

              <h1 className="page-title mb-2">
                {isInitialized ? 'Welcome Back' : 'Initialize Secure Notes'}
              </h1>
              <p className="page-subtitle max-w-xs mx-auto">
                {isInitialized
                  ? 'Enter your PIN to access your encrypted vault'
                  : 'Create a PIN to secure your notes. Minimum 4 digits.'}
              </p>
            </div>

            {/* Security Badges */}
            <div className="flex items-center justify-center gap-4 mb-6 p-4 rounded-xl bg-muted/50 border border-border/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>Zero-Knowledge</span>
              </div>
              <div className="w-px h-6 bg-border" />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="w-4 h-4 text-primary" />
                <span>AES-256-GCM</span>
              </div>
              <div className="w-px h-6 bg-border" />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-4 h-4 text-primary" />
                <span>PBKDF2 600k</span>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                <div className="text-sm text-destructive">{error}</div>
              </motion.div>
            )}

            {/* PIN Input Form */}
            <AnimatePresence mode="wait">
              {!showConfirm && !isInitialized ? (
                <motion.form
                  key="create"
                  onSubmit={handleSubmit}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <div className="relative">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Create PIN <span className="text-primary">(min 4 digits)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPin ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        className="input pr-12"
                        placeholder="••••"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="icon-button absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                      <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary to-secondary origin-left transition-all duration-300"
                        style={{ width: pin.length > 0 ? `${Math.min(pin.length * 25, 100)}%` : '0%' }} />
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={isLoading || pin.length < 4}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn btn-primary w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Initializing...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Vault</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </motion.button>
                </motion.form>
              ) : null}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {showConfirm && !isInitialized ? (
                <motion.form
                  key="confirm"
                  onSubmit={handleSubmit}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center gap-3"
                  >
                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <div className="text-sm text-emerald-800">
                      PIN created! Please confirm to initialize your vault.
                    </div>
                  </motion.div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Confirm PIN
                    </label>
                    <div className="relative">
                      <input
                        type={showPin ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value)}
                        className="input pr-12"
                        placeholder="••••"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="icon-button absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                      <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-emerald-500 to-primary origin-left transition-all duration-300"
                        style={{ width: confirmPin.length > 0 ? `${Math.min(confirmPin.length * 25, 100)}%` : '0%' }} />
                    </div>
                  </div>

                  {confirmPin && pin !== confirmPin && confirmPin.length === pin.length && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-destructive text-sm flex items-center gap-1"
                    >
                      <AlertCircle className="w-4 h-4" />
                      PINs don't match
                    </motion.p>
                  )}

                  <motion.button
                    type="submit"
                    disabled={isLoading || confirmPin.length < 4 || pin !== confirmPin}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn btn-primary w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Securing Vault...</span>
                      </>
                    ) : (
                      <>
                        <span>Initialize Secure Notes</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => { setShowConfirm(false); setConfirmPin(''); }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn btn-ghost w-full"
                  >
                    Change PIN
                  </motion.button>
                </motion.form>
              ) : null}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {isInitialized && (
                <motion.form
                  key="unlock"
                  onSubmit={handleSubmit}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-xl bg-primary-light border border-primary/30 flex items-center gap-3"
                  >
                    <Unlock className="w-5 h-5 text-primary flex-shrink-0" />
                    <div className="text-sm text-primary">
                      Your vault is locked. Enter PIN to decrypt.
                    </div>
                  </motion.div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      PIN
                    </label>
                    <div className="relative">
                      <input
                        type={showPin ? 'text' : 'password'}
                        autoComplete="off"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        className="input pr-12"
                        placeholder="••••"
                        disabled={isLoading}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="icon-button absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                      <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary to-secondary origin-left transition-all duration-300"
                        style={{ width: pin.length > 0 ? `${Math.min(pin.length * 25, 100)}%` : '0%' }} />
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={isLoading || pin.length < 4}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn btn-primary w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Decrypting Vault...</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-5 h-5" />
                        <span>Unlock Vault</span>
                      </>
                    )}
                  </motion.button>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Release Notes & Vision Toggle */}
            <motion.div className="mt-8 pt-6 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  <span className="font-medium text-foreground">Version 2.0.0</span>
                  <span className="badge badge-primary">Latest</span>
                </div>
                <button
                  onClick={() => setShowReleaseNotes(!showReleaseNotes)}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm"
                >
                  {showReleaseNotes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span>Release Notes</span>
                </button>
              </div>

              <AnimatePresence>
                {showReleaseNotes && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 space-y-4 overflow-hidden"
                  >
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-primary flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        New Features
                      </h4>
                      <ul className="space-y-2 text-sm text-muted-foreground pl-4">
                        {RELEASE_NOTES[0].features.map((f, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-start gap-2 relative pl-4 before:content-[''] before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-primary"
                          >
                            {f}
                          </motion.li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-emerald-600 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Fixes
                      </h4>
                      <ul className="space-y-2 text-sm text-muted-foreground pl-4">
                        {RELEASE_NOTES[0].fixes.map((f, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-start gap-2 relative pl-4 before:content-[''] before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-emerald-500"
                          >
                            {f}
                          </motion.li>
                        ))}
                      </ul>
                    </div>

                    {RELEASE_NOTES[0].vision && (
                      <motion.button
                        onClick={() => setShowVision(!showVision)}
                        className="w-full p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                            <Brain className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="font-medium text-foreground">Next Version Vision</div>
                            <div className="text-xs text-muted-foreground">AI-powered encrypted intelligence</div>
                          </div>
                        </div>
                        <motion.div
                          animate={{ rotate: showVision ? 180 : 0 }}
                          className="text-purple-600 transition-transform"
                        >
                          <ChevronDown className="w-5 h-5" />
                        </motion.div>
                      </motion.button>
                    )}

                    <AnimatePresence>
                      {showVision && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 space-y-3 overflow-hidden"
                        >
                          <h4 className="text-sm font-medium text-purple-700 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Coming Soon
                          </h4>
                          <ul className="space-y-2 text-sm text-muted-foreground pl-4">
                            {RELEASE_NOTES[0].vision!.map((v, i) => (
                              <motion.li
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className="flex items-start gap-2 relative pl-4 before:content-[''] before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-gradient-to-r before:from-purple-500 before:to-pink-500"
                              >
                                {v}
                              </motion.li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Footer */}
            <motion.div className="mt-8 text-center">
              <p className="text-xs text-muted-foreground">
                Your data is encrypted client-side. PIN never leaves this browser.
              </p>
              <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <GitBranch className="w-3 h-3" />
                  v2.0.0
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  AES-256-GCM
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Cloudflare Pages
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}