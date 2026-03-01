import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export function AnimeEntryAnimation({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase(1), 500);
    const timer2 = setTimeout(() => setPhase(2), 1500);
    const timer3 = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black pointer-events-none">
      {/* Speed Lines Background */}
      <AnimatePresence>
        {phase >= 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-0"
          >
            <div className="absolute inset-0 opacity-30">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute bg-white"
                  style={{
                    width: '2px',
                    height: '100%',
                    left: `${i * 5}%`,
                    top: '-100%',
                    transform: 'rotate(45deg)',
                  }}
                  animate={{
                    top: ['-100%', '200%'],
                  }}
                  transition={{
                    duration: 0.2,
                    repeat: Infinity,
                    delay: i * 0.01,
                    ease: "linear"
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Central Flash */}
      <AnimatePresence>
        {phase === 1 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 20, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "circIn" }}
            className="absolute z-10 w-10 h-10 bg-white rounded-full blur-xl"
          />
        )}
      </AnimatePresence>

      {/* Dramatic Text */}
      <AnimatePresence>
        {phase === 1 && (
          <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.5 }}
            animate={{ y: 0, opacity: 1, scale: 1.5 }}
            exit={{ y: -100, opacity: 0, scale: 2 }}
            transition={{ type: "spring", damping: 10, stiffness: 100 }}
            className="relative z-20"
          >
            <h1 className="text-6xl font-black text-white italic tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">
              Anime <span className="text-red-600">Zone</span>
            </h1>
            <motion.div 
              animate={{ x: [-2, 2, -2] }}
              transition={{ repeat: Infinity, duration: 0.1 }}
              className="mt-2 text-center text-white/50 font-mono text-sm tracking-[0.5em] uppercase"
            >
              System Initialization
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screen Shake / Impact */}
      {phase === 1 && (
        <motion.div
          animate={{ x: [-5, 5, -5, 5, 0], y: [-5, 5, -5, 5, 0] }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 border-[20px] border-white/20 pointer-events-none"
        />
      )}

      {/* Final Fade Out */}
      <AnimatePresence>
        {phase === 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 bg-white"
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
