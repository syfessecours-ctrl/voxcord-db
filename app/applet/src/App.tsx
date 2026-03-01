import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { 
  Plus,
  Hash, 
  Send, 
  Lock, 
  Unlock, 
  Settings, 
  LogOut, 
  User, 
  Shield, 
  MessageSquare,
  AlertCircle
} from 'lucide-react';

// Types
interface Message {
  id: string;
  text: string;
  sender: string;
  channelId: string;
  timestamp: string;
  isAdmin?: boolean;
}

interface Channel {
  id: string;
  name: string;
  locked: boolean;
  lockMessage: string;
  backgroundUrl?: string;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState('general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [serverConfig, setServerConfig] = useState({ logoUrl: '' });
  
  // Admin Lock State
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [lockChannelId, setLockChannelId] = useState('general');
  const [lockMessage, setLockMessage] = useState('');

  // Create Channel State
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Connect to Socket.io
  useEffect(() => {
    if (isLoggedIn) {
      const newSocket = io();
      setSocket(newSocket);

      newSocket.on('init', (data: { channels: Channel[], messages: Message[], serverConfig: any }) => {
        setChannels(data.channels);
        setMessages(data.messages);
        if (data.serverConfig) setServerConfig(data.serverConfig);
      });

      newSocket.on('new_message', (message: Message) => {
        setMessages(prev => [...prev, message]);
      });

      newSocket.on('channels_updated', (updatedChannels: Channel[]) => {
        setChannels(updatedChannels);
      });

      newSocket.on('config_updated', (config: any) => {
        setServerConfig(config);
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [isLoggedIn]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannelId]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pseudo.trim()) {
      setIsLoggedIn(true);
      
      /**
       * SECURITY REQUIREMENT:
       * Only the user "Vdw6200" is allowed to have Owner/Admin permissions.
       * This is a strict requirement from the site owner.
       */
      if (pseudo === 'Vdw6200') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !newMessage.trim()) return;

    const activeChannel = channels.find(c => c.id === activeChannelId);
    if (activeChannel?.locked && !isAdmin) return;

    socket.emit('send_message', {
      text: newMessage,
      sender: pseudo,
      channelId: activeChannelId,
      isAdmin: isAdmin
    });
    setNewMessage('');
  };

  const handleLockChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !isAdmin) return;

    socket.emit('lock_channel', {
      channelId: lockChannelId,
      locked: true,
      sender: pseudo,
      lockMessage: lockMessage || "Ce salon est actuellement verrouillé par un administrateur."
    });
    setLockMessage('');
  };

  const handleUnlockChannel = (channelId: string) => {
    if (!socket || !isAdmin) return;
    socket.emit('lock_channel', {
      channelId: channelId,
      locked: false,
      sender: pseudo
    });
  };

  const handleUpdateChannelBackground = (channelId: string, url: string) => {
    if (!socket || !isAdmin) return;
    socket.emit('update_channel', {
      channelId: channelId,
      sender: pseudo,
      updates: { backgroundUrl: url }
    });
  };

  const handleCreateChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !isAdmin || !newChannelName.trim()) return;

