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
    <div className="min-h-screen bg-vox-bg flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-vox-surface p-10 rounded-[2.5rem] border border-vox-border card-shadow"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-vox-primary rounded-3xl flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-200">
            <MessageSquare size={40} />
          </div>
          <h1 className="text-3xl font-bold text-vox-text tracking-tight">VOX</h1>
          <p className="text-vox-muted text-sm mt-2">Heureux de vous revoir !</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-vox-muted uppercase tracking-wider ml-1">Pseudo</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-50 border border-vox-border rounded-2xl p-4 text-vox-text outline-none focus:ring-2 focus:ring-vox-primary/20 focus:border-vox-primary transition-all"
              placeholder="Ex: Jean Dupont"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-vox-muted uppercase tracking-wider ml-1">Mot de passe</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-vox-border rounded-2xl p-4 text-vox-text outline-none focus:ring-2 focus:ring-vox-primary/20 focus:border-vox-primary transition-all"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-red-500 text-xs font-medium text-center">{error}</p>}
          <button 
            type="submit"
            className="w-full bg-vox-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-vox-primary-hover hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            SE CONNECTER
          </button>
        </form>
      </motion.div>
    </div>
  );
}
