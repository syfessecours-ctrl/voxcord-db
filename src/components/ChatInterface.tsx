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
  Lock,
  Unlock,
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
  serverMembers: string[];
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
  onDeleteServer: (serverId: string) => void;
  onDeleteChannel: (channelId: string) => void;
  onJoinServer: (serverId: string) => void;
  onLockChannel: (channelId: string, lockMessage: string) => void;
  onUnlockChannel: (channelId: string) => void;
  onUpdateChannelBackground: (channelId: string, backgroundUrl: string) => void;
  onUpdateChannelDescription: (channelId: string, description: string) => void;
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
  serverMembers,
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
  onDeleteServer,
  onDeleteChannel,
  onJoinServer,
  onLockChannel,
  onUnlockChannel,
  onUpdateChannelBackground,
  onUpdateChannelDescription,
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
  const [showLockModal, setShowLockModal] = useState(false);
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [newBackgroundUrl, setNewBackgroundUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [lockMessage, setLockMessage] = useState('Seul les modérateurs peuvent écrire ici');
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

  const handleDeleteServer = (serverId: string) => {
    if (confirm("Voulez-vous vraiment supprimer ce serveur ? Cette action est irréversible.")) {
      onDeleteServer(serverId);
    }
  };

  const handleDeleteChannel = (channelId: string) => {
    if (confirm("Voulez-vous vraiment supprimer ce salon ?")) {
      onDeleteChannel(channelId);
    }
  };

  const handleLock = () => {
    onLockChannel(activeChannel, lockMessage);
    setShowLockModal(false);
  };

  const handleUpdateBackground = () => {
    onUpdateChannelBackground(activeChannel, newBackgroundUrl);
    setShowBackgroundModal(false);
    setNewBackgroundUrl('');
  };

  const handleBackgroundFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        onUpdateChannelBackground(activeChannel, reader.result as string);
        setShowBackgroundModal(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateDescription = () => {
    onUpdateChannelDescription(activeChannel, newDescription);
    setShowDescriptionModal(false);
    setNewDescription('');
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

  const isServerOwner = currentServer?.owner === username;
  const canManageChannel = isOwner || isServerOwner;

  const canCreateServer = !servers.some(s => s.owner === username) || me?.role === 'owner';

  return (
    <div className="flex h-screen bg-fit-bg text-fit-text overflow-hidden font-sans w-full">
      {/* 1. Server Sidebar (Far Left) */}
      <div className="w-[72px] bg-fit-sidebar border-r border-fit-border flex flex-col items-center py-4 gap-3 z-40">
        <div 
          onClick={() => {
            onSwitchServer(null);
            setShowFriendsView(true);
            onSwitchPrivateChat(null);
          }}
          className={cn(
            "w-12 h-12 rounded-[24px] flex items-center justify-center transition-all cursor-pointer group relative overflow-hidden",
            !activeServer ? "bg-fit-primary text-white rounded-[16px]" : "bg-fit-surface text-fit-primary hover:bg-fit-primary hover:text-white hover:rounded-[16px]"
          )}
          title="Accueil"
        >
          <img 
            src="https://m.media-amazon.com/images/M/MV5BNDg4NjM1YjYtMzcyZC00NjZlLTk0Y2QtNzI3MGEzZDUyZDExXkEyXkFqcGdeQXVyNjU0OTQ0OTY@._V1_.jpg" 
            alt="FitCord" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          {!activeServer && (
            <div className="absolute -left-2 w-1 h-8 bg-fit-primary rounded-r-full" />
          )}
        </div>
        
        <div className="w-8 h-[2px] bg-fit-border rounded-full mx-auto" />

        <div className="flex-1 w-full overflow-y-auto flex flex-col items-center gap-2 px-2 discord-scrollbar">
              {servers.map(srv => (
                <div 
                  key={srv.id}
                  onClick={() => {
                    onSwitchServer(srv.id);
                    setShowFriendsView(false);
                  }}
                  className={cn(
                    "w-12 h-12 rounded-[24px] flex items-center justify-center transition-all cursor-pointer group relative overflow-hidden",
                    activeServer === srv.id ? "bg-fit-primary text-white rounded-[16px]" : "bg-fit-surface text-fit-muted hover:bg-fit-primary hover:text-white hover:rounded-[16px]"
                  )}
                  title={srv.name}
                >
                  {srv.icon ? (
                    <img src={srv.icon} alt={srv.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="font-black text-xs">
                      {srv.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  {activeServer === srv.id && (
                    <div className="absolute -left-2 w-1 h-8 bg-fit-primary rounded-r-full" />
                  )}
              
              {isOwner && srv.id !== 'fitcord-global' && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteServer(srv.id);
                  }}
                  className="absolute -right-1 -top-1 w-5 h-5 bg-fit-accent text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 z-50 shadow-lg"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
          
          {canCreateServer && (
            <button 
              onClick={() => setShowCreateServerModal(true)}
              className="w-12 h-12 rounded-[24px] bg-fit-surface text-emerald-500 flex items-center justify-center hover:bg-emerald-500 hover:text-white hover:rounded-[16px] transition-all cursor-pointer"
              title="Créer un espace"
            >
              <Plus size={24} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Channel/DM Sidebar (Middle) */}
      <div className="w-64 bg-fit-sidebar border-r border-fit-border flex flex-col z-20">
        <div className="h-16 px-4 flex items-center border-b border-fit-border shadow-sm">
          <span className="font-black text-lg tracking-tighter text-fit-text truncate">
            {activeServer ? currentServer?.name : "Messages Directs"}
          </span>
          {activeServer && isOwner && !serverMembers.includes(username) && (
            <button 
              onClick={() => onJoinServer(activeServer)}
              className="ml-auto bg-fit-primary text-white text-[10px] px-3 py-1.5 rounded-xl font-black uppercase tracking-widest hover:bg-fit-primary-hover transition-all"
            >
              Rejoindre
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-6 discord-scrollbar">
          {!activeServer ? (
            <>
              <div>
                <div 
                  onClick={() => {
                    setShowFriendsView(true);
                    onSwitchPrivateChat(null);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-all font-bold text-sm mb-1",
                    showFriendsView && !activePrivateChat ? "bg-fit-primary text-white shadow-lg shadow-fit-primary/20" : "text-fit-muted hover:bg-fit-surface hover:text-fit-text"
                  )}
                >
                  <Users size={18} />
                  <span>Amis</span>
                  {friendRequests.length > 0 && (
                    <span className="ml-auto bg-fit-accent text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {friendRequests.length}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div className="px-3 mb-2 text-[9px] font-black text-fit-muted uppercase tracking-[0.2em]">Messages Directs</div>
                <div className="space-y-0.5">
                  {friends.map(f => (
                    <div 
                      key={f.username}
                      onClick={() => {
                        setShowFriendsView(false);
                        onSwitchPrivateChat(f.username);
                      }}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-2xl cursor-pointer transition-all font-bold text-sm",
                        activePrivateChat === f.username ? "bg-fit-primary/10 text-fit-primary" : "text-fit-muted hover:bg-fit-surface hover:text-fit-text"
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
                          <div className="w-8 h-8 bg-fit-surface rounded-xl flex items-center justify-center text-fit-muted font-bold text-[10px] border border-fit-border">
                            {f.username[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-fit-sidebar",
                          f.status === 'online' ? "bg-emerald-500" : f.status === 'away' ? "bg-amber-500" : "bg-fit-muted"
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
              <div className="px-3 mb-2 text-[9px] font-black text-fit-muted uppercase tracking-[0.2em]">Salons</div>
              <div className="space-y-0.5">
                {channels.map(ch => (
                  <div key={ch.id} className="group relative">
                    <div 
                      onClick={() => {
                        setShowFriendsView(false);
                        onSwitchChannel(ch.id);
                      }}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-2xl cursor-pointer transition-all font-bold text-sm",
                        activeChannel === ch.id || activeVoiceChannel === ch.id ? "bg-fit-primary/10 text-fit-primary" : "text-fit-muted hover:bg-fit-surface hover:text-fit-text"
                      )}
                    >
                      {ch.type === 'voice' ? <Volume2 size={18} /> : <Hash size={18} />}
                      <span className="truncate flex-1">{ch.name}</span>
                      {ch.locked && <Lock size={12} className="text-amber-500" />}
                    </div>
                    
                    {isOwner && ch.id !== 'general' && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChannel(ch.id);
                        }}
                        className="absolute right-2 top-2 p-1 text-fit-muted hover:text-fit-accent opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    
                    {ch.type === 'voice' && voiceStates[ch.id] && voiceStates[ch.id].length > 0 && (
                      <div className="ml-9 mt-1 mb-2 space-y-1">
                        {voiceStates[ch.id].map(vu => (
                          <div key={vu.sid} className="flex items-center gap-2 py-0.5">
                            <div className="w-4 h-4 bg-fit-surface rounded-md flex items-center justify-center text-fit-muted text-[7px] font-bold border border-fit-border">
                              {vu.username[0].toUpperCase()}
                            </div>
                            <span className="text-[10px] font-bold text-fit-muted">{vu.username}</span>
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
        <div className="p-2 bg-fit-sidebar border-t border-fit-border space-y-2">
          {activeVoiceChannel && (
            <div className="bg-fit-surface p-3 rounded-2xl border border-fit-primary/20 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-fit-primary">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[8px] font-black uppercase tracking-widest">Vocal</span>
                </div>
                <button onClick={onLeaveVoice} className="text-fit-accent hover:scale-110 transition-all">
                  <PhoneOff size={12} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-fit-text truncate">Connecté</span>
                <button onClick={toggleMute} className="ml-auto text-fit-muted hover:text-fit-primary transition-all">
                  {isMuted ? <MicOff size={12} className="text-fit-accent" /> : <Mic size={12} />}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 p-1.5 bg-fit-surface rounded-2xl border border-fit-border shadow-sm">
            <div 
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:bg-fit-bg p-1 rounded-xl transition-all"
            >
              <div className="relative flex-shrink-0">
                {me?.avatar ? (
                  <img src={me.avatar} alt={me.username} className="w-8 h-8 rounded-xl object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 bg-fit-primary rounded-xl flex items-center justify-center text-white text-[10px] font-bold">
                    {username[0].toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-fit-surface" />
              </div>
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="text-[11px] font-bold truncate">{me?.displayName || username}</span>
                <span className="text-[9px] text-fit-muted font-bold truncate">@{username}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-0.5">
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="p-1.5 text-fit-muted hover:text-fit-primary hover:bg-fit-primary/5 rounded-xl transition-all"
                title="Paramètres"
              >
                <Settings size={16} />
              </button>
              <button 
                onClick={onLogout}
                className="p-1.5 text-fit-muted hover:text-fit-accent hover:bg-fit-accent/5 rounded-xl transition-all"
                title="Déconnexion"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Content Area (Right) */}
      <div className="flex-1 flex flex-col min-w-0 bg-fit-bg relative">
          {showFriendsView ? (
            <div className="flex-1 flex flex-col">
              <div className="h-16 px-8 flex items-center justify-between bg-fit-surface/50 backdrop-blur-md border-b border-fit-border">
                <div className="flex items-center gap-3">
                  <Users size={20} className="text-fit-primary" />
                  <span className="font-black text-lg tracking-tight">Gestion des Amis</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Ajouter par pseudo..."
                      value={friendSearch}
                      onChange={(e) => setFriendSearch(e.target.value)}
                      className="bg-fit-surface border border-fit-border rounded-2xl px-5 py-2 text-xs text-fit-text outline-none focus:ring-4 focus:ring-fit-primary/5 focus:border-fit-primary transition-all w-64 font-bold"
                    />
                    <button 
                      onClick={() => {
                        if (friendSearch.trim()) {
                          onSendFriendRequest(friendSearch);
                          setFriendSearch('');
                          alert("Demande d'ami envoyée !");
                        }
                      }}
                      className="absolute right-2 top-1.5 p-1.5 text-fit-primary hover:bg-fit-primary/10 rounded-xl transition-all"
                    >
                      <UserPlus size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-12 discord-scrollbar">
                {friendRequests.length > 0 && (
                  <div>
                    <div className="text-[10px] font-black text-fit-muted uppercase tracking-[0.2em] mb-6">Demandes en attente ({friendRequests.length})</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {friendRequests.map(req => (
                        <div key={req.id} className="bg-fit-surface border border-fit-border p-6 rounded-[2rem] flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-fit-bg rounded-2xl flex items-center justify-center text-fit-muted font-black text-lg border border-fit-border">
                              {req.from_user[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-black text-fit-text">{req.from_user}</div>
                              <div className="text-[10px] font-bold text-fit-muted uppercase tracking-wider">Demande d'ami</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => onRespondFriendRequest(req.id, 'accepted')}
                              className="w-10 h-10 flex items-center justify-center bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-xl transition-all shadow-sm"
                            >
                              <Check size={20} />
                            </button>
                            <button 
                              onClick={() => onRespondFriendRequest(req.id, 'rejected')}
                              className="w-10 h-10 flex items-center justify-center bg-fit-accent/10 text-fit-accent hover:bg-fit-accent hover:text-white rounded-xl transition-all shadow-sm"
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
                  <div className="text-[10px] font-black text-fit-muted uppercase tracking-[0.2em] mb-6">Liste d'amis ({friends.length})</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {friends.map(f => (
                      <div 
                        key={f.username} 
                        className="bg-fit-surface border border-fit-border p-6 rounded-[2rem] flex items-center justify-between group hover:border-fit-primary/30 hover:shadow-lg hover:shadow-fit-primary/5 transition-all cursor-pointer shadow-sm"
                        onClick={() => {
                          setShowFriendsView(false);
                          onSwitchPrivateChat(f.username);
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-14 h-14 bg-fit-bg rounded-2xl flex items-center justify-center text-fit-muted font-black text-lg border border-fit-border">
                              {f.username[0].toUpperCase()}
                            </div>
                            <div className={cn(
                              "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-fit-surface",
                              f.status === 'online' ? "bg-emerald-500" : f.status === 'away' ? "bg-amber-500" : "bg-fit-muted"
                            )} />
                          </div>
                          <div>
                            <div className="text-sm font-black text-fit-text">{f.displayName || f.username}</div>
                            <div className="text-[10px] font-bold text-fit-muted uppercase tracking-widest">{f.status}</div>
                          </div>
                        </div>
                        <div className="w-10 h-10 flex items-center justify-center bg-fit-bg text-fit-muted group-hover:bg-fit-primary group-hover:text-white rounded-xl transition-all">
                          <MessageSquare size={20} />
                        </div>
                      </div>
                    ))}
                    {friends.length === 0 && (
                      <div className="col-span-full h-64 flex flex-col items-center justify-center text-fit-muted border-2 border-dashed border-fit-border rounded-[3rem] bg-fit-surface/30">
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
              <div className="h-16 px-8 flex items-center justify-between bg-fit-surface/50 backdrop-blur-md border-b border-fit-border">
                <div className="flex items-center gap-4">
                  {activePrivateChat ? (
                    <>
                      <div className="relative">
                        <div className="w-10 h-10 bg-fit-surface rounded-xl flex items-center justify-center text-fit-muted font-black text-sm border border-fit-border">
                          {activePrivateChat[0]?.toUpperCase()}
                        </div>
                        <div className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-fit-surface",
                          friends.find(f => f.username === activePrivateChat)?.status === 'online' ? "bg-emerald-500" : 
                          friends.find(f => f.username === activePrivateChat)?.status === 'away' ? "bg-amber-500" : "bg-fit-muted"
                        )} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-fit-text tracking-tight">
                          {friends.find(f => f.username === activePrivateChat)?.displayName || activePrivateChat}
                        </span>
                        <span className="text-[9px] font-bold text-fit-muted uppercase tracking-widest">Message Direct</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 bg-fit-primary/10 rounded-xl flex items-center justify-center text-fit-primary border border-fit-primary/20">
                        {currentChannel?.type === 'voice' ? <Volume2 size={20} /> : <Hash size={20} />}
                      </div>
                      <div className="flex flex-col leading-tight">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-fit-text tracking-tight">{currentChannel?.name}</span>
                          {canManageChannel && (
                            <button 
                              onClick={() => {
                                setNewDescription(currentChannel?.description || '');
                                setShowDescriptionModal(true);
                              }}
                              className="p-1 text-fit-muted hover:text-fit-primary transition-all"
                              title="Modifier la description"
                            >
                              <Settings size={12} />
                            </button>
                          )}
                        </div>
                        <span className="text-[10px] text-fit-muted font-bold truncate max-w-[300px]">
                          {currentChannel?.description || "Aucune description"}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {!activePrivateChat && canManageChannel && (
                    <>
                      <button 
                        onClick={() => {
                          setShowBackgroundModal(true);
                        }}
                        className="p-2.5 text-fit-primary hover:bg-fit-primary/5 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                        title="Changer le fond"
                      >
                        <ImageIcon size={18} />
                        <span className="hidden lg:inline">Fond</span>
                      </button>
                      {currentChannel?.locked ? (
                        <button 
                          onClick={() => onUnlockChannel(activeChannel)}
                          className="p-2.5 text-emerald-500 hover:bg-emerald-500/5 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                        >
                          <Unlock size={18} />
                          <span className="hidden lg:inline">Déverrouiller</span>
                        </button>
                      ) : (
                        <button 
                          onClick={() => setShowLockModal(true)}
                          className="p-2.5 text-amber-500 hover:bg-amber-500/5 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                        >
                          <Lock size={18} />
                          <span className="hidden lg:inline">Verrouiller</span>
                        </button>
                      )}
                      <button 
                        onClick={handleClear}
                        className="p-2.5 text-fit-muted hover:text-fit-accent hover:bg-fit-accent/5 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                      >
                        <Eraser size={18} />
                        <span className="hidden lg:inline">Vider</span>
                      </button>
                    </>
                  )}
                  {activeServer && (currentServer?.owner === username || isOwner) && (
                    <button 
                      onClick={() => setShowInviteModal(true)}
                      className="p-2.5 text-fit-primary hover:bg-fit-primary/5 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    >
                      <UserPlus size={18} />
                      <span className="hidden sm:inline">Inviter</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Messages Area */}
              <div 
                ref={scrollRef} 
                className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth discord-scrollbar relative"
                style={currentChannel?.background_url ? {
                  backgroundImage: `url(${currentChannel.background_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundAttachment: 'local'
                } : {}}
              >
                {/* Background Overlay to ensure readability */}
                {currentChannel?.background_url && (
                  <div className="absolute inset-0 bg-fit-bg/60 pointer-events-none z-0" />
                )}
                <div className="relative z-10 space-y-8">
                  {displayMessages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-fit-muted opacity-30">
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
                          className="w-10 h-10 bg-fit-surface border border-fit-border rounded-xl flex-shrink-0 flex items-center justify-center text-fit-muted font-black text-xs shadow-sm cursor-pointer overflow-hidden"
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
                              className="font-black text-fit-text text-[11px] cursor-pointer hover:underline"
                              onClick={() => {
                                const user = users.find(u => u.username === ((msg as any).user || (msg as any).from_user));
                                if (user) setViewingUser(user);
                              }}
                            >
                              {users.find(u => u.username === ((msg as any).user || (msg as any).from_user))?.displayName || ((msg as any).user || (msg as any).from_user)}
                            </span>
                            <span className="text-[9px] text-fit-muted font-bold">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className={cn(
                            "px-5 py-3.5 rounded-2xl text-sm leading-relaxed break-words shadow-sm border",
                            isMe ? "bg-fit-primary text-white border-fit-primary/20 rounded-tr-none" : "bg-fit-surface text-fit-text border-fit-border rounded-tl-none"
                          )}>
                            {msg.text}
                            {msg.file && (
                              <div className="mt-3 rounded-xl overflow-hidden border border-white/10">
                                {msg.file.startsWith('data:image') ? (
                                  <img src={msg.file} alt="Upload" className="max-h-64 w-full object-cover" />
                                ) : (
                                  <div className="p-3 bg-white/5 flex items-center gap-3">
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
                              "absolute top-0 p-2 text-fit-muted hover:text-fit-accent opacity-0 group-hover:opacity-100 transition-all",
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
              </div>

              {/* Input Area */}
              <div className="p-8 pt-0">
                <div className="bg-fit-surface rounded-[2rem] border border-fit-border p-2 shadow-xl shadow-fit-primary/5 focus-within:border-fit-primary/50 transition-all">
                  <form 
                    onSubmit={handleSendMessage}
                    className="flex items-center gap-2"
                  >
                    <label className="w-12 h-12 flex items-center justify-center text-fit-muted hover:text-fit-primary hover:bg-fit-primary/5 rounded-full transition-all cursor-pointer">
                      <Plus size={24} />
                      <input type="file" className="hidden" onChange={handleFileUpload} />
                    </label>
                    <input 
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      disabled={currentChannel?.locked && !isOwner && me?.role !== 'moderator'}
                      placeholder={
                        currentChannel?.locked && !isOwner && me?.role !== 'moderator' 
                          ? (currentChannel.lock_message || "Ce salon est verrouillé.") 
                          : (activePrivateChat ? `Message à @${activePrivateChat}` : `Message dans #${currentChannel?.name}`)
                      }
                      className="flex-1 bg-transparent border-none outline-none text-fit-text py-3 px-2 text-sm font-bold placeholder:text-fit-muted/50 disabled:opacity-50"
                    />
                    <div className="flex items-center gap-1">
                      <button type="button" className="w-12 h-12 flex items-center justify-center text-fit-muted hover:text-fit-primary hover:bg-fit-primary/5 rounded-full transition-all">
                        <Smile size={24} />
                      </button>
                      <button type="submit" disabled={!inputText.trim()} className="w-12 h-12 flex items-center justify-center bg-fit-primary text-white rounded-full hover:bg-fit-primary-hover hover:scale-105 active:scale-95 transition-all shadow-lg shadow-fit-primary/20 disabled:opacity-50 disabled:hover:scale-100">
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
        <div className="w-72 bg-fit-sidebar border-l border-fit-border hidden lg:flex flex-col z-10">
          <div className="h-16 px-6 flex items-center border-b border-fit-border">
            <span className="text-[10px] font-black text-fit-muted uppercase tracking-[0.2em]">Membres — {users.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6 discord-scrollbar">
            {/* Grouped by Roles */}
            {['owner', 'moderator', 'user'].map(role => {
              const roleUsers = users.filter(u => u.role === role);
              if (roleUsers.length === 0) return null;
              
              return (
                <div key={role} className="space-y-2">
                  <div className="px-2 flex items-center gap-2 text-[9px] font-black text-fit-muted uppercase tracking-[0.2em]">
                    {role === 'owner' && <Lock size={10} className="text-fit-accent" />}
                    {role === 'owner' ? 'Owners' : role === 'moderator' ? 'Modérateurs' : 'Membres'} — {roleUsers.length}
                  </div>
                  <div className="space-y-1">
                    {roleUsers.map(u => (
                      <div 
                        key={u.id} 
                        onClick={() => setViewingUser(u)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-fit-surface transition-all group cursor-pointer relative overflow-hidden border border-transparent hover:border-fit-border/50",
                          u.role === 'owner' ? "bg-fit-accent/5 hover:bg-fit-accent/10" : ""
                        )}
                      >
                        <div className="relative flex-shrink-0">
                          <div className={cn(
                            "p-0.5 rounded-2xl",
                            u.role === 'owner' ? "bg-gradient-to-tr from-fit-accent to-amber-400" : "bg-fit-border"
                          )}>
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.username} className="w-10 h-10 rounded-[14px] object-cover bg-fit-surface" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-10 h-10 bg-fit-surface rounded-[14px] flex items-center justify-center text-fit-muted font-black text-xs">
                                {u.username[0].toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className={cn(
                            "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-fit-sidebar",
                            u.status === 'online' ? "bg-emerald-500" : u.status === 'away' ? "bg-amber-500" : "bg-fit-muted"
                          )} />
                          {u.role === 'owner' && (
                            <div className="absolute -top-1 -left-1 bg-fit-accent text-white p-0.5 rounded-full shadow-lg">
                              <Lock size={8} />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "text-xs font-black truncate",
                              u.role === 'owner' ? "text-fit-accent" : u.role === 'moderator' ? "text-fit-primary" : "text-fit-text"
                            )}>
                              {u.displayName || u.username}
                            </span>
                            {u.role === 'owner' && (
                              <div className="bg-fit-accent/20 text-fit-accent text-[7px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest flex items-center gap-1">
                                <Lock size={6} /> OWNER
                              </div>
                            )}
                          </div>
                          <span className="text-[9px] font-bold text-fit-muted truncate opacity-70">
                            {u.bio || (u.role === 'owner' ? 'Légende & Fondateur' : u.role === 'moderator' ? 'Gardien du Temple' : 'Membre Actif')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Moderation Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-fit-surface p-8 rounded-[3rem] border border-fit-border shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-fit-primary" />
              
              <div className="flex flex-col items-center text-center mb-8 pt-4">
                <div className="w-20 h-20 bg-fit-bg rounded-[2rem] flex items-center justify-center text-fit-muted font-black text-3xl border-2 border-fit-border mb-4 shadow-sm">
                  {selectedUser.username[0].toUpperCase()}
                </div>
                <h3 className="text-2xl font-black text-fit-text tracking-tight">{selectedUser.username}</h3>
                <div className="px-3 py-1 bg-fit-bg rounded-full text-[9px] font-black text-fit-muted uppercase tracking-widest mt-2 border border-fit-border">
                  Options de Modération
                </div>
              </div>

              <div className="space-y-3">
                {isOwner && (
                  <>
                    {selectedUser.role !== 'moderator' ? (
                      <button 
                        onClick={() => handleSetRole(selectedUser.username, 'moderator')}
                        className="w-full flex items-center justify-between p-4 bg-fit-primary/10 hover:bg-fit-primary text-fit-primary hover:text-white rounded-2xl transition-all font-black text-xs uppercase tracking-widest group"
                      >
                        <span>Promouvoir Modérateur</span>
                        <ShieldAlert size={18} className="group-hover:scale-110 transition-transform" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleSetRole(selectedUser.username, 'user')}
                        className="w-full flex items-center justify-between p-4 bg-fit-bg hover:bg-fit-sidebar text-fit-muted rounded-2xl transition-all font-black text-xs uppercase tracking-widest group border border-fit-border"
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
                  className="w-full flex items-center justify-between p-4 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white rounded-2xl transition-all font-black text-xs uppercase tracking-widest group"
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
                    className="w-full flex items-center justify-between p-4 bg-fit-accent/10 hover:bg-fit-accent text-fit-accent hover:text-white rounded-2xl transition-all font-black text-xs uppercase tracking-widest group"
                  >
                    <span>Bannir (Ban IP)</span>
                    <Ban size={18} className="group-hover:scale-110 transition-transform" />
                  </button>
                )}
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="w-full p-4 text-fit-muted hover:text-fit-text font-black text-xs uppercase tracking-widest transition-all mt-4"
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="w-full max-w-md bg-fit-surface p-10 rounded-[3rem] border border-fit-border shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-fit-primary" />
              
              <div className="mb-10">
                <h2 className="text-3xl font-black text-fit-text tracking-tighter mb-2">Paramètres</h2>
                <p className="text-fit-muted text-sm font-bold uppercase tracking-widest opacity-60">Audio & Expérience</p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-6 bg-fit-bg rounded-[2rem] border border-fit-border group hover:border-fit-primary/30 transition-all">
                  <div>
                    <div className="text-sm font-black text-fit-text mb-1">Annulation d'écho</div>
                    <div className="text-[9px] text-fit-muted font-black uppercase tracking-[0.2em] opacity-50">Echo Cancellation</div>
                  </div>
                  <button 
                    onClick={() => setEchoCancellation(!echoCancellation)}
                    className={cn(
                      "w-14 h-8 rounded-full transition-all relative p-1",
                      echoCancellation ? "bg-fit-primary" : "bg-fit-sidebar"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 bg-white rounded-full transition-all shadow-md",
                      echoCancellation ? "translate-x-6" : "translate-x-0"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-6 bg-fit-bg rounded-[2rem] border border-fit-border group hover:border-fit-primary/30 transition-all">
                  <div>
                    <div className="text-sm font-black text-fit-text mb-1">Suppression du bruit</div>
                    <div className="text-[9px] text-fit-muted font-black uppercase tracking-[0.2em] opacity-50">Noise Suppression</div>
                  </div>
                  <button 
                    onClick={() => setNoiseSuppression(!noiseSuppression)}
                    className={cn(
                      "w-14 h-8 rounded-full transition-all relative p-1",
                      noiseSuppression ? "bg-fit-primary" : "bg-fit-sidebar"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 bg-white rounded-full transition-all shadow-md",
                      noiseSuppression ? "translate-x-6" : "translate-x-0"
                    )} />
                  </button>
                </div>

                <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-[2rem] flex gap-4">
                  <ShieldAlert size={24} className="text-amber-500 flex-shrink-0" />
                  <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest leading-relaxed">
                    Les changements prendront effet lors de votre prochaine connexion vocale.
                  </p>
                </div>

                <button 
                  onClick={() => setShowSettingsModal(false)}
                  className="w-full py-5 px-4 bg-fit-primary text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-fit-primary-hover transition-all mt-6 shadow-lg shadow-fit-primary/20"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-fit-surface w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden border border-fit-border"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black tracking-tight">Mon Profil</h2>
                  <button onClick={() => setShowProfileModal(false)} className="p-2 hover:bg-fit-bg rounded-full transition-all">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-fit-muted uppercase tracking-widest mb-2">Avatar (URL)</label>
                    <input 
                      type="text"
                      value={profileForm.avatar}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, avatar: e.target.value }))}
                      className="w-full bg-fit-bg border border-fit-border rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-fit-primary/5 focus:border-fit-primary transition-all"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-fit-muted uppercase tracking-widest mb-2">Nom d'affichage</label>
                    <input 
                      type="text"
                      value={profileForm.displayName}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}
                      className="w-full bg-fit-bg border border-fit-border rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-fit-primary/5 focus:border-fit-primary transition-all"
                      placeholder="Votre nom"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-fit-muted uppercase tracking-widest mb-2">Bio</label>
                    <textarea 
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                      className="w-full bg-fit-bg border border-fit-border rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-fit-primary/5 focus:border-fit-primary transition-all h-24 resize-none"
                      placeholder="Parlez-nous de vous..."
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-fit-primary text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-fit-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-fit-surface w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden border border-fit-border"
            >
              <div className="h-24 bg-fit-primary" />
              <div className="px-8 pb-8 -mt-12">
                <div className="flex justify-between items-end mb-4">
                  <div className="relative">
                    {viewingUser.avatar ? (
                      <img src={viewingUser.avatar} alt={viewingUser.username} className="w-24 h-24 rounded-[2rem] border-4 border-fit-surface object-cover shadow-lg" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-24 h-24 bg-fit-bg rounded-[2rem] border-4 border-fit-surface flex items-center justify-center text-fit-muted font-black text-3xl shadow-lg">
                        {viewingUser.username[0].toUpperCase()}
                      </div>
                    )}
                    <div className={cn(
                      "absolute bottom-1 right-1 w-6 h-6 rounded-full border-4 border-fit-surface",
                      viewingUser.status === 'online' ? "bg-emerald-500" : viewingUser.status === 'away' ? "bg-amber-500" : "bg-fit-muted"
                    )} />
                  </div>
                  <button onClick={() => setViewingUser(null)} className="p-2 hover:bg-fit-bg rounded-full transition-all mb-4">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-black tracking-tight">{viewingUser.displayName || viewingUser.username}</h3>
                    <p className="text-xs font-bold text-fit-muted">@{viewingUser.username}</p>
                  </div>

                  {viewingUser.bio && (
                    <div className="bg-fit-bg p-4 rounded-2xl border border-fit-border">
                      <p className="text-xs leading-relaxed text-fit-text font-medium">{viewingUser.bio}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {viewingUser.username !== username && (
                      <button 
                        onClick={() => {
                          onSwitchPrivateChat(viewingUser.username);
                          setViewingUser(null);
                        }}
                        className="flex-1 bg-fit-primary text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-fit-primary-hover transition-all"
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
                        className="flex-1 bg-fit-bg text-fit-text py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-fit-sidebar transition-all border border-fit-border"
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
                      className="w-full mt-2 bg-fit-accent/10 text-fit-accent py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-fit-accent hover:text-white transition-all"
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="w-full max-w-md bg-fit-surface p-10 rounded-[3rem] border border-fit-border shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-fit-primary" />
              
              <div className="mb-10">
                <h2 className="text-3xl font-black text-fit-text tracking-tighter mb-2">Nouvel Espace</h2>
                <p className="text-fit-muted text-sm font-bold uppercase tracking-widest opacity-60">Créez votre propre communauté</p>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-fit-muted uppercase tracking-[0.2em] ml-1">Nom de votre espace</label>
                  <input 
                    type="text"
                    value={newServerName}
                    onChange={(e) => setNewServerName(e.target.value)}
                    placeholder="Ex: La Famille, Les Amis..."
                    className="w-full bg-fit-bg border border-fit-border rounded-[1.5rem] px-6 py-5 text-fit-text font-bold outline-none focus:ring-4 focus:ring-fit-primary/5 focus:border-fit-primary transition-all"
                    autoFocus
                  />
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setShowCreateServerModal(false)}
                    className="flex-1 py-5 px-4 bg-fit-bg text-fit-muted rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-fit-sidebar transition-all border border-fit-border"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={handleCreateServer}
                    disabled={!newServerName.trim()}
                    className="flex-1 py-5 px-4 bg-fit-primary text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-fit-primary-hover hover:-translate-y-1 active:translate-y-0 shadow-xl shadow-fit-primary/20 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="w-full max-w-md bg-fit-surface p-10 rounded-[3rem] border border-fit-border shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-fit-primary" />
              
              <div className="mb-10">
                <h2 className="text-3xl font-black text-fit-text tracking-tighter mb-2">Invitation</h2>
                <p className="text-fit-muted text-sm font-bold uppercase tracking-widest opacity-60">Invitez un ami sur {currentServer?.name}</p>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-fit-muted uppercase tracking-[0.2em] ml-1">Pseudo de l'invité</label>
                  <input 
                    type="text"
                    value={inviteTarget}
                    onChange={(e) => setInviteTarget(e.target.value)}
                    placeholder="Ex: JeanDupont"
                    className="w-full bg-fit-bg border border-fit-border rounded-[1.5rem] px-6 py-5 text-fit-text font-bold outline-none focus:ring-4 focus:ring-fit-primary/5 focus:border-fit-primary transition-all"
                    autoFocus
                  />
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 py-5 px-4 bg-fit-bg text-fit-muted rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-fit-sidebar transition-all border border-fit-border"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={handleInvite}
                    disabled={!inviteTarget.trim()}
                    className="flex-1 py-5 px-4 bg-fit-primary text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-fit-primary-hover hover:-translate-y-1 active:translate-y-0 shadow-xl shadow-fit-primary/20 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    Envoyer
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Background Modal */}
      <AnimatePresence>
        {showBackgroundModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBackgroundModal(false)}
              className="absolute inset-0 bg-fit-bg/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-fit-surface border border-fit-border rounded-[3rem] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-fit-primary/10 rounded-2xl flex items-center justify-center text-fit-primary">
                    <ImageIcon size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-fit-text tracking-tight">Fond du salon</h2>
                    <p className="text-xs font-bold text-fit-muted uppercase tracking-widest">#{currentChannel?.name}</p>
                  </div>
                </div>
                <button onClick={() => setShowBackgroundModal(false)} className="p-2 text-fit-muted hover:text-fit-text transition-all">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-fit-muted uppercase tracking-[0.2em] mb-3">Importer une image</label>
                  <div 
                    onClick={() => document.getElementById('bg-upload')?.click()}
                    className="w-full aspect-video bg-fit-bg border-2 border-dashed border-fit-border rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-fit-primary/50 hover:bg-fit-primary/5 transition-all group"
                  >
                    <div className="w-12 h-12 bg-fit-surface rounded-2xl flex items-center justify-center text-fit-muted group-hover:text-fit-primary transition-all">
                      <Plus size={24} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-fit-muted">Cliquez pour choisir un fichier</span>
                    <input 
                      id="bg-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleBackgroundFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-fit-border"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                    <span className="bg-fit-surface px-4 text-fit-muted">Ou via URL</span>
                  </div>
                </div>

                <div>
                  <input 
                    type="text"
                    value={newBackgroundUrl}
                    onChange={(e) => setNewBackgroundUrl(e.target.value)}
                    className="w-full bg-fit-bg border border-fit-border rounded-2xl px-6 py-4 text-sm font-bold text-fit-text focus:border-fit-primary outline-none transition-all"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setShowBackgroundModal(false)}
                    className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-fit-muted hover:bg-fit-surface transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={handleUpdateBackground}
                    className="flex-1 py-4 bg-fit-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-fit-primary-hover transition-all shadow-lg shadow-fit-primary/20"
                  >
                    Appliquer URL
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Description Modal */}
      <AnimatePresence>
        {showDescriptionModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDescriptionModal(false)}
              className="absolute inset-0 bg-fit-bg/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-fit-surface border border-fit-border rounded-[3rem] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-fit-primary/10 rounded-2xl flex items-center justify-center text-fit-primary">
                    <Settings size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-fit-text tracking-tight">Description du salon</h2>
                    <p className="text-xs font-bold text-fit-muted uppercase tracking-widest">#{currentChannel?.name}</p>
                  </div>
                </div>
                <button onClick={() => setShowDescriptionModal(false)} className="p-2 text-fit-muted hover:text-fit-text transition-all">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-fit-muted uppercase tracking-[0.2em] mb-3">Nouvelle description</label>
                  <textarea 
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full bg-fit-bg border border-fit-border rounded-2xl px-6 py-4 text-sm font-bold text-fit-text focus:border-fit-primary outline-none transition-all min-h-[120px] resize-none"
                    placeholder="Décrivez ce salon..."
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setShowDescriptionModal(false)}
                    className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-fit-muted hover:bg-fit-surface transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={handleUpdateDescription}
                    className="flex-1 py-4 bg-fit-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-fit-primary-hover transition-all shadow-lg shadow-fit-primary/20"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Lock Channel Modal */}
      <AnimatePresence>
        {showLockModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLockModal(false)}
              className="absolute inset-0 bg-fit-bg/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-fit-surface border border-fit-border rounded-[3rem] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                    <Lock size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-fit-text tracking-tight">Verrouiller le salon</h2>
                    <p className="text-xs font-bold text-fit-muted uppercase tracking-widest">#{currentChannel?.name}</p>
                  </div>
                </div>
                <button onClick={() => setShowLockModal(false)} className="p-2 text-fit-muted hover:text-fit-text transition-all">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-fit-muted uppercase tracking-[0.2em] mb-3">Message de verrouillage</label>
                  <textarea 
                    value={lockMessage}
                    onChange={(e) => setLockMessage(e.target.value)}
                    className="w-full bg-fit-bg border border-fit-border rounded-2xl p-4 text-sm font-bold text-fit-text focus:border-fit-primary outline-none transition-all min-h-[100px] resize-none"
                    placeholder="Ex: Seul les modérateurs peuvent écrire ici..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setShowLockModal(false)}
                    className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-fit-muted hover:bg-fit-surface transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={handleLock}
                    className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
                  >
                    Verrouiller
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
