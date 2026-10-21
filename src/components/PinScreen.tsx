'use client';

import { useState, useEffect, useRef } from 'react';
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
  Info,
  GitBranch,
  Zap,
  Brain,
  ShieldCheck,
  Eye,
  EyeOff,
  Settings,
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
      '🧠 Zero-knowledge architecture - PIN never leaves your browser',
      '🛡️ AES-256-GCM encryption with PBKDF2 (600k iterations)',
      '📝 Full CRUD for encrypted notes (pin, tag, search)',
      '📁 Encrypted file storage with metadata',
      '☁️ Cloudflare Pages deployment with auto-deploy',
      '📱 PWA support - install as native app',
    ],
    fixes: [
      'Removed wrangler.toml conflict with Cloudflare Pages',
      'Fixed build configuration for static export',
    ],
    vision: [
      '🤖 AI-powered note summarization & insights',
      '🔮 Semantic search across encrypted content',
      '🌐 Cross-device sync with end-to-end encryption',
      '🎯 Smart tags & auto-categorization',
      '📊 Encrypted analytics dashboard',
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
  const [particles, setParticles] = useState<Array<{x: number; y: number; size: number; speed: number; opacity: number}>>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // Create neural network background animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Neural network nodes
    const nodes = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: Math.random() * 2 + 1,
      hue: Math.random() * 60 + 200, // Blue to purple range
    }));

    const connections = 120; // Max connection distance

    const animate = () => {
      if (!ctx) return;
      
      // Clear with subtle trail effect
      ctx.fillStyle = 'rgba(15, 15, 25, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw nodes
      nodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off edges
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        // Keep in bounds
        node.x = Math.max(0, Math.min(canvas.width, node.x));
        node.y = Math.max(0, Math.min(canvas.height, node.y));

        // Draw node
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 3);
        gradient.addColorStop(0, `hsla(${node.hue}, 80%, 60%, ${0.8})`);
        gradient.addColorStop(1, `hsla(${node.hue}, 80%, 40%, 0)`);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      // Draw connections
      ctx.strokeStyle = 'hsla(220, 80%, 50%, 0.1)';
      ctx.lineWidth = 0.5;
      
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < connections) {
            const opacity = (1 - dist / connections) * 0.3;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `hsla(220, 80%, 50%, ${opacity})`;
            ctx.stroke();
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Floating particles
  useEffect(() => {
    const newParticles = Array.from({ length: 30 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 0.5 + 0.2,
      opacity: Math.random() * 0.5 + 0.1,
    }));
    setParticles(newParticles);
  }, []);

  useEffect(() => {
    const animateParticles = () => {
      setParticles(prev => prev.map(p => ({
        ...p,
        y: p.y - p.speed,
        x: p.x + Math.sin(Date.now() * 0.001 + p.x) * 0.2,
        opacity: p.y < 0 ? Math.random() * 0.5 + 0.1 : p.opacity,
        y: p.y < 0 ? window.innerHeight : p.y,
      })));
      requestAnimationFrame(animateParticles);
    };
    animateParticles();
  }, []);

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

  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
    },
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-950">
      {/* Neural Network Background */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 -z-10"
        aria-hidden="true"
      />

      {/* Floating Particles */}
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="fixed pointer-events-none rounded-full bg-blue-400/20"
          style={{
            width: p.size,
            height: p.size,
            left: p.x,
            top: p.y,
            opacity: p.opacity,
          }}
          animate={{ y: [-20, -window.innerHeight - 20] }}
          transition={{
            duration: 15 / p.speed,
            repeat: Infinity,
            ease: 'linear',
            delay: i * 0.5,
          }}
        />
      ))}

      {/* Grid Pattern Overlay */}
      <div className="fixed inset-0 -z-5 opacity-5" 
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Radial Gradient Glow */}
      <div className="fixed inset-0 -z-5 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(59, 130, 246, 0.15) 0%, transparent 70%),
            radial-gradient(ellipse 60% 40% at 80% 100%, rgba(139, 92, 246, 0.1) 0%, transparent 60%),
            radial-gradient(ellipse 50% 30% at 10% 80%, rgba(16, 185, 129, 0.08) 0%, transparent 50%)
          `,
        }}
      />

      <div className="min-h-screen flex items-center justify-center px-4 py-12 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md relative"
        >
          {/* Holographic Card */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900/80 to-gray-950/90 backdrop-blur-2xl border border-gray-800/50 shadow-2xl">
            {/* Top Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500" />
            
            <motion.div
              variants={itemVariants}
              className="p-8"
            >
              {/* Logo & Title */}
              <div className="text-center mb-8">
                <motion.div
                  animate={{ 
                    scale: [1, 1.05, 1],
                    rotate: [0, 1, -1, 0],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-emerald-500 animate-pulse opacity-50" />
                  <div className="relative z-10 flex items-center justify-center w-full h-full bg-gray-900/90 rounded-xl">
                    <Brain className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 bg-clip-text text-transparent" />
                  </div>
                  <div className="absolute inset-0 border border-gray-700/50 rounded-2xl" />
                </motion.div>
                
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent mb-2">
                  {isInitialized ? 'Welcome Back' : 'Initialize Secure Notes'}
                </h1>
                <p className="text-gray-400 text-sm max-w-xs mx-auto">
                  {isInitialized 
                    ? 'Enter your PIN to access your encrypted vault'
                    : 'Create a PIN to secure your neural vault. Minimum 4 digits.'}
                </p>
              </div>

              {/* Security Badges */}
              <motion.div
                variants={itemVariants}
                className="flex items-center justify-center gap-4 mb-6 p-4 rounded-xl bg-gray-900/50 border border-gray-800/50"
              >
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Zero-Knowledge</span>
                </div>
                <div className="w-px h-6 bg-gray-700" />
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Lock className="w-4 h-4 text-blue-400" />
                  <span>AES-256-GCM</span>
                </div>
                <div className="w-px h-6 bg-gray-700" />
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span>PBKDF2 600k</span>
                </div>
              </motion.div>

              {/* Error Display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="text-red-300 text-sm">{error}</div>
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
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Create PIN <span className="text-blue-400">(min 4 digits)</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPin ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={pin}
                          onChange={(e) => setPin(e.target.value)}
                          className="w-full px-5 py-4 pr-12 bg-gray-900/80 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none text-white placeholder-gray-600 transition-all duration-200"
                          placeholder="••••"
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-400 transition-colors"
                        >
                          {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                        <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 origin-left transition-all duration-300"
                          style={{ width: pin.length > 0 ? `${Math.min(pin.length * 25, 100)}%` : '0%' }} />
                      </div>
                    </div>

                    <motion.button
                      type="submit"
                      disabled={isLoading || pin.length < 4}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/20 disabled:shadow-none flex items-center justify-center gap-2"
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
                      className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3"
                    >
                      <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <div className="text-sm text-emerald-300">
                        PIN created! Please confirm to initialize your vault.
                      </div>
                    </motion.div>

                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Confirm PIN
                      </label>
                      <div className="relative">
                        <input
                          type={showPin ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={confirmPin}
                          onChange={(e) => setConfirmPin(e.target.value)}
                          className="w-full px-5 py-4 pr-12 bg-gray-900/80 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none text-white placeholder-gray-600 transition-all duration-200"
                          placeholder="••••"
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400 transition-colors"
                        >
                          {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                        <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 origin-left transition-all duration-300"
                          style={{ width: confirmPin.length > 0 ? `${Math.min(confirmPin.length * 25, 100)}%` : '0%' }} />
                      </div>
                    </div>

                    {confirmPin && pin !== confirmPin && confirmPin.length === pin.length && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-400 text-sm flex items-center gap-1"
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
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-emerald-500/20 disabled:shadow-none flex items-center justify-center gap-2"
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
                      className="w-full py-3 rounded-xl text-gray-400 hover:text-gray-200 font-medium transition-colors"
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
                      className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center gap-3"
                    >
                      <Unlock className="w-5 h-5 text-blue-400 flex-shrink-0" />
                      <div className="text-sm text-blue-300">
                        Your vault is locked. Enter PIN to decrypt.
                      </div>
                    </motion.div>

                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        PIN
                      </label>
                      <div className="relative">
                        <input
                          type={showPin ? 'text' : 'password'}
                          autoComplete="off"
                          value={pin}
                          onChange={(e) => setPin(e.target.value)}
                          className="w-full px-5 py-4 pr-12 bg-gray-900/80 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none text-white placeholder-gray-600 transition-all duration-200"
                          placeholder="••••"
                          disabled={isLoading}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-400 transition-colors"
                        >
                          {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                        <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 origin-left transition-all duration-300"
                          style={{ width: pin.length > 0 ? `${Math.min(pin.length * 25, 100)}%` : '0%' }} />
                      </div>
                    </div>

                    <motion.button
                      type="submit"
                      disabled={isLoading || pin.length < 4}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/20 disabled:shadow-none flex items-center justify-center gap-2"
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
              <motion.div
                variants={itemVariants}
                className="mt-8 pt-6 border-t border-gray-800/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    <span className="font-medium text-white">Version 2.0.0</span>
                    <span className="px-2 py-0.5 text-xs bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-white">
                      Latest
                    </span>
                  </div>
                  <button
                    onClick={() => setShowReleaseNotes(!showReleaseNotes)}
                    className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm"
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
                        <h4 className="text-sm font-medium text-blue-300 flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          New Features
                        </h4>
                        <ul className="space-y-2 text-sm text-gray-300 pl-4">
                          {currentNote.features.map((f, i) => (
                            <motion.li
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="flex items-start gap-2 relative pl-4 before:content-[''] before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-blue-400"
                            >
                              {f}
                            </motion.li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-emerald-300 flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Fixes
                        </h4>
                        <ul className="space-y-2 text-sm text-gray-300 pl-4">
                          {currentNote.fixes.map((f, i) => (
                            <motion.li
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="flex items-start gap-2 relative pl-4 before:content-[''] before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-emerald-400"
                            >
                              {f}
                            </motion.li>
                          ))}
                        </ul>
                      </div>

                      {currentNote.vision && (
                        <motion.button
                          onClick={() => setShowVision(!showVision)}
                          className="w-full p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                              <Brain className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="font-medium text-white">Next Version Vision</div>
                              <div className="text-xs text-gray-400">AI-powered encrypted intelligence</div>
                            </div>
                          </div>
                          <motion.div
                            animate={{ rotate: showVision ? 180 : 0 }}
                            className="text-purple-400 transition-transform"
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
                            className="mt-4 p-4 rounded-xl bg-gradient-to-r from-purple-500/5 to-pink-500/5 border border-purple-500/20 space-y-3 overflow-hidden"
                          >
                            <h4 className="text-sm font-medium text-purple-300 flex items-center gap-2">
                              <Sparkles className="w-4 h-4" />
                              Coming Soon
                            </h4>
                            <ul className="space-y-2 text-sm text-gray-300 pl-4">
                              {currentNote.vision!.map((v, i) => (
                                <motion.li
                                  key={i}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.08 }}
                                  className="flex items-start gap-2 relative pl-4 before:content-[''] before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-gradient-to-r before:from-purple-400 before:to-pink-400"
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
              <motion.div
                variants={itemVariants}
                className="mt-8 text-center"
              >
                <p className="text-xs text-gray-500">
                  Your data is encrypted client-side. PIN never leaves this browser.
                </p>
                <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-600">
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
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}