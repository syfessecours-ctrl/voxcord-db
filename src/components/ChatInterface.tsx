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
  me: User | null;
  onKickUser: (targetUsername: string, reason: string) => void;
  onBanUser: (targetUsername: string, reason: string) => void;
  onDeleteMessage: (messageId: number) => void;
  onClearChannel: (channelId: string) => void;
  onSetRole: (targetUsername: string, role: string) => void;
  onSendFriendRequest: (targetUsername: string) => void;
  onRespondFriendRequest: (requestId: number, response: 'accepted' | 'rejected') => void;
  onUpdateStatus: (status: 'online' | 'away') => void;
  onUpdateProfile: (profile: { displayName?: string, avatar?: string, bio?: string }) => void;
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
  onUpdateProfile,
  onSwitchPrivateChat,
  onCreateServer,
  onInviteToServer,
  onSwitchServer
}: ChatInterfaceProps) {
  const [inputText, setInputText] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showFriendsView, setShowFriendsView] = useState(true);
  const [friendSearch, setFriendSearch] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [showCreateServerModal, setShowCreateServerModal] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteTarget, setInviteTarget] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [profileForm, setProfileForm] = useState({
    displayName: me?.displayName || '',
    avatar: me?.avatar || '',
    bio: me?.bio || ''
  });
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

  useEffect(() => {
    if (me) {
      setProfileForm({
        displayName: me.displayName || '',
        avatar: me.avatar || '',
        bio: me.bio || ''
      });
    }
  }, [me]);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(profileForm);
    setShowProfileModal(false);
  };
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
      {/* 1. Server Sidebar (Far Left) */}
      <div className="w-[72px] bg-slate-100 border-r border-vox-border flex flex-col items-center py-4 gap-3 z-40">
        <div 
          onClick={() => {
            onSwitchServer(null);
            setShowFriendsView(true);
            onSwitchPrivateChat(null);
          }}
          className={cn(
            "w-12 h-12 rounded-[24px] flex items-center justify-center transition-all cursor-pointer group relative",
            !activeServer ? "bg-vox-primary text-white rounded-[16px]" : "bg-white text-vox-primary hover:bg-vox-primary hover:text-white hover:rounded-[16px]"
          )}
          title="Accueil"
        >
          <Users size={24} />
          {!activeServer && (
            <div className="absolute -left-2 w-1 h-8 bg-vox-primary rounded-r-full" />
          )}
        </div>
        
        <div className="w-8 h-[2px] bg-vox-border rounded-full mx-auto" />

        <div className="flex-1 w-full overflow-y-auto flex flex-col items-center gap-2 px-2 custom-scrollbar">
          {servers.map(srv => (
            <div 
              key={srv.id}
              onClick={() => {
                onSwitchServer(srv.id);
                setShowFriendsView(false);
              }}
              className={cn(
                "w-12 h-12 rounded-[24px] flex items-center justify-center transition-all cursor-pointer group relative",
                activeServer === srv.id ? "bg-vox-primary text-white rounded-[16px]" : "bg-white text-vox-muted hover:bg-vox-primary hover:text-white hover:rounded-[16px]"
              )}
              title={srv.name}
            >
              <div className="font-black text-xs">
                {srv.name.substring(0, 2).toUpperCase()}
              </div>
              {activeServer === srv.id && (
                <div className="absolute -left-2 w-1 h-8 bg-vox-primary rounded-r-full" />
              )}
            </div>
          ))}
          
          {canCreateServer && (
            <button 
              onClick={() => setShowCreateServerModal(true)}
              className="w-12 h-12 rounded-[24px] bg-white text-emerald-500 flex items-center justify-center hover:bg-emerald-500 hover:text-white hover:rounded-[16px] transition-all cursor-pointer"
              title="Créer un espace"
            >
              <Plus size={24} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Channel/DM Sidebar (Middle) */}
      <div className="w-64 bg-white border-r border-vox-border flex flex-col z-20">
        <div className="h-16 px-4 flex items-center border-b border-vox-border shadow-sm">
          <span className="font-black text-lg tracking-tighter text-vox-text truncate">
            {activeServer ? currentServer?.name : "Messages Directs"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          {!activeServer ? (
            <>
              <div>
                <div 
                  onClick={() => {
                    setShowFriendsView(true);
                    onSwitchPrivateChat(null);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all font-bold text-sm mb-1",
                    showFriendsView && !activePrivateChat ? "bg-vox-primary text-white shadow-md" : "text-vox-muted hover:bg-slate-50 hover:text-vox-text"
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
              </div>

              <div>
                <div className="px-3 mb-2 text-[9px] font-black text-vox-muted uppercase tracking-[0.2em]">Messages Directs</div>
                <div className="space-y-0.5">
                  {friends.map(f => (
                    <div 
                      key={f.username}
                      onClick={() => {
                        setShowFriendsView(false);
                        onSwitchPrivateChat(f.username);
                      }}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all font-bold text-sm",
                        activePrivateChat === f.username ? "bg-vox-primary/10 text-vox-primary" : "text-vox-muted hover:bg-slate-50 hover:text-vox-text"
                      )}
                    >
                      <div 
                        className="relative flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          const user = users.find(u => u.username === f.username);
                          if (user) setViewingUser(user);
                        }}
                      >
                        {users.find(u => u.username === f.username)?.avatar ? (
                          <img 
                            src={users.find(u => u.username === f.username)?.avatar} 
                            alt={f.username} 
                            className="w-8 h-8 rounded-xl object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-vox-muted font-bold text-[10px]">
                            {f.username[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white",
                          f.status === 'online' ? "bg-emerald-500" : f.status === 'away' ? "bg-amber-500" : "bg-slate-400"
                        )} />
                      </div>
                      <span className="truncate">{users.find(u => u.username === f.username)?.displayName || f.username}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div>
              <div className="px-3 mb-2 text-[9px] font-black text-vox-muted uppercase tracking-[0.2em]">Salons</div>
              <div className="space-y-0.5">
                {channels.map(ch => (
                  <div key={ch.id}>
                    <div 
                      onClick={() => {
                        setShowFriendsView(false);
                        onSwitchChannel(ch.id);
                      }}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all font-bold text-sm",
                        activeChannel === ch.id || activeVoiceChannel === ch.id ? "bg-vox-primary/10 text-vox-primary" : "text-vox-muted hover:bg-slate-50 hover:text-vox-text"
                      )}
                    >
                      {ch.type === 'voice' ? <Volume2 size={18} /> : <Hash size={18} />}
                      <span className="truncate">{ch.name}</span>
                    </div>
                    
                    {ch.type === 'voice' && voiceStates[ch.id] && voiceStates[ch.id].length > 0 && (
                      <div className="ml-9 mt-1 mb-2 space-y-1">
                        {voiceStates[ch.id].map(vu => (
                          <div key={vu.sid} className="flex items-center gap-2 py-0.5">
                            <div className="w-4 h-4 bg-slate-100 rounded-md flex items-center justify-center text-vox-muted text-[7px] font-bold">
                              {vu.username[0].toUpperCase()}
                            </div>
                            <span className="text-[10px] font-bold text-vox-muted">{vu.username}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile & Voice Status at bottom of sidebar */}
        <div className="p-2 bg-slate-50 border-t border-vox-border space-y-2">
          {activeVoiceChannel && (
            <div className="bg-white p-3 rounded-xl border border-vox-primary/20 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-vox-primary">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[8px] font-black uppercase tracking-widest">Vocal</span>
                </div>
                <button onClick={onLeaveVoice} className="text-vox-accent hover:scale-110 transition-all">
                  <PhoneOff size={12} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-vox-text truncate">Connecté</span>
                <button onClick={toggleMute} className="ml-auto text-vox-muted hover:text-vox-primary transition-all">
                  {isMuted ? <MicOff size={12} className="text-vox-accent" /> : <Mic size={12} />}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 p-1.5 bg-white rounded-xl border border-vox-border shadow-sm">
            <div 
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:bg-slate-50 p-1 rounded-lg transition-all"
            >
              <div className="relative flex-shrink-0">
                {me?.avatar ? (
                  <img src={me.avatar} alt={me.username} className="w-8 h-8 rounded-lg object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 bg-vox-primary rounded-lg flex items-center justify-center text-white text-[10px] font-bold">
                    {username[0].toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
              </div>
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="text-[11px] font-bold truncate">{me?.displayName || username}</span>
                <span className="text-[9px] text-vox-muted font-bold truncate">@{username}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-0.5">
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="p-1.5 text-vox-muted hover:text-vox-primary hover:bg-vox-primary/5 rounded-lg transition-all"
                title="Paramètres"
              >
                <Settings size={16} />
              </button>
              <button 
                onClick={onLogout}
                className="p-1.5 text-vox-muted hover:text-vox-accent hover:bg-vox-accent/5 rounded-lg transition-all"
                title="Déconnexion"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Content Area (Right) */}
      <div className="flex-1 flex flex-col min-w-0 bg-vox-bg relative">
          {showFriendsView ? (
            <div className="flex-1 flex flex-col">
              <div className="h-16 px-8 flex items-center justify-between bg-white/50 backdrop-blur-sm border-b border-vox-border">
                <div className="flex items-center gap-3">
                  <Users size={20} className="text-vox-primary" />
                  <span className="font-black text-lg tracking-tight">Gestion des Amis</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Ajouter par pseudo..."
                      value={friendSearch}
                      onChange={(e) => setFriendSearch(e.target.value)}
                      className="bg-white border border-vox-border rounded-2xl px-5 py-2 text-xs text-vox-text outline-none focus:ring-4 focus:ring-vox-primary/5 focus:border-vox-primary transition-all w-64 font-bold"
                    />
                    <button 
                      onClick={() => {
                        if (friendSearch.trim()) {
                          onSendFriendRequest(friendSearch);
                          setFriendSearch('');
                          alert("Demande d'ami envoyée !");
                        }
                      }}
                      className="absolute right-2 top-1.5 p-1.5 text-vox-primary hover:bg-vox-primary/10 rounded-xl transition-all"
                    >
                      <UserPlus size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-12">
                {friendRequests.length > 0 && (
                  <div>
                    <div className="text-[10px] font-black text-vox-muted uppercase tracking-[0.2em] mb-6">Demandes en attente ({friendRequests.length})</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {friendRequests.map(req => (
                        <div key={req.id} className="bg-white border border-vox-border p-6 rounded-[2rem] flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-vox-muted font-black text-lg border border-vox-border">
                              {req.from_user[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-black text-vox-text">{req.from_user}</div>
                              <div className="text-[10px] font-bold text-vox-muted uppercase tracking-wider">Demande d'ami</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => onRespondFriendRequest(req.id, 'accepted')}
                              className="w-10 h-10 flex items-center justify-center bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm"
                            >
                              <Check size={20} />
                            </button>
                            <button 
                              onClick={() => onRespondFriendRequest(req.id, 'rejected')}
                              className="w-10 h-10 flex items-center justify-center bg-vox-accent/5 text-vox-accent hover:bg-vox-accent hover:text-white rounded-xl transition-all shadow-sm"
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
                  <div className="text-[10px] font-black text-vox-muted uppercase tracking-[0.2em] mb-6">Liste d'amis ({friends.length})</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {friends.map(f => (
                      <div 
                        key={f.username} 
                        className="bg-white border border-vox-border p-6 rounded-[2rem] flex items-center justify-between group hover:border-vox-primary/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all cursor-pointer shadow-sm"
                        onClick={() => {
                          setShowFriendsView(false);
                          onSwitchPrivateChat(f.username);
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-vox-muted font-black text-lg border border-vox-border">
                              {f.username[0].toUpperCase()}
                            </div>
                            <div className={cn(
                              "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-white",
                              f.status === 'online' ? "bg-emerald-500" : f.status === 'away' ? "bg-amber-500" : "bg-slate-400"
                            )} />
                          </div>
                          <div>
                            <div className="text-sm font-black text-vox-text">{f.username}</div>
                            <div className="text-[10px] font-bold text-vox-muted uppercase tracking-widest">{f.status}</div>
                          </div>
                        </div>
                        <div className="w-10 h-10 flex items-center justify-center bg-slate-50 text-vox-muted group-hover:bg-vox-primary group-hover:text-white rounded-xl transition-all">
                          <MessageSquare size={20} />
                        </div>
                      </div>
                    ))}
                    {friends.length === 0 && (
                      <div className="col-span-full h-64 flex flex-col items-center justify-center text-vox-muted border-2 border-dashed border-vox-border rounded-[3rem] bg-white/30">
                        <Users size={48} className="mb-4 opacity-10" />
                        <p className="text-sm font-black uppercase tracking-widest opacity-40">Aucun ami pour le moment</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="h-16 px-8 flex items-center justify-between bg-white/50 backdrop-blur-sm border-b border-vox-border">
                <div className="flex items-center gap-4">
                  {activePrivateChat ? (
                    <>
                      <div className="relative">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-vox-muted font-black text-sm border border-vox-border">
                          {activePrivateChat[0]?.toUpperCase()}
                        </div>
                        <div className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                          friends.find(f => f.username === activePrivateChat)?.status === 'online' ? "bg-emerald-500" : 
                          friends.find(f => f.username === activePrivateChat)?.status === 'away' ? "bg-amber-500" : "bg-slate-400"
                        )} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-vox-text tracking-tight">{activePrivateChat}</span>
                        <span className="text-[9px] font-bold text-vox-muted uppercase tracking-widest">Message Direct</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 bg-vox-primary/10 rounded-xl flex items-center justify-center text-vox-primary border border-vox-primary/20">
                        <Hash size={20} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-vox-text tracking-tight">{currentChannel?.name}</span>
                        <span className="text-[9px] font-bold text-vox-muted uppercase tracking-widest">{currentServer?.name}</span>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {!activePrivateChat && isOwner && (
                    <button 
                      onClick={handleClear}
                      className="p-2.5 text-vox-muted hover:text-vox-accent hover:bg-vox-accent/5 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    >
                      <Eraser size={18} />
                      <span className="hidden sm:inline">Vider</span>
                    </button>
                  )}
                  {activeServer && currentServer?.owner === username && (
                    <button 
                      onClick={() => setShowInviteModal(true)}
                      className="p-2.5 text-vox-primary hover:bg-vox-primary/5 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    >
                      <UserPlus size={18} />
                      <span className="hidden sm:inline">Inviter</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Messages Area */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
                {displayMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-vox-muted opacity-30">
                    <MessageSquare size={64} className="mb-4" />
                    <p className="font-black uppercase tracking-[0.3em] text-xs">Début de la discussion</p>
                  </div>
                )}
                {displayMessages.map((msg) => {
                  const isMe = ((msg as any).user || (msg as any).from_user) === username;
                  return (
                    <div key={msg.id} className={cn(
                      "flex gap-4 group relative max-w-[85%]",
                      isMe ? "ml-auto flex-row-reverse" : ""
                    )}>
                      <div 
                        className="w-10 h-10 bg-white border border-vox-border rounded-xl flex-shrink-0 flex items-center justify-center text-vox-muted font-black text-xs shadow-sm cursor-pointer overflow-hidden"
                        onClick={() => {
                          const user = users.find(u => u.username === ((msg as any).user || (msg as any).from_user));
                          if (user) setViewingUser(user);
                        }}
                      >
                        {users.find(u => u.username === ((msg as any).user || (msg as any).from_user))?.avatar ? (
                          <img 
                            src={users.find(u => u.username === ((msg as any).user || (msg as any).from_user))?.avatar} 
                            alt="Avatar" 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          (msg as any).user ? (msg as any).user[0]?.toUpperCase() : (msg as any).from_user[0]?.toUpperCase()
                        )}
                      </div>
                      <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span 
                            className="font-black text-vox-text text-[11px] cursor-pointer hover:underline"
                            onClick={() => {
                              const user = users.find(u => u.username === ((msg as any).user || (msg as any).from_user));
                              if (user) setViewingUser(user);
                            }}
                          >
                            {users.find(u => u.username === ((msg as any).user || (msg as any).from_user))?.displayName || ((msg as any).user || (msg as any).from_user)}
                          </span>
                          <span className="text-[9px] text-vox-muted font-bold">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className={cn(
                          "px-5 py-3.5 rounded-[1.5rem] text-sm leading-relaxed break-words shadow-sm border",
                          isMe ? "bg-vox-primary text-white border-vox-primary/20 rounded-tr-none" : "bg-white text-vox-text border-vox-border rounded-tl-none"
                        )}>
                          {msg.text}
                          {msg.file && (
                            <div className="mt-3 rounded-xl overflow-hidden border border-black/5">
                              {msg.file.startsWith('data:image') ? (
                                <img src={msg.file} alt="Upload" className="max-h-64 w-full object-cover" />
                              ) : (
                                <div className="p-3 bg-black/5 flex items-center gap-3">
                                  <ImageIcon size={20} />
                                  <a href={msg.file} download="file" className="text-[10px] font-black uppercase tracking-widest hover:underline">Fichier</a>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {!activePrivateChat && isMod && (
                        <button 
                          onClick={() => onDeleteMessage(msg.id)}
                          className={cn(
                            "absolute top-0 p-2 text-vox-muted hover:text-vox-accent opacity-0 group-hover:opacity-100 transition-all",
                            isMe ? "-left-10" : "-right-10"
                          )}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Input Area */}
              <div className="p-8 pt-0">
                <div className="bg-white rounded-[2.5rem] border border-vox-border p-2 shadow-xl shadow-indigo-500/5 focus-within:border-vox-primary/50 transition-all">
                  <form 
                    onSubmit={handleSendMessage}
                    className="flex items-center gap-2"
                  >
                    <label className="w-12 h-12 flex items-center justify-center text-vox-muted hover:text-vox-primary hover:bg-vox-primary/5 rounded-full transition-all cursor-pointer">
                      <Plus size={24} />
                      <input type="file" className="hidden" onChange={handleFileUpload} />
                    </label>
                    <input 
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={activePrivateChat ? `Message à @${activePrivateChat}` : `Message dans #${currentChannel?.name}`}
                      className="flex-1 bg-transparent border-none outline-none text-vox-text py-3 px-2 text-sm font-bold placeholder:text-vox-muted/50"
                    />
                    <div className="flex items-center gap-1">
                      <button type="button" className="w-12 h-12 flex items-center justify-center text-vox-muted hover:text-vox-primary hover:bg-vox-primary/5 rounded-full transition-all">
                        <Smile size={24} />
                      </button>
                      <button type="submit" disabled={!inputText.trim()} className="w-12 h-12 flex items-center justify-center bg-vox-primary text-white rounded-full hover:bg-vox-primary-hover hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:hover:scale-100">
                        <Send size={20} />
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </>
          )}
        </div>

      {/* Members Sidebar */}
      {!showFriendsView && activeServer && (
        <div className="w-64 bg-white border-l border-vox-border hidden lg:flex flex-col z-10">
          <div className="h-16 px-6 flex items-center border-b border-vox-border">
            <span className="text-[10px] font-black text-vox-muted uppercase tracking-[0.2em]">Membres — {users.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {users.map(u => (
              <div 
                key={u.id} 
                onClick={() => setViewingUser(u)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-slate-50 transition-all group cursor-pointer"
                )}
              >
                <div className="relative">
                  {u.avatar ? (
                    <img src={u.avatar} alt={u.username} className="w-8 h-8 rounded-xl object-cover border border-vox-border" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-vox-muted font-black text-[10px] border border-vox-border">
                      {u.username[0].toUpperCase()}
                    </div>
                  )}
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white",
                    u.status === 'online' ? "bg-emerald-500" : u.status === 'away' ? "bg-amber-500" : "bg-slate-400"
                  )} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className={cn(
                    "text-xs font-black truncate",
                    u.role === 'owner' ? "text-vox-accent" : u.role === 'moderator' ? "text-vox-primary" : "text-vox-text"
                  )}>
                    {u.displayName || u.username}
                  </span>
                  {u.role !== 'user' && (
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-50">{u.role}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Moderation Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white p-8 rounded-[3rem] border border-vox-border shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-vox-primary" />
              
              <div className="flex flex-col items-center text-center mb-8 pt-4">
                <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-vox-muted font-black text-3xl border-2 border-vox-border mb-4 shadow-sm">
                  {selectedUser.username[0].toUpperCase()}
                </div>
                <h3 className="text-2xl font-black text-vox-text tracking-tight">{selectedUser.username}</h3>
                <div className="px-3 py-1 bg-slate-100 rounded-full text-[9px] font-black text-vox-muted uppercase tracking-widest mt-2">
                  Options de Modération
                </div>
              </div>

              <div className="space-y-3">
                {isOwner && (
                  <>
                    {selectedUser.role !== 'moderator' ? (
                      <button 
                        onClick={() => handleSetRole(selectedUser.username, 'moderator')}
                        className="w-full flex items-center justify-between p-4 bg-vox-primary/5 hover:bg-vox-primary text-vox-primary hover:text-white rounded-2xl transition-all font-black text-xs uppercase tracking-widest group"
                      >
                        <span>Promouvoir Modérateur</span>
                        <ShieldAlert size={18} className="group-hover:scale-110 transition-transform" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleSetRole(selectedUser.username, 'user')}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-200 text-vox-muted rounded-2xl transition-all font-black text-xs uppercase tracking-widest group"
                      >
                        <span>Rétrograder</span>
                        <UserX size={18} className="group-hover:scale-110 transition-transform" />
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
                  className="w-full flex items-center justify-between p-4 bg-amber-50 hover:bg-amber-500 text-amber-600 hover:text-white rounded-2xl transition-all font-black text-xs uppercase tracking-widest group"
                >
                  <span>Expulser (Kick)</span>
                  <UserX size={18} className="group-hover:scale-110 transition-transform" />
                </button>
                {isOwner && (
                  <button 
                    onClick={() => {
                      const reason = prompt("Raison du bannissement ?");
                      if (reason) onBanUser(selectedUser.username, reason);
                      setSelectedUser(null);
                    }}
                    className="w-full flex items-center justify-between p-4 bg-vox-accent/5 hover:bg-vox-accent text-vox-accent hover:text-white rounded-2xl transition-all font-black text-xs uppercase tracking-widest group"
                  >
                    <span>Bannir (Ban IP)</span>
                    <Ban size={18} className="group-hover:scale-110 transition-transform" />
                  </button>
                )}
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="w-full p-4 text-vox-muted hover:text-vox-text font-black text-xs uppercase tracking-widest transition-all mt-4"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="w-full max-w-md bg-white p-10 rounded-[3rem] border border-vox-border shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-vox-primary" />
              
              <div className="mb-10">
                <h2 className="text-3xl font-black text-vox-text tracking-tighter mb-2">Paramètres</h2>
                <p className="text-vox-muted text-sm font-bold uppercase tracking-widest opacity-60">Audio & Expérience</p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-vox-border group hover:border-vox-primary/30 transition-all">
                  <div>
                    <div className="text-sm font-black text-vox-text mb-1">Annulation d'écho</div>
                    <div className="text-[9px] text-vox-muted font-black uppercase tracking-[0.2em] opacity-50">Echo Cancellation</div>
                  </div>
                  <button 
                    onClick={() => setEchoCancellation(!echoCancellation)}
                    className={cn(
                      "w-14 h-8 rounded-full transition-all relative p-1",
                      echoCancellation ? "bg-vox-primary" : "bg-slate-300"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 bg-white rounded-full transition-all shadow-md",
                      echoCancellation ? "translate-x-6" : "translate-x-0"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-vox-border group hover:border-vox-primary/30 transition-all">
                  <div>
                    <div className="text-sm font-black text-vox-text mb-1">Suppression du bruit</div>
                    <div className="text-[9px] text-vox-muted font-black uppercase tracking-[0.2em] opacity-50">Noise Suppression</div>
                  </div>
                  <button 
                    onClick={() => setNoiseSuppression(!noiseSuppression)}
                    className={cn(
                      "w-14 h-8 rounded-full transition-all relative p-1",
                      noiseSuppression ? "bg-vox-primary" : "bg-slate-300"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 bg-white rounded-full transition-all shadow-md",
                      noiseSuppression ? "translate-x-6" : "translate-x-0"
                    )} />
                  </button>
                </div>

                <div className="p-6 bg-amber-50 border border-amber-100 rounded-[2rem] flex gap-4">
                  <ShieldAlert size={24} className="text-amber-500 flex-shrink-0" />
                  <p className="text-[10px] text-amber-700 font-black uppercase tracking-widest leading-relaxed">
                    Les changements prendront effet lors de votre prochaine connexion vocale.
                  </p>
                </div>

                <button 
                  onClick={() => setShowSettingsModal(false)}
                  className="w-full py-5 px-4 bg-vox-text text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-black transition-all mt-6 shadow-lg shadow-slate-200"
                >
                  Enregistrer & Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Edit Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black tracking-tight">Mon Profil</h2>
                  <button onClick={() => setShowProfileModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-vox-muted uppercase tracking-widest mb-2">Avatar (URL)</label>
                    <input 
                      type="text"
                      value={profileForm.avatar}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, avatar: e.target.value }))}
                      className="w-full bg-slate-50 border border-vox-border rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-vox-primary/5 focus:border-vox-primary transition-all"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-vox-muted uppercase tracking-widest mb-2">Nom d'affichage</label>
                    <input 
                      type="text"
                      value={profileForm.displayName}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}
                      className="w-full bg-slate-50 border border-vox-border rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-vox-primary/5 focus:border-vox-primary transition-all"
                      placeholder="Votre nom"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-vox-muted uppercase tracking-widest mb-2">Bio</label>
                    <textarea 
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                      className="w-full bg-slate-50 border border-vox-border rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-vox-primary/5 focus:border-vox-primary transition-all h-24 resize-none"
                      placeholder="Parlez-nous de vous..."
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-vox-primary text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Enregistrer
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Profile View Modal */}
      <AnimatePresence>
        {viewingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="h-24 bg-vox-primary" />
              <div className="px-8 pb-8 -mt-12">
                <div className="flex justify-between items-end mb-4">
                  <div className="relative">
                    {viewingUser.avatar ? (
                      <img src={viewingUser.avatar} alt={viewingUser.username} className="w-24 h-24 rounded-[2rem] border-4 border-white object-cover shadow-lg" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-24 h-24 bg-slate-100 rounded-[2rem] border-4 border-white flex items-center justify-center text-vox-muted font-black text-3xl shadow-lg">
                        {viewingUser.username[0].toUpperCase()}
                      </div>
                    )}
                    <div className={cn(
                      "absolute bottom-1 right-1 w-6 h-6 rounded-full border-4 border-white",
                      viewingUser.status === 'online' ? "bg-emerald-500" : viewingUser.status === 'away' ? "bg-amber-500" : "bg-slate-400"
                    )} />
                  </div>
                  <button onClick={() => setViewingUser(null)} className="p-2 hover:bg-slate-100 rounded-full transition-all mb-4">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-black tracking-tight">{viewingUser.displayName || viewingUser.username}</h3>
                    <p className="text-xs font-bold text-vox-muted">@{viewingUser.username}</p>
                  </div>

                  {viewingUser.bio && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-vox-border">
                      <p className="text-xs leading-relaxed text-vox-text font-medium">{viewingUser.bio}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {viewingUser.username !== username && (
                      <button 
                        onClick={() => {
                          onSwitchPrivateChat(viewingUser.username);
                          setViewingUser(null);
                        }}
                        className="flex-1 bg-vox-primary text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                      >
                        <MessageSquare size={16} />
                        Message
                      </button>
                    )}
                    {viewingUser.username !== username && !friends.some(f => f.username === viewingUser.username) && (
                      <button 
                        onClick={() => {
                          onSendFriendRequest(viewingUser.username);
                          alert("Demande d'ami envoyée !");
                        }}
                        className="flex-1 bg-slate-100 text-vox-text py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
                      >
                        <UserPlus size={16} />
                        Ajouter
                      </button>
                    )}
                  </div>

                  {isMod && viewingUser.username !== username && (
                    <button 
                      onClick={() => {
                        setSelectedUser(viewingUser);
                        setViewingUser(null);
                      }}
                      className="w-full mt-2 bg-vox-accent/5 text-vox-accent py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-vox-accent hover:text-white transition-all"
                    >
                      <ShieldAlert size={16} />
                      Modération
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCreateServerModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="w-full max-w-md bg-white p-10 rounded-[3rem] border border-vox-border shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-vox-primary" />
              
              <div className="mb-10">
                <h2 className="text-3xl font-black text-vox-text tracking-tighter mb-2">Nouvel Espace</h2>
                <p className="text-vox-muted text-sm font-bold uppercase tracking-widest opacity-60">Créez votre propre communauté</p>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-vox-muted uppercase tracking-[0.2em] ml-1">Nom de votre espace</label>
                  <input 
                    type="text"
                    value={newServerName}
                    onChange={(e) => setNewServerName(e.target.value)}
                    placeholder="Ex: La Famille, Les Amis..."
                    className="w-full bg-slate-50 border border-vox-border rounded-[1.5rem] px-6 py-5 text-vox-text font-bold outline-none focus:ring-4 focus:ring-vox-primary/5 focus:border-vox-primary transition-all"
                    autoFocus
                  />
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setShowCreateServerModal(false)}
                    className="flex-1 py-5 px-4 bg-slate-50 text-vox-muted rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={handleCreateServer}
                    disabled={!newServerName.trim()}
                    className="flex-1 py-5 px-4 bg-vox-primary text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-vox-primary-hover hover:-translate-y-1 active:translate-y-0 shadow-xl shadow-indigo-200 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    Créer l'espace
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="w-full max-w-md bg-white p-10 rounded-[3rem] border border-vox-border shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-vox-primary" />
              
              <div className="mb-10">
                <h2 className="text-3xl font-black text-vox-text tracking-tighter mb-2">Invitation</h2>
                <p className="text-vox-muted text-sm font-bold uppercase tracking-widest opacity-60">Invitez un ami sur {currentServer?.name}</p>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-vox-muted uppercase tracking-[0.2em] ml-1">Pseudo de l'invité</label>
                  <input 
                    type="text"
                    value={inviteTarget}
                    onChange={(e) => setInviteTarget(e.target.value)}
                    placeholder="Ex: JeanDupont"
                    className="w-full bg-slate-50 border border-vox-border rounded-[1.5rem] px-6 py-5 text-vox-text font-bold outline-none focus:ring-4 focus:ring-vox-primary/5 focus:border-vox-primary transition-all"
                    autoFocus
                  />
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 py-5 px-4 bg-slate-50 text-vox-muted rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={handleInvite}
                    disabled={!inviteTarget.trim()}
                    className="flex-1 py-5 px-4 bg-vox-primary text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-vox-primary-hover hover:-translate-y-1 active:translate-y-0 shadow-xl shadow-indigo-200 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    Envoyer
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
