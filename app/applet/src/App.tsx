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
            className="w-24 h-24 rounded-3xl bg-[#7c5dfa] flex items-center justify-center shadow-[0_0_30px_rgba(124,93,250,0.6)] border-2 border-white/20 relative overflow-hidden"
          >
            {/* Decorative background elements */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent"></div>
            
            {/* Stylized Text Logo */}
            <span className="text-white font-black text-4xl tracking-tighter drop-shadow-md">FC</span>
            
            {/* Subtle glow effect */}
            <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-white/20 rounded-full blur-xl"></div>
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
