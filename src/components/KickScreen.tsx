import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, ShieldAlert, MessageCircle, ArrowRight, Info } from 'lucide-react';

export type KickLayout = 'banner' | 'immersive' | 'poster';
export type KickTone = 'serious' | 'humorous' | 'immersive' | 'custom';

export interface KickConfig {
  title: string;
  message: string;
  imageUrl: string;
  accentColor: string;
  showProgressBar: boolean;
  tone: KickTone;
  layout: KickLayout;
  reason: string;
  endsAt: string; // ISO string
  staffContactUrl?: string;
}

interface KickScreenProps {
  config: KickConfig;
  onClose?: () => void; // For demo purposes
}

export const KickScreen: React.FC<KickScreenProps> = ({ config, onClose }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date().getTime();
      const end = new Date(config.endsAt).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('00:00:00');
        setProgress(0);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );

      // Simple progress calculation (assuming a 24h max kick for demo)
      const totalDuration = 24 * 60 * 60 * 1000;
      const currentProgress = (diff / totalDuration) * 100;
      setProgress(Math.min(100, currentProgress));
    };

    const timer = setInterval(calculateTime, 1000);
    calculateTime();

    return () => clearInterval(timer);
  }, [config.endsAt]);

  const renderLayout = () => {
    switch (config.layout) {
      case 'banner':
        return <BannerLayout config={config} timeLeft={timeLeft} progress={progress} />;
      case 'immersive':
        return <ImmersiveLayout config={config} timeLeft={timeLeft} progress={progress} />;
      case 'poster':
        return <PosterLayout config={config} timeLeft={timeLeft} progress={progress} />;
      default:
        return <BannerLayout config={config} timeLeft={timeLeft} progress={progress} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0D0C10]/95 backdrop-blur-md p-4 md:p-8"
    >
      {renderLayout()}
    </motion.div>
  );
};

const BannerLayout: React.FC<{ config: KickConfig; timeLeft: string; progress: number }> = ({ config, timeLeft, progress }) => (
  <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    className="max-w-2xl w-full bg-[#1A191E] rounded-2xl overflow-hidden shadow-2xl border border-white/5"
  >
    <div className="relative h-48 md:h-64 overflow-hidden">
      <motion.img
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse' }}
        src={config.imageUrl}
        alt="Kick Visual"
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#1A191E] to-transparent" />
      <div className="absolute top-4 right-4">
        <span className="px-3 py-1 bg-red-500/20 border border-red-500/50 text-red-500 text-xs font-bold rounded-full backdrop-blur-md">
          SUSPENDU
        </span>
      </div>
    </div>

    <div className="p-8 pt-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-white/5">
          <ShieldAlert className="w-6 h-6" style={{ color: config.accentColor }} />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{config.title}</h1>
      </div>

      <p className="text-white/60 text-lg leading-relaxed mb-8">
        {config.message}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
          <div className="flex items-center gap-2 text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">
            <Info className="w-3 h-3" /> Raison de l'exclusion
          </div>
          <p className="text-white/80 font-medium">{config.reason}</p>
        </div>
        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
          <div className="flex items-center gap-2 text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">
            <Clock className="w-3 h-3" /> Temps restant
          </div>
          <p className="text-2xl font-mono font-bold" style={{ color: config.accentColor }}>{timeLeft}</p>
        </div>
      </div>

      {config.showProgressBar && (
        <div className="mb-8">
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full"
              style={{ backgroundColor: config.accentColor }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <button className="flex-1 px-6 py-4 bg-white/5 text-white/40 font-bold rounded-xl cursor-not-allowed border border-white/5 flex items-center justify-center gap-2">
          Accès verrouillé
        </button>
        {config.staffContactUrl && (
          <a 
            href={config.staffContactUrl}
            className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-white/10"
          >
            <MessageCircle className="w-5 h-5" /> Contacter le staff
          </a>
        )}
      </div>
    </div>
  </motion.div>
);

const ImmersiveLayout: React.FC<{ config: KickConfig; timeLeft: string; progress: number }> = ({ config, timeLeft, progress }) => (
  <div className="relative w-full max-w-4xl h-[600px] flex items-center justify-center overflow-hidden rounded-3xl shadow-2xl border border-white/10">
    {/* Background Image */}
    <div className="absolute inset-0 z-0">
      <img
        src={config.imageUrl}
        className="w-full h-full object-cover opacity-30 scale-105 transition-transform duration-[20s]"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0D0C10]/80 to-[#0D0C10]" />
    </div>

    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="relative z-10 w-full max-w-lg text-center p-8"
    >
      <h1 className="text-4xl font-black mb-4 tracking-tighter uppercase italic">{config.title}</h1>
      <p className="text-white/70 text-lg mb-8 max-w-md mx-auto">{config.message}</p>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8">
        <div className="text-4xl font-mono font-black mb-2" style={{ color: config.accentColor }}>{timeLeft}</div>
        <div className="text-white/40 text-xs font-bold uppercase tracking-widest">Temps de réflexion restant</div>
      </div>

      <div className="flex justify-center gap-4">
        <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/60 text-sm font-medium">
          {config.reason}
        </div>
      </div>
    </motion.div>
  </div>
);

const PosterLayout: React.FC<{ config: KickConfig; timeLeft: string; progress: number }> = ({ config, timeLeft, progress }) => (
  <motion.div
    initial={{ x: -20, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    className="max-w-4xl w-full bg-[#1A191E] rounded-3xl overflow-hidden shadow-2xl border border-white/5 flex flex-col md:flex-row h-auto md:h-[550px]"
  >
    <div className="w-full md:w-[40%] relative">
      <img
        src={config.imageUrl}
        alt="Kick Visual"
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#1A191E] hidden md:block" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#1A191E] to-transparent md:hidden" />
    </div>

    <div className="flex-1 p-8 md:p-12 flex flex-col justify-center">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/40 text-[10px] font-bold uppercase tracking-widest mb-4">
          <ShieldAlert className="w-3 h-3" style={{ color: config.accentColor }} /> Notification Système
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight leading-none">{config.title}</h1>
        <p className="text-white/50 text-lg leading-relaxed">{config.message}</p>
      </div>

      <div className="space-y-6 mb-10">
        <div>
          <div className="text-white/30 text-[10px] font-bold uppercase tracking-widest mb-2">Motif de la sanction</div>
          <div className="text-xl font-medium text-white/90">{config.reason}</div>
        </div>
        
        <div className="flex items-end gap-4">
          <div>
            <div className="text-white/30 text-[10px] font-bold uppercase tracking-widest mb-2">Réintégration dans</div>
            <div className="text-4xl font-mono font-black" style={{ color: config.accentColor }}>{timeLeft}</div>
          </div>
          {config.showProgressBar && (
            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden mb-2">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full"
                style={{ backgroundColor: config.accentColor }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <button className="group px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all flex items-center gap-3 border border-white/10">
          <Info className="w-5 h-5 text-white/40" />
          Règlement intérieur
          <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
        </button>
      </div>
    </div>
  </motion.div>
);
