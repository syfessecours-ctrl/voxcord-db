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
    <div className="min-h-screen bg-fit-bg flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-fit-surface p-10 rounded-[2.5rem] border border-fit-border card-shadow"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-fit-primary rounded-3xl flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-200 overflow-hidden">
            <img 
              src="https://m.media-amazon.com/images/M/MV5BNDg4NjM1YjYtMzcyZC00NjZlLTk0Y2QtNzI3MGEzZDUyZDExXkEyXkFqcGdeQXVyNjU0OTQ0OTY@._V1_.jpg" 
              alt="FitCord Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-3xl font-bold text-fit-text tracking-tight uppercase">FitCord</h1>
          <p className="text-fit-muted text-sm mt-2">Heureux de vous revoir !</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-fit-muted uppercase tracking-wider ml-1">Pseudo</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-fit-bg border border-fit-border rounded-2xl p-4 text-fit-text outline-none focus:ring-4 focus:ring-fit-primary/5 focus:border-fit-primary transition-all"
              placeholder="Ex: Jean Dupont"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-fit-muted uppercase tracking-wider ml-1">Mot de passe</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-fit-bg border border-fit-border rounded-2xl p-4 text-fit-text outline-none focus:ring-4 focus:ring-fit-primary/5 focus:border-fit-primary transition-all"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-fit-accent text-xs font-bold text-center uppercase tracking-widest">{error}</p>}
          <button 
            type="submit"
            className="w-full bg-fit-primary text-white font-black text-xs tracking-widest py-5 rounded-2xl shadow-xl shadow-fit-primary/20 hover:bg-fit-primary-hover hover:-translate-y-1 active:translate-y-0 transition-all"
          >
            SE CONNECTER
          </button>
        </form>
      </motion.div>
    </div>
  );
}
