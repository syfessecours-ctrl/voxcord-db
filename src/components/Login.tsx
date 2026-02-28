import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MessageSquare } from 'lucide-react';

interface LoginProps {
  onLogin: (u: string, p: string) => void;
  error: string | null;
  initialUsername: string;
}

export function Login({ onLogin, error, initialUsername }: LoginProps) {
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#16161a] p-8 rounded-3xl border border-white/5 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#00f2ff] rounded-2xl flex items-center justify-center text-[#0a0a0c] mb-4 shadow-[0_0_20px_rgba(0,242,255,0.3)]">
            <MessageSquare size={32} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">VOXCORD</h1>
          <p className="text-gray-500 text-sm mt-1">Connectez-vous pour discuter</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Pseudo</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#0a0a0c] border border-white/5 rounded-2xl p-4 text-white outline-none focus:border-[#00f2ff]/50 transition-all"
              placeholder="Votre pseudo"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Mot de passe</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0a0a0c] border border-white/5 rounded-2xl p-4 text-white outline-none focus:border-[#00f2ff]/50 transition-all"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
          <button 
            type="submit"
            className="w-full bg-[#00f2ff] text-[#0a0a0c] font-black py-4 rounded-2xl shadow-[0_0_15px_rgba(0,242,255,0.2)] hover:brightness-110 transition-all"
          >
            REJOINDRE
          </button>
        </form>
      </motion.div>
    </div>
  );
}
