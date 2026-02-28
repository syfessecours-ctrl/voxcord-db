import React, { useState } from 'react';
import { motion } from 'motion/react';

export default function App() {
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login attempt:', { pseudo, password });
  };

  return (
    <div className="min-h-screen bg-[#1e1e24] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md fitcord-card rounded-[40px] p-10 flex flex-col items-center"
      >
        {/* Logo Container */}
        <div className="relative mb-8">
          <div 
            className="w-24 h-24 rounded-3xl bg-[#7c5dfa] flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(124,93,250,0.4)] border border-white/10 relative"
          >
            {/* Fallback text that is always there behind the image */}
            <span className="absolute text-white font-bold text-3xl tracking-tighter opacity-20">FC</span>
            
            <img 
              src="https://m.media-amazon.com/images/M/MV5BNDg4NjM1OTY5NF5BMl5BanBnXkFtZTcwMDMyMzQyMQ@@._V1_FMjpg_UX1000_.jpg" 
              alt="" // Empty alt to prevent broken text from showing
              className="w-full h-full object-cover relative z-10"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // If the image fails, we just hide it to show the "FC" fallback
                (e.target as HTMLImageElement).style.opacity = '0';
              }}
            />
          </div>
        </div>

        <h1 className="text-3xl font-bold tracking-tight mb-2">FITCORD</h1>
        <p className="text-[#888891] text-sm mb-10">Heureux de vous revoir !</p>

        <form onSubmit={handleSubmit} className="w-full space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#888891] ml-1">
              Pseudo
            </label>
            <input 
              type="text" 
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="Ex: Jean Dupont"
              className="w-full fitcord-input rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c5dfa]/50 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#888891] ml-1">
              Mot de passe
            </label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full fitcord-input rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c5dfa]/50 transition-all"
            />
          </div>

          <button 
            type="submit"
            className="w-full fitcord-purple fitcord-purple-glow rounded-2xl py-4 font-bold text-sm uppercase tracking-widest hover:bg-[#6d4ee0] transition-all active:scale-[0.98] mt-4"
          >
            Se connecter
          </button>
        </form>
      </motion.div>
    </div>
  );
}
