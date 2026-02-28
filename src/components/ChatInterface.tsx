import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Peer } from 'peerjs';
import { 
  Hash, 
  Send, 
  Plus, 
  LogOut, 
  Image as ImageIcon,
  Smile,
  Trash2,
  ShieldAlert,
  UserX,
  Ban,
  Eraser,
  Users,
  UserPlus,
  Check,
  X,
  MessageSquare,
  ArrowLeft,
  Volume2,
  Mic,
  MicOff,
  PhoneOff,
  Server as ServerIcon,
  Settings
} from 'lucide-react';
import { cn } from '../lib/utils';
import { User, Channel, Message, Friend, FriendRequest, PrivateMessage, Server as ServerType } from '../types';

interface ChatInterfaceProps {
  username: string;
  users: User[];
  servers: ServerType[];
  channels: Channel[];
  messages: Message[];
  friends: Friend[];
  friendRequests: FriendRequest[];
  privateMessages: Record<string, PrivateMessage[]>;
  activeServer: string | null;
  activeChannel: string;
  activePrivateChat: string | null;
  activeVoiceChannel: string | null;
  voiceUsers: { sid: string, username: string }[];
  voiceStates: Record<string, { sid: string, username: string }[]>;
  onSendMessage: (text?: string, file?: string | ArrayBuffer | null) => void;
  onSwitchChannel: (id: string) => void;
  onJoinVoice: (id: string) => void;
  onLeaveVoice: () => void;
  onSendVoiceSignal: (to: string, signal: any) => void;
  onLogout: () => void;
  me: { username: string, role: string } | null;
  onKickUser: (targetUsername: string, reason: string) => void;
  onBanUser: (targetUsername: string, reason: string) => void;
  onDeleteMessage: (messageId: number) => void;
  onClearChannel: (channelId: string) => void;
  onSetRole: (targetUsername: string, role: string) => void;
  onSendFriendRequest: (targetUsername: string) => void;
  onRespondFriendRequest: (requestId: number, response: 'accepted' | 'rejected') => void;
  onUpdateStatus: (status: 'online' | 'away') => void;
  onSwitchPrivateChat: (otherUser: string | null) => void;
  onCreateServer: (name: string) => void;
  onInviteToServer: (serverId: string, targetUsername: string) => void;
  onSwitchServer: (id: string | null) => void;
}