    socket.emit('create_channel', {
      name: newChannelName.trim(),
      sender: pseudo
    });
    setNewChannelName('');
    setShowCreateChannel(false);
  };

  const handleUpdateLogo = (url: string) => {
    if (!socket || !isAdmin) return;
    socket.emit('update_server_config', {
      sender: pseudo,
      config: { logoUrl: url }
    });
  };

  const activeChannel = channels.find(c => c.id === activeChannelId);
  const filteredMessages = messages.filter(m => m.channelId === activeChannelId);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#1e1e24] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md fitcord-card rounded-[40px] p-10 flex flex-col items-center"
        >
          {/* Logo Container */}
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-3xl bg-[#7c5dfa] flex items-center justify-center shadow-[0_0_30px_rgba(124,93,250,0.6)] border-2 border-white/20 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent"></div>
              {serverConfig.logoUrl ? (
                <img src={serverConfig.logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-white font-black text-4xl tracking-tighter drop-shadow-md">FC</span>
              )}
              <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-white/20 rounded-full blur-xl"></div>
            </div>
          </div>

          <h1 className="text-3xl font-bold tracking-tight mb-2">FITCORD</h1>
          <p className="text-[#888891] text-sm mb-10">Heureux de vous revoir !</p>

          <form onSubmit={handleLogin} className="w-full space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#888891] ml-1">
                Pseudo
              </label>
              <input 
                type="text" 
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                placeholder="Ex: Jean Dupont"
                className="w-full fitcord-input rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c5dfa]/50 transition-all text-white"
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
                className="w-full fitcord-input rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c5dfa]/50 transition-all text-white"
              />
            </div>

            <button 
              type="submit"
              className="w-full fitcord-purple fitcord-purple-glow rounded-2xl py-4 font-bold text-sm uppercase tracking-widest hover:bg-[#6d4ee0] transition-all active:scale-[0.98] mt-4 text-white"
            >
              Se connecter
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#1e1e24] text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-[#2b2b36] flex flex-col border-r border-white/5">
        <div className="p-6 flex items-center space-x-3 border-bottom border-white/5">
          <div className="w-10 h-10 rounded-xl bg-[#7c5dfa] flex items-center justify-center font-black text-sm overflow-hidden">
            {serverConfig.logoUrl ? (
              <img src={serverConfig.logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              "FC"
            )}
          </div>
          <h1 className="font-bold tracking-tight">FITCORD</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#888891]">
              Salons Textuels
            </span>
            {isAdmin && (
              <button 
                onClick={() => setShowCreateChannel(true)}
                className="p-1 text-[#888891] hover:text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Create Channel Inline Input */}
          <AnimatePresence>
            {showCreateChannel && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-3 mb-4"
              >
                <form onSubmit={handleCreateChannel} className="space-y-2">
                  <input 
                    autoFocus
                    type="text" 
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="Nom du salon"
                    className="w-full bg-[#1e1e24] border border-white/5 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#7c5dfa]"
                  />
                  <div className="flex space-x-2">
                    <button 
                      type="submit"
                      className="flex-1 bg-[#7c5dfa] text-white text-[10px] font-bold py-1.5 rounded-lg"
                    >
                      Créer
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowCreateChannel(false)}
                      className="flex-1 bg-white/5 text-[#888891] text-[10px] font-bold py-1.5 rounded-lg"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {channels.map(channel => (
            <button
              key={channel.id}
              onClick={() => setActiveChannelId(channel.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
                activeChannelId === channel.id 
                  ? 'bg-[#7c5dfa] text-white' 
                  : 'text-[#888891] hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Hash className="w-4 h-4 opacity-50" />
                <span className="font-medium text-sm">{channel.name}</span>
              </div>
              {channel.locked && <Lock className="w-3 h-3 opacity-50" />}
            </button>
          ))}
        </div>

        {/* User Profile */}
        <div className="p-4 bg-[#1e1e24]/50 border-t border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#7c5dfa]/20 flex items-center justify-center text-[#7c5dfa]">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold flex items-center space-x-1">
                  <span>{pseudo}</span>
                  {isAdmin && <Shield className="w-3 h-3 text-[#7c5dfa]" />}
                </div>
                <div className="text-[10px] text-[#888891]">#0001</div>
              </div>
            </div>
            <button 
              onClick={() => setIsLoggedIn(false)}
              className="p-2 text-[#888891] hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#1e1e24] relative">
        {/* Header */}
        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#2b2b36]/30 backdrop-blur-sm">
          <div className="flex items-center space-x-2">
            <Hash className="w-5 h-5 text-[#888891]" />
            <h2 className="font-bold">{activeChannel?.name}</h2>
            {activeChannel?.locked && (
              <div className="flex items-center space-x-1 bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ml-2">
                <Lock className="w-3 h-3" />
                <span>Verrouillé</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {isAdmin && (
              <button 
                onClick={() => setShowAdminPanel(!showAdminPanel)}
                className={`p-2 rounded-xl transition-all ${showAdminPanel ? 'bg-[#7c5dfa] text-white' : 'text-[#888891] hover:bg-white/5'}`}
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 relative">
          {/* Channel Background */}
          {activeChannel?.backgroundUrl && (
            <div 
              className="absolute inset-0 z-0 pointer-events-none opacity-20"
              style={{ 
                backgroundImage: `url(${activeChannel.backgroundUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(2px)'
              }}
            />
          )}
          
          <div className="relative z-10 space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeChannelId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {filteredMessages.length === 0 ? (
                  <div className="h-[60vh] flex flex-col items-center justify-center text-[#888891] space-y-4 opacity-50">
                    <MessageSquare className="w-12 h-12" />
                    <p className="text-sm italic">Aucun message ici. Commencez la conversation !</p>
                  </div>
                ) : (
                  filteredMessages.map((msg) => (
                    <motion.div 
                      key={msg.id} 
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start space-x-4 group"
                    >
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold shrink-0 ${msg.isAdmin ? 'bg-[#7c5dfa]' : 'bg-white/5'}`}>
                        {msg.sender[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`font-bold text-sm ${msg.isAdmin ? 'text-[#7c5dfa]' : 'text-white'}`}>{msg.sender}</span>
                          {msg.isAdmin && <Shield className="w-3 h-3 text-[#7c5dfa]" />}
                          <span className="text-[10px] text-[#888891]">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-[#d1d1d6] text-sm leading-relaxed">{msg.text}</p>
                      </div>
                    </motion.div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Input Area */}
        <div className="p-6">
          {activeChannel?.locked && !isAdmin ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center space-x-4 text-red-400">
              <Lock className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{activeChannel.lockMessage}</p>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="relative">
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`Envoyer un message dans #${activeChannel?.name}`}
                className="w-full bg-[#2b2b36] border border-white/5 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c5dfa]/50 transition-all pr-16"
              />
              <button 
                type="submit"
                disabled={!newMessage.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#7c5dfa] p-2 rounded-xl text-white hover:bg-[#6d4ee0] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          )}
        </div>

        {/* Admin Panel Overlay */}
        <AnimatePresence>
          {showAdminPanel && (
            <motion.div 
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="absolute top-0 right-0 w-80 h-full bg-[#2b2b36] shadow-2xl border-l border-white/5 z-20 p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-bold flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-[#7c5dfa]" />
                  <span>Administration</span>
                </h3>
                <button onClick={() => setShowAdminPanel(false)} className="text-[#888891] hover:text-white">
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#888891]">
                    Verrouiller un Salon
                  </label>
                  <div className="space-y-4">
                    <select 
                      value={lockChannelId}
                      onChange={(e) => setLockChannelId(e.target.value)}
                      className="w-full bg-[#1e1e24] border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none"
                    >
                      {channels.map(c => (
                        <option key={c.id} value={c.id}>#{c.name} {c.locked ? '(Verrouillé)' : ''}</option>
                      ))}
                    </select>
                    
                    {channels.find(c => c.id === lockChannelId)?.locked ? (
                      <button 
                        onClick={() => handleUnlockChannel(lockChannelId)}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-3 text-sm font-bold flex items-center justify-center space-x-2 transition-all"
                      >
                        <Unlock className="w-4 h-4" />
                        <span>Déverrouiller</span>
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <textarea 
                          value={lockMessage}
                          onChange={(e) => setLockMessage(e.target.value)}
                          placeholder="Message de verrouillage..."
                          className="w-full bg-[#1e1e24] border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none min-h-[100px] resize-none"
                        />
                        <button 
                          onClick={handleLockChannel}
                          className="w-full bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 text-sm font-bold flex items-center justify-center space-x-2 transition-all"
                        >
                          <Lock className="w-4 h-4" />
                          <span>Verrouiller Salon</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex items-center space-x-2 text-amber-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Note</span>
                  </div>
                  <p className="text-[11px] text-[#888891] leading-relaxed">
                    Le verrouillage d'un salon empêche tous les membres non-administrateurs d'envoyer des messages.
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#888891]">
                    Personnalisation FitCord
                  </label>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] text-[#888891] ml-1">URL du Logo du Serveur</span>
                      <input 
                        type="text" 
                        value={serverConfig.logoUrl}
                        onChange={(e) => handleUpdateLogo(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-[#1e1e24] border border-white/5 rounded-xl px-4 py-3 text-xs focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-[#888891] ml-1">Fond du Salon #{activeChannel?.name}</span>
                      <input 
                        type="text" 
                        value={activeChannel?.backgroundUrl || ''}
                        onChange={(e) => handleUpdateChannelBackground(activeChannelId, e.target.value)}
                        placeholder="URL de l'image (PNG/JPG)..."
                        className="w-full bg-[#1e1e24] border border-white/5 rounded-xl px-4 py-3 text-xs focus:outline-none"
                      />
                    </div>
                    
                    <p className="text-[10px] text-[#888891] italic px-1">
                      Les modifications s'appliquent instantanément pour tous.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