export function ChatInterface({
  username,
  users,
  servers,
  channels,
  messages,
  friends,
  friendRequests,
  privateMessages,
  activeServer,
  activeChannel,
  activePrivateChat,
  activeVoiceChannel,
  voiceUsers,
  voiceStates,
  onSendMessage,
  onSwitchChannel,
  onJoinVoice,
  onLeaveVoice,
  onSendVoiceSignal,
  onLogout,
  me,
  onKickUser,
  onBanUser,
  onDeleteMessage,
  onClearChannel,
  onSetRole,
  onSendFriendRequest,
  onRespondFriendRequest,
  onUpdateStatus,
  onSwitchPrivateChat,
  onCreateServer,
  onInviteToServer,
  onSwitchServer
}: ChatInterfaceProps) {
  const [inputText, setInputText] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showFriendsView, setShowFriendsView] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [showCreateServerModal, setShowCreateServerModal] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteTarget, setInviteTarget] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const myStreamRef = useRef<MediaStream | null>(null);
  const callsRef = useRef<Record<string, any>>({});
  const remoteStreamsRef = useRef<Record<string, MediaStream>>({});
  const [remoteStreams, setRemoteStreams] = useState<number>(0); // Trigger re-render
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const signaledUsersRef = useRef<Set<string>>(new Set());

  const voiceUsersRef = useRef(voiceUsers);

  useEffect(() => {
    voiceUsersRef.current = voiceUsers;
  }, [voiceUsers]);

  const isOwner = me?.role === 'owner';
  const isMod = isOwner || me?.role === 'moderator';

  const currentPrivateMessages = activePrivateChat ? (privateMessages[activePrivateChat] || []) : [];
  const displayMessages = activePrivateChat ? currentPrivateMessages : messages;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayMessages, activeChannel, activePrivateChat]);

  useEffect(() => {
    console.log("[Chat] Servers updated:", servers);
  }, [servers]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        onSendMessage(undefined, reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSetRole = (u: string, role: string) => {
    onSetRole(u, role);
    setSelectedUser(null);
  };

  const handleClear = () => {
    if (confirm("Voulez-vous vraiment effacer tout le salon ?")) {
      onClearChannel(activeChannel);
    }
  };

  useEffect(() => {
    if (activeVoiceChannel) {
      console.log("[Voice] Joining channel:", activeVoiceChannel);
      startVoiceChat();
    } else {
      console.log("[Voice] Leaving channel");
      stopVoiceChat();
    }
    return () => stopVoiceChat();
  }, [activeVoiceChannel]);

  // Signaling: When I have a Peer ID, tell everyone in the voice channel
  useEffect(() => {
    if (activeVoiceChannel && myPeerId) {
      console.log("[Voice] Signaling my Peer ID to others:", voiceUsers.length - 1, "others");
      voiceUsers.forEach(vu => {
        if (vu.username !== username) {
          onSendVoiceSignal(vu.sid, { type: 'peer-id', peerId: myPeerId });
        }
      });
    }
  }, [myPeerId, activeVoiceChannel]); // Removed voiceUsers from deps to avoid spamming, but we might need it for new joiners

  // Also signal to new joiners
  useEffect(() => {
    if (activeVoiceChannel && myPeerId) {
      const lastUser = voiceUsers[voiceUsers.length - 1];
      if (lastUser && lastUser.username !== username && !signaledUsersRef.current.has(lastUser.sid)) {
        onSendVoiceSignal(lastUser.sid, { type: 'peer-id', peerId: myPeerId });
        signaledUsersRef.current.add(lastUser.sid);
      }
    }
  }, [voiceUsers, activeVoiceChannel, myPeerId]);

  useEffect(() => {
    const handleVoiceSignal = (e: any) => {
      const { from, signal, username: fromUser } = e.detail;
      console.log(`[Voice] Received signal from ${fromUser}:`, signal.type);
      
      if (peerRef.current && signal.type === 'peer-id') {
        if (activeVoiceChannel && !callsRef.current[from]) {
          console.log(`[Voice] Calling ${fromUser} at peer ${signal.peerId}`);
          const call = peerRef.current.call(signal.peerId, myStreamRef.current!);
          callsRef.current[from] = call;
          call.on('stream', (remoteStream) => {
            console.log(`[Voice] Received stream from ${fromUser}`);
            addRemoteStream(from, remoteStream);
          });
          call.on('error', (err) => console.error(`[Voice] Call error with ${fromUser}:`, err));
        }
      }
    };

    window.addEventListener('vox_voice_signal' as any, handleVoiceSignal);
    return () => window.removeEventListener('vox_voice_signal' as any, handleVoiceSignal);
  }, [activeVoiceChannel]);

  const startVoiceChat = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation,
          noiseSuppression,
          autoGainControl: false, // Disabling this to fix "rollercoaster" volume swings
        } 
      });
      myStreamRef.current = stream;
      
      const peer = new Peer({
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
          ]
        }
      });
      peerRef.current = peer;

      peer.on('open', (id) => {
        console.log('[Voice] My peer ID is: ' + id);
        setMyPeerId(id);
      });

      peer.on('call', (call) => {
        console.log('[Voice] Receiving call from:', call.peer);
        call.answer(myStreamRef.current!);
        call.on('stream', (remoteStream) => {
          console.log('[Voice] Received stream from caller:', call.peer);
          addRemoteStream(call.peer, remoteStream);
        });
      });

      peer.on('error', (err) => {
        console.error("[Voice] Peer error:", err);
      });

    } catch (err) {
      console.error("[Voice] Failed to start voice chat:", err);
      alert("Impossible d'accéder au micro. Vérifiez les permissions.");
    }
  };

  const addRemoteStream = (id: string, stream: MediaStream) => {
    remoteStreamsRef.current[id] = stream;
    setRemoteStreams(prev => prev + 1);
    
    const audio = new Audio();
    audio.srcObject = stream;
    audio.play().catch(e => console.error("Audio play failed", e));
  };

  const stopVoiceChat = () => {
    myStreamRef.current?.getTracks().forEach(track => track.stop());
    myStreamRef.current = null;
    peerRef.current?.destroy();
    peerRef.current = null;
    setMyPeerId(null);
    signaledUsersRef.current.clear();
    callsRef.current = {};
    remoteStreamsRef.current = {};
    setRemoteStreams(0);
  };

  const handleCreateServer = () => {
    if (newServerName.trim()) {
      onCreateServer(newServerName);
      setNewServerName('');
      setShowCreateServerModal(false);
    }
  };

  const handleInvite = () => {
    if (activeServer && inviteTarget.trim()) {
      onInviteToServer(activeServer, inviteTarget);
      setInviteTarget('');
      setShowInviteModal(false);
    }
  };

  const toggleMute = () => {
    if (myStreamRef.current) {
      const audioTrack = myStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const currentServer = servers.find(s => s.id === activeServer);
  const currentChannel = channels.find(c => c.id === activeChannel);

  const canCreateServer = !servers.some(s => s.owner === username) || me?.role === 'owner';

  return (
    <div className="flex h-screen bg-vox-bg text-vox-text overflow-hidden font-sans w-full">
      {/* Server Rail */}
      <div className="w-[76px] bg-slate-100 flex flex-col items-center py-4 gap-3 border-r border-vox-border">
        <div 
          onClick={() => {
            setShowFriendsView(true);
            onSwitchPrivateChat(null);
            onSwitchServer(null);
          }}
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer group shadow-sm",
            showFriendsView || (!activeServer && !activePrivateChat) ? "bg-vox-primary text-white" : "bg-vox-surface text-vox-muted hover:bg-vox-primary hover:text-white"
          )}
          title="Amis & Messages Privés"
        >
          <Users size={24} />
        </div>
        
        <div className="w-8 h-[1px] bg-vox-border my-1" />

        {servers.map(srv => (
          <div 
            key={srv.id}
            onClick={() => {
              setShowFriendsView(false);
              onSwitchServer(srv.id);
            }}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer group relative shadow-sm",
              activeServer === srv.id ? "bg-vox-primary text-white" : "bg-vox-surface text-vox-muted hover:bg-vox-primary hover:text-white"
            )}
            title={srv.name}
          >
            {activeServer === srv.id && (
              <div className="absolute -left-4 w-1.5 h-8 bg-vox-primary rounded-r-full" />
            )}
            <span className="font-bold text-sm">
              {srv.name.substring(0, 2).toUpperCase()}
            </span>
          </div>
        ))}

        {canCreateServer && (
          <div 
            onClick={() => setShowCreateServerModal(true)}
            className="w-12 h-12 rounded-2xl bg-vox-surface text-emerald-500 flex items-center justify-center transition-all cursor-pointer hover:bg-emerald-500 hover:text-white shadow-sm"
            title="Créer un serveur"
          >
            <Plus size={24} />
          </div>
        )}
      </div>

      {/* Sidebar Channels / Friends */}
      <div className="w-64 bg-slate-50 flex flex-col border-r border-vox-border">
        <div className="h-16 px-5 flex items-center border-b border-vox-border font-bold text-vox-text tracking-tight">
          {activeServer ? currentServer?.name : "VOX"}
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {showFriendsView || (!activeServer && !activePrivateChat) ? (
            <>
              <div 
                onClick={() => {
                  setShowFriendsView(true);
                  onSwitchPrivateChat(null);
                }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all font-semibold",
                  showFriendsView && !activePrivateChat ? "bg-vox-primary/10 text-vox-primary" : "text-vox-muted hover:bg-slate-200/50 hover:text-vox-text"
                )}
              >
                <Users size={18} />
                <span>Amis</span>
                {friendRequests.length > 0 && (
                  <span className="ml-auto bg-vox-accent text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {friendRequests.length}
                  </span>
                )}
              </div>

              <div className="px-3 mt-6 mb-2 text-[10px] font-bold text-vox-muted uppercase tracking-widest">Messages Privés</div>
              {friends.map(f => (
                <div 
                  key={f.username}
                  onClick={() => {
                    setShowFriendsView(false);
                    onSwitchPrivateChat(f.username);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all font-semibold",
                    activePrivateChat === f.username ? "bg-vox-primary/10 text-vox-primary" : "text-vox-muted hover:bg-slate-200/50 hover:text-vox-text"
                  )}
                >
                  <div className="relative">
                    <div className="w-9 h-9 bg-slate-200 rounded-xl flex items-center justify-center text-vox-muted font-bold text-xs">
                      {f.username[0]?.toUpperCase()}
                    </div>
                    <div className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-50",
                      f.status === 'online' ? "bg-emerald-500" : f.status === 'away' ? "bg-amber-500" : "bg-slate-400"
                    )} />
                  </div>
                  <span className="truncate">{f.username}</span>
                </div>
              ))}
            </>
          ) : activeServer ? (
            <>
              <div className="flex items-center justify-between px-3 mt-4 mb-2">
                <div className="text-[10px] font-bold text-vox-muted uppercase tracking-widest">Salons</div>
              </div>
              {channels.map(ch => (
                <div key={ch.id}>
                  <div 
                    onClick={() => {
                      setShowFriendsView(false);
                      onSwitchChannel(ch.id);
                    }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all font-semibold",
                      activeChannel === ch.id || activeVoiceChannel === ch.id ? "bg-vox-primary/10 text-vox-primary" : "text-vox-muted hover:bg-slate-200/50 hover:text-vox-text"
                    )}
                  >
                    {ch.type === 'voice' ? <Volume2 size={18} /> : <Hash size={18} />}
                    <span>{ch.name}</span>
                  </div>
                  
                  {/* Global Voice Participants */}
                  {ch.type === 'voice' && voiceStates[ch.id] && voiceStates[ch.id].length > 0 && (
                    <div className="ml-9 mt-1 mb-3 space-y-1">
                      {voiceStates[ch.id].map(vu => (
                        <div key={vu.sid} className="flex items-center gap-2 py-0.5">
                          <div className="w-5 h-5 bg-slate-200 rounded-md flex items-center justify-center text-vox-muted text-[8px] font-bold">
                            {vu.username[0].toUpperCase()}
                          </div>
                          <span className="text-[11px] font-medium text-vox-muted">{vu.username}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {activeVoiceChannel && (
                <div className="mt-6 px-4 py-4 bg-vox-surface rounded-2xl border border-vox-primary/10 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-vox-primary">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Vocal Connecté</span>
                    </div>
                    <button onClick={onLeaveVoice} className="text-vox-accent hover:scale-110 transition-all">
                      <PhoneOff size={16} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-vox-primary rounded-lg flex items-center justify-center text-white text-[10px] font-bold">
                        {username[0].toUpperCase()}
                      </div>
                      <span className="text-xs font-bold text-vox-text">{username}</span>
                      <button onClick={toggleMute} className="ml-auto text-vox-muted hover:text-vox-primary transition-all">
                        {isMuted ? <MicOff size={14} className="text-vox-accent" /> : <Mic size={14} />}
                      </button>
                    </div>
                    {voiceUsers.filter(vu => vu.username !== username).map(vu => (
                      <div key={vu.sid} className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-vox-muted text-[10px] font-bold">
                          {vu.username[0].toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-vox-text">{vu.username}</span>
                        <Volume2 size={14} className="ml-auto text-vox-muted" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentServer?.owner === username && (
                <button 
                  onClick={() => setShowInviteModal(true)}
                  className="mt-6 mx-3 flex items-center justify-center gap-2 py-2.5 px-4 bg-vox-primary text-white rounded-xl font-bold text-xs hover:bg-vox-primary-hover shadow-md shadow-indigo-100 transition-all"
                >
                  <UserPlus size={14} />
                  Inviter
                </button>
              )}
            </>
          ) : activePrivateChat ? (
             <div 
                onClick={() => {
                  setShowFriendsView(true);
                  onSwitchPrivateChat(null);
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all font-semibold text-vox-muted hover:bg-slate-200/50 hover:text-vox-text"
              >
                <ArrowLeft size={18} />
                <span>Retour aux Amis</span>
              </div>
          ) : null}
        </div>
        <div className="p-4 bg-white border-t border-vox-border flex items-center gap-3">
          <div className="w-10 h-10 bg-vox-primary rounded-2xl flex items-center justify-center text-white font-bold shadow-sm">
            {username[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-vox-text truncate">{username}</div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <select 
                onChange={(e) => onUpdateStatus(e.target.value as any)}
                className="text-[10px] text-vox-muted font-bold uppercase bg-transparent border-none outline-none cursor-pointer hover:text-vox-primary transition-all"
              >
                <option value="online">En ligne</option>
                <option value="away">Absent</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowSettingsModal(true)} 
              className="p-2 hover:bg-slate-100 rounded-xl text-vox-muted hover:text-vox-primary transition-all"
              title="Paramètres audio"
            >
              <Settings size={18} />
            </button>
            <button onClick={onLogout} className="p-2 hover:bg-slate-100 rounded-xl text-vox-muted hover:text-vox-accent transition-all">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {showFriendsView ? (
          <div className="flex-1 flex flex-col">
            <div className="h-16 px-6 flex items-center border-b border-vox-border justify-between bg-white/80 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <Users size={20} className="text-vox-muted" />
                <span className="font-bold text-vox-text">Amis</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Ajouter un ami..."
                    value={friendSearch}
                    onChange={(e) => setFriendSearch(e.target.value)}
                    className="bg-slate-100 border border-vox-border rounded-xl px-4 py-2 text-xs text-vox-text outline-none focus:ring-2 focus:ring-vox-primary/20 focus:border-vox-primary transition-all w-56"
                  />
                  <button 
                    onClick={() => {
                      if (friendSearch.trim()) {
                        onSendFriendRequest(friendSearch);
                        setFriendSearch('');
                        alert("Demande d'ami envoyée !");
                      }
                    }}
                    className="absolute right-2 top-1.5 p-1 text-vox-primary hover:bg-vox-primary/10 rounded-lg"
                  >
                    <UserPlus size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10">
              {friendRequests.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-vox-muted uppercase tracking-widest mb-4">Demandes en attente — {friendRequests.length}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {friendRequests.map(req => (
                      <div key={req.id} className="bg-white border border-vox-border p-5 rounded-3xl flex items-center justify-between card-shadow">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-vox-muted font-bold">
                            {req.from_user[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-vox-text">{req.from_user}</div>
                            <div className="text-[10px] text-vox-muted">Souhaite être votre ami</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => onRespondFriendRequest(req.id, 'accepted')}
                            className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all"
                          >
                            <Check size={20} />
                          </button>
                          <button 
                            onClick={() => onRespondFriendRequest(req.id, 'rejected')}
                            className="p-2.5 bg-vox-accent/10 text-vox-accent hover:bg-vox-accent/20 rounded-xl transition-all"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-[10px] font-bold text-vox-muted uppercase tracking-widest mb-4">Tous les amis — {friends.length}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {friends.map(f => (
                    <div 
                      key={f.username} 
                      className="bg-white border border-vox-border p-5 rounded-3xl flex items-center justify-between group hover:border-vox-primary/30 transition-all cursor-pointer card-shadow"
                      onClick={() => {
                        setShowFriendsView(false);
                        onSwitchPrivateChat(f.username);
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-vox-muted font-bold">
                            {f.username[0].toUpperCase()}
                          </div>
                          <div className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white",
                            f.status === 'online' ? "bg-emerald-500" : f.status === 'away' ? "bg-amber-500" : "bg-slate-400"
                          )} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-vox-text">{f.username}</div>
                          <div className="text-[10px] text-vox-muted capitalize">{f.status}</div>
                        </div>
                      </div>
                      <div className="p-2.5 text-vox-muted group-hover:text-vox-primary transition-all">
                        <MessageSquare size={20} />
                      </div>
                    </div>
                  ))}
                  {friends.length === 0 && (
                    <div className="col-span-full h-40 flex flex-col items-center justify-center text-vox-muted border-2 border-dashed border-vox-border rounded-[2.5rem]">
                      <Users size={40} className="mb-3 opacity-20" />
                      <p className="text-sm font-bold">Votre liste d'amis est vide.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="h-16 px-6 flex items-center border-b border-vox-border justify-between bg-white/80 backdrop-blur-md">
              <div className="flex items-center gap-3">
                {activePrivateChat ? (
                  <>
                    <div className="relative">
                      <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-vox-muted font-bold text-xs">
                        {activePrivateChat[0]?.toUpperCase()}
                      </div>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                        friends.find(f => f.username === activePrivateChat)?.status === 'online' ? "bg-emerald-500" : 
                        friends.find(f => f.username === activePrivateChat)?.status === 'away' ? "bg-amber-500" : "bg-slate-400"
                      )} />
                    </div>
                    <span className="font-bold text-vox-text">{activePrivateChat}</span>
                  </>
                ) : (
                  <>
                    <div className="w-9 h-9 bg-vox-primary/10 rounded-xl flex items-center justify-center text-vox-primary">
                      <Hash size={20} />
                    </div>
                    <span className="font-bold text-vox-text">{currentChannel?.name}</span>
                  </>
                )}
              </div>
              {!activePrivateChat && isOwner && (
                <button 
                  onClick={handleClear}
                  className="p-2 text-vox-muted hover:text-vox-accent transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                >
                  <Eraser size={18} />
                  <span className="hidden sm:inline">Nettoyer</span>
                </button>
              )}
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8">
              {displayMessages.map((msg) => (
                <div key={msg.id} className="flex gap-5 group relative">
                  <div className="w-11 h-11 bg-slate-100 rounded-2xl flex-shrink-0 flex items-center justify-center text-vox-muted font-bold">
                    {(msg as any).user ? (msg as any).user[0]?.toUpperCase() : (msg as any).from_user[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-3 mb-1.5">
                      <span className="font-bold text-vox-text text-sm">{(msg as any).user || (msg as any).from_user}</span>
                      <span className="text-[10px] text-vox-muted font-medium">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-vox-text text-sm leading-relaxed break-words bg-slate-50 p-4 rounded-2xl rounded-tl-none inline-block max-w-[85%] border border-vox-border/50">
                      {msg.text}
                    </div>
                    {msg.file && (
                      <div className="mt-3 max-w-sm rounded-2xl overflow-hidden border border-vox-border shadow-sm">
                        {msg.file.startsWith('data:image') ? (
                          <img src={msg.file} alt="Upload" className="max-h-72 object-contain" />
                        ) : (
                          <div className="p-4 bg-slate-50 flex items-center gap-3">
                            <ImageIcon size={24} className="text-vox-primary" />
                            <a href={msg.file} download="file" className="text-xs font-bold text-vox-primary hover:underline">Télécharger le fichier</a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {!activePrivateChat && isMod && (
                    <button 
                      onClick={() => onDeleteMessage(msg.id)}
                      className="absolute right-0 top-0 p-2 text-vox-muted hover:text-vox-accent opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="p-8 pt-0">
              <form 
                onSubmit={handleSendMessage}
                className="bg-slate-50 rounded-[2rem] flex items-center px-5 py-3 gap-4 border border-vox-border focus-within:ring-4 focus-within:ring-vox-primary/5 focus-within:border-vox-primary/30 transition-all shadow-sm"
              >
                <label className="p-2 text-vox-muted hover:text-vox-primary transition-all cursor-pointer">
                  <Plus size={24} />
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
                <input 
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={activePrivateChat ? `Message à @${activePrivateChat}` : `Message dans #${currentChannel?.name}`}
                  className="flex-1 bg-transparent border-none outline-none text-vox-text py-2 text-sm font-medium"
                />
                <div className="flex items-center gap-3 text-vox-muted">
                  <Smile size={24} className="hover:text-vox-primary cursor-pointer transition-all" />
                  <button type="submit" className="p-3 bg-vox-primary text-white rounded-2xl hover:bg-vox-primary-hover hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-100">
                    <Send size={20} />
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>

      {/* Sidebar Users */}
      <div className="w-64 bg-slate-50 border-l border-vox-border hidden lg:flex flex-col">
        <div className="h-16 px-6 flex items-center border-b border-vox-border text-[10px] font-bold text-vox-muted uppercase tracking-widest">
          Membres — {users.length}
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {users.map(u => (
            <div 
              key={u.id} 
              onClick={() => isMod && u.username !== username && setSelectedUser(u)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative",
                isMod && u.username !== username ? "cursor-pointer hover:bg-slate-200/50" : ""
              )}
            >
              <div className="relative">
                <div className="w-9 h-9 bg-slate-200 rounded-xl flex items-center justify-center text-vox-muted font-bold text-xs">
                  {u.username[0]?.toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-50" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-vox-text truncate">{u.username}</div>
                <div className="text-[10px] text-vox-muted font-medium">En ligne</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Moderation Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm bg-white p-8 rounded-[2.5rem] border border-vox-border shadow-2xl"
            >
              <div className="flex items-center gap-5 mb-8">
                <div className="w-14 h-14 bg-vox-primary rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-indigo-100">
                  {selectedUser.username[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-vox-text">{selectedUser.username}</h3>
                  <p className="text-vox-muted text-xs font-bold uppercase tracking-widest">Modération</p>
                </div>
              </div>

              <div className="space-y-3">
                {isOwner && (
                  <>
                    {selectedUser.role !== 'moderator' ? (
                      <button 
                        onClick={() => handleSetRole(selectedUser.username, 'moderator')}
                        className="w-full flex items-center gap-3 p-4 bg-vox-primary/5 hover:bg-vox-primary/10 text-vox-primary rounded-2xl transition-all font-bold text-sm"
                      >
                        <ShieldAlert size={20} />
                        Promouvoir Modérateur
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleSetRole(selectedUser.username, 'user')}
                        className="w-full flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 text-vox-muted rounded-2xl transition-all font-bold text-sm"
                      >
                        <UserX size={20} />
                        Rétrograder
                      </button>
                    )}
                  </>
                )}
                
                <button 
                  onClick={() => {
                    const reason = prompt("Raison de l'expulsion ?");
                    if (reason) onKickUser(selectedUser.username, reason);
                    setSelectedUser(null);
                  }}
                  className="w-full flex items-center gap-3 p-4 bg-slate-50 hover:bg-amber-50 text-amber-600 rounded-2xl transition-all font-bold text-sm"
                >
                  <UserX size={20} />
                  Expulser (Kick)
                </button>
                {isOwner && (
                  <button 
                    onClick={() => {
                      const reason = prompt("Raison du bannissement ?");
                      if (reason) onBanUser(selectedUser.username, reason);
                      setSelectedUser(null);
                    }}
                    className="w-full flex items-center gap-3 p-4 bg-slate-50 hover:bg-vox-accent/10 text-vox-accent rounded-2xl transition-all font-bold text-sm"
                  >
                    <Ban size={20} />
                    Bannir (Ban IP)
                  </button>
                )}
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="w-full p-4 text-vox-muted hover:text-vox-text font-bold text-sm transition-all"
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-md bg-white p-10 rounded-[2.5rem] border border-vox-border shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-vox-text mb-2">Paramètres Audio</h2>
              <p className="text-vox-muted text-sm mb-8">Ajustez vos préférences vocales.</p>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-vox-border">
                  <div>
                    <div className="text-sm font-bold text-vox-text">Annulation d'écho</div>
                    <div className="text-[10px] text-vox-muted font-bold uppercase tracking-widest">Echo Cancellation</div>
                  </div>
                  <button 
                    onClick={() => setEchoCancellation(!echoCancellation)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      echoCancellation ? "bg-vox-primary" : "bg-slate-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                      echoCancellation ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-vox-border">
                  <div>
                    <div className="text-sm font-bold text-vox-text">Suppression du bruit</div>
                    <div className="text-[10px] text-vox-muted font-bold uppercase tracking-widest">Noise Suppression</div>
                  </div>
                  <button 
                    onClick={() => setNoiseSuppression(!noiseSuppression)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      noiseSuppression ? "bg-vox-primary" : "bg-slate-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                      noiseSuppression ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                  <p className="text-[10px] text-amber-600 font-bold leading-relaxed">
                    Note: Les changements prendront effet la prochaine fois que vous rejoindrez un salon vocal.
                  </p>
                </div>
                
                <button 
                  onClick={() => setShowSettingsModal(false)}
                  className="w-full py-4 bg-vox-primary text-white rounded-2xl font-bold hover:bg-vox-primary-hover hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-indigo-100 transition-all"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Server Modal */}
      <AnimatePresence>
        {showCreateServerModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-md bg-white p-10 rounded-[2.5rem] border border-vox-border shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-vox-text mb-2">Créer votre serveur</h2>
              <p className="text-vox-muted text-sm mb-8">Donnez un nom unique à votre espace.</p>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-vox-muted uppercase tracking-widest ml-1">Nom du serveur</label>
                  <input 
                    type="text"
                    value={newServerName}
                    onChange={(e) => setNewServerName(e.target.value)}
                    placeholder="Ex: La Famille"
                    className="w-full bg-slate-50 border border-vox-border rounded-2xl px-5 py-4 text-vox-text outline-none focus:ring-2 focus:ring-vox-primary/20 focus:border-vox-primary transition-all"
                    autoFocus
                  />
                </div>
                
                <div className="flex gap-4 pt-2">
                  <button 
                    onClick={() => setShowCreateServerModal(false)}
                    className="flex-1 py-4 px-4 bg-slate-50 text-vox-muted rounded-2xl font-bold hover:bg-slate-100 transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={handleCreateServer}
                    disabled={!newServerName.trim()}
                    className="flex-1 py-4 px-4 bg-vox-primary text-white rounded-2xl font-bold hover:bg-vox-primary-hover hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    Créer
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-md bg-white p-10 rounded-[2.5rem] border border-vox-border shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-vox-text mb-2">Inviter un ami</h2>
              <p className="text-vox-muted text-sm mb-8">Invitez quelqu'un sur {currentServer?.name}.</p>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-vox-muted uppercase tracking-widest ml-1">Pseudo de l'utilisateur</label>
                  <input 
                    type="text"
                    value={inviteTarget}
                    onChange={(e) => setInviteTarget(e.target.value)}
                    placeholder="Pseudo"
                    className="w-full bg-slate-50 border border-vox-border rounded-2xl px-5 py-4 text-vox-text outline-none focus:ring-2 focus:ring-vox-primary/20 focus:border-vox-primary transition-all"
                    autoFocus
                  />
                </div>
                
                <div className="flex gap-4 pt-2">
                  <button 
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 py-4 px-4 bg-slate-50 text-vox-muted rounded-2xl font-bold hover:bg-slate-100 transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={handleInvite}
                    disabled={!inviteTarget.trim()}
                    className="flex-1 py-4 px-4 bg-vox-primary text-white rounded-2xl font-bold hover:bg-vox-primary-hover hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    Inviter
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
