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
  Server as ServerIcon
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
      startVoiceChat();
    } else {
      stopVoiceChat();
    }
    return () => stopVoiceChat();
  }, [activeVoiceChannel]);

  useEffect(() => {
    if (activeVoiceChannel && myPeerId) {
      voiceUsers.forEach(vu => {
        if (!signaledUsersRef.current.has(vu.sid) && vu.username !== username) {
          onSendVoiceSignal(vu.sid, { type: 'peer-id', peerId: myPeerId });
          signaledUsersRef.current.add(vu.sid);
        }
      });
    }
  }, [voiceUsers, activeVoiceChannel, myPeerId]);

  useEffect(() => {
    const handleVoiceSignal = (e: any) => {
      const { from, signal, username: fromUser } = e.detail;
      if (peerRef.current && signal.type === 'peer-id') {
        // Someone sent us their peer ID, call them if we are already in
        if (activeVoiceChannel && !callsRef.current[from]) {
          const call = peerRef.current.call(signal.peerId, myStreamRef.current!);
          callsRef.current[from] = call;
          call.on('stream', (remoteStream) => {
            addRemoteStream(from, remoteStream);
          });
        }
      }
    };

    window.addEventListener('vox_voice_signal' as any, handleVoiceSignal);
    return () => window.removeEventListener('vox_voice_signal' as any, handleVoiceSignal);
  }, [activeVoiceChannel]);

  const startVoiceChat = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      myStreamRef.current = stream;
      
      const peer = new Peer();
      peerRef.current = peer;

      peer.on('open', (id) => {
        console.log('[Voice] My peer ID is: ' + id);
        setMyPeerId(id);
      });

      peer.on('call', (call) => {
        call.answer(stream);
        call.on('stream', (remoteStream) => {
          // Find which user this is
          const vu = voiceUsers.find(u => u.username === (call as any).peer); // This is a bit hacky with PeerJS auto IDs
          addRemoteStream(call.peer, remoteStream);
        });
      });

    } catch (err) {
      console.error("Failed to start voice chat", err);
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
    onLeaveVoice();
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

  const currentServer = servers.find(s => s.id === activeServer);
  const currentChannel = channels.find(c => c.id === activeChannel);

  const userOwnsServer = servers.some(s => s.owner === username);

  return (
    <div className="flex h-screen bg-[#0a0a0c] text-gray-300 overflow-hidden font-sans w-full">
      {/* Server Rail (Discord-style) */}
      <div className="w-[72px] bg-[#0a0a0c] flex flex-col items-center py-3 gap-2 border-r border-white/5">
        <div 
          onClick={() => {
            setShowFriendsView(true);
            onSwitchPrivateChat(null);
            onSwitchServer(null);
          }}
          className={cn(
            "w-12 h-12 rounded-[24px] flex items-center justify-center transition-all cursor-pointer group",
            showFriendsView || (!activeServer && !activePrivateChat) ? "bg-[#00f2ff] text-[#0a0a0c] rounded-[16px]" : "bg-[#111114] text-white hover:bg-[#00f2ff] hover:text-[#0a0a0c] hover:rounded-[16px]"
          )}
          title="Amis & Messages Privés"
        >
          <Users size={24} />
        </div>
        
        <div className="w-8 h-[2px] bg-white/5 rounded-full my-1" />

        {servers.map(srv => (
          <div 
            key={srv.id}
            onClick={() => {
              setShowFriendsView(false);
              onSwitchServer(srv.id);
            }}
            className={cn(
              "w-12 h-12 rounded-[24px] flex items-center justify-center transition-all cursor-pointer group relative",
              activeServer === srv.id ? "bg-[#00f2ff] text-[#0a0a0c] rounded-[16px]" : "bg-[#111114] text-white hover:bg-[#00f2ff] hover:text-[#0a0a0c] hover:rounded-[16px]"
            )}
            title={srv.name}
          >
            {activeServer === srv.id && (
              <div className="absolute -left-3 w-2 h-10 bg-white rounded-r-full" />
            )}
            <span className="font-bold text-sm">
              {srv.name.substring(0, 2).toUpperCase()}
            </span>
          </div>
        ))}

        {!userOwnsServer && (
          <div 
            onClick={() => setShowCreateServerModal(true)}
            className="w-12 h-12 rounded-[24px] bg-[#111114] text-green-500 flex items-center justify-center transition-all cursor-pointer hover:bg-green-500 hover:text-white hover:rounded-[16px]"
            title="Créer un serveur"
          >
            <Plus size={24} />
          </div>
        )}
      </div>

      {/* Sidebar Channels / Friends */}
      <div className="w-60 bg-[#111114] flex flex-col">
        <div className="h-12 px-4 flex items-center border-b border-white/5 font-black text-white tracking-tight shadow-sm">
          {activeServer ? currentServer?.name : "VOXCORD"}
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
                  "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all font-bold",
                  showFriendsView && !activePrivateChat ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"
                )}
              >
                <Users size={18} />
                <span>Amis</span>
                {friendRequests.length > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">
                    {friendRequests.length}
                  </span>
                )}
              </div>

              <div className="px-3 mt-4 mb-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">Messages Privés</div>
              {friends.map(f => (
                <div 
                  key={f.username}
                  onClick={() => {
                    setShowFriendsView(false);
                    onSwitchPrivateChat(f.username);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all font-bold",
                    activePrivateChat === f.username ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"
                  )}
                >
                  <div className="relative">
                    <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                      {f.username[0]?.toUpperCase()}
                    </div>
                    <div className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#111114]",
                      f.status === 'online' ? "bg-green-500" : f.status === 'away' ? "bg-yellow-500" : "bg-gray-500"
                    )} />
                  </div>
                  <span className="truncate">{f.username}</span>
                </div>
              ))}
            </>
          ) : activeServer ? (
            <>
              <div className="flex items-center justify-between px-3 mt-2 mb-2">
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Salons Textuels</div>
              </div>
              {channels.map(ch => (
                <div 
                  key={ch.id}
                  onClick={() => {
                    setShowFriendsView(false);
                    onSwitchChannel(ch.id);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all font-bold",
                    activeChannel === ch.id || activeVoiceChannel === ch.id ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"
                  )}
                >
                  {ch.type === 'voice' ? <Volume2 size={18} className="text-gray-500" /> : <Hash size={18} className="text-gray-500" />}
                  <span>{ch.name}</span>
                </div>
              ))}

              {activeVoiceChannel && (
                <div className="mt-4 px-3 py-3 bg-[#0a0a0c] rounded-xl border border-[#00f2ff]/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-[#00f2ff]">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Vocal Connecté</span>
                    </div>
                    <button onClick={onLeaveVoice} className="text-red-500 hover:text-red-400">
                      <PhoneOff size={16} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-[#00f2ff] rounded flex items-center justify-center text-[#0a0a0c] text-[10px] font-bold">
                        {username[0].toUpperCase()}
                      </div>
                      <span className="text-xs font-bold text-white">{username}</span>
                      <Mic size={12} className="ml-auto text-gray-500" />
                    </div>
                    {voiceUsers.filter(vu => vu.username !== username).map(vu => (
                      <div key={vu.sid} className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center text-white text-[10px] font-bold">
                          {vu.username[0].toUpperCase()}
                        </div>
                        <span className="text-xs font-bold">{vu.username}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentServer?.owner === username && (
                <button 
                  onClick={() => setShowInviteModal(true)}
                  className="mt-4 mx-3 flex items-center justify-center gap-2 py-2 px-4 bg-[#00f2ff]/10 text-[#00f2ff] rounded-lg font-bold text-xs hover:bg-[#00f2ff]/20 transition-all"
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
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all font-bold hover:bg-white/5 hover:text-white"
              >
                <ArrowLeft size={18} />
                <span>Retour aux Amis</span>
              </div>
          ) : null}
        </div>
        <div className="p-4 bg-[#0a0a0c]/50 border-t border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#00f2ff] rounded-xl flex items-center justify-center text-[#0a0a0c] font-black">
            {username[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate">{username}</div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              <select 
                onChange={(e) => onUpdateStatus(e.target.value as any)}
                className="text-[10px] text-gray-500 font-black uppercase bg-transparent border-none outline-none cursor-pointer hover:text-white transition-all"
              >
                <option value="online" className="bg-[#111114]">En ligne</option>
                <option value="away" className="bg-[#111114]">Absent</option>
              </select>
            </div>
          </div>
          <button onClick={onLogout} className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-red-500 transition-all">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {showFriendsView ? (
          <div className="flex-1 flex flex-col bg-[#0a0a0c]">
            <div className="h-16 px-6 flex items-center border-b border-white/5 justify-between bg-[#0a0a0c]/50 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <Users size={20} className="text-gray-500" />
                <span className="font-bold text-white">Amis</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Ajouter un ami (pseudo)"
                    value={friendSearch}
                    onChange={(e) => setFriendSearch(e.target.value)}
                    className="bg-[#16161a] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#00f2ff]/30 transition-all w-48"
                  />
                  <button 
                    onClick={() => {
                      if (friendSearch.trim()) {
                        onSendFriendRequest(friendSearch);
                        setFriendSearch('');
                        alert("Demande d'ami envoyée !");
                      }
                    }}
                    className="absolute right-1 top-1 p-1 text-[#00f2ff] hover:bg-[#00f2ff]/10 rounded"
                  >
                    <UserPlus size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {friendRequests.length > 0 && (
                <div>
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Demandes en attente — {friendRequests.length}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {friendRequests.map(req => (
                      <div key={req.id} className="bg-[#111114] border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white font-black">
                            {req.from_user[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">{req.from_user}</div>
                            <div className="text-[10px] text-gray-500">Demande d'ami entrante</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => onRespondFriendRequest(req.id, 'accepted')}
                            className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-lg transition-all"
                          >
                            <Check size={18} />
                          </button>
                          <button 
                            onClick={() => onRespondFriendRequest(req.id, 'rejected')}
                            className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-all"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Tous les amis — {friends.length}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {friends.map(f => (
                    <div 
                      key={f.username} 
                      className="bg-[#111114] border border-white/5 p-4 rounded-2xl flex items-center justify-between group hover:border-[#00f2ff]/20 transition-all cursor-pointer"
                      onClick={() => {
                        setShowFriendsView(false);
                        onSwitchPrivateChat(f.username);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white font-black">
                            {f.username[0].toUpperCase()}
                          </div>
                          <div className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#111114]",
                            f.status === 'online' ? "bg-green-500" : f.status === 'away' ? "bg-yellow-500" : "bg-gray-500"
                          )} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{f.username}</div>
                          <div className="text-[10px] text-gray-500 capitalize">{f.status}</div>
                        </div>
                      </div>
                      <div className="p-2 text-gray-500 group-hover:text-[#00f2ff] transition-all">
                        <MessageSquare size={18} />
                      </div>
                    </div>
                  ))}
                  {friends.length === 0 && (
                    <div className="col-span-full h-32 flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-white/5 rounded-3xl">
                      <Users size={32} className="mb-2 opacity-20" />
                      <p className="text-sm font-bold">Vous n'avez pas encore d'amis.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="h-16 px-6 flex items-center border-b border-white/5 justify-between bg-[#0a0a0c]/50 backdrop-blur-md">
              <div className="flex items-center gap-3">
                {activePrivateChat ? (
                  <>
                    <div className="relative">
                      <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                        {activePrivateChat[0]?.toUpperCase()}
                      </div>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#111114]",
                        friends.find(f => f.username === activePrivateChat)?.status === 'online' ? "bg-green-500" : 
                        friends.find(f => f.username === activePrivateChat)?.status === 'away' ? "bg-yellow-500" : "bg-gray-500"
                      )} />
                    </div>
                    <span className="font-bold text-white">{activePrivateChat}</span>
                  </>
                ) : (
                  <>
                    <Hash size={20} className="text-gray-500" />
                    <span className="font-bold text-white">{currentChannel?.name}</span>
                  </>
                )}
              </div>
              {!activePrivateChat && isOwner && (
                <button 
                  onClick={handleClear}
                  className="p-2 text-gray-500 hover:text-red-500 transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest"
                >
                  <Eraser size={16} />
                  <span className="hidden sm:inline">Nettoyer</span>
                </button>
              )}
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
              {displayMessages.map((msg) => (
                <div key={msg.id} className="flex gap-4 group relative">
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-black">
                    {(msg as any).user ? (msg as any).user[0]?.toUpperCase() : (msg as any).from_user[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-black text-white text-sm">{(msg as any).user || (msg as any).from_user}</span>
                      <span className="text-[10px] text-gray-500 font-bold">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-gray-300 text-sm leading-relaxed break-words">{msg.text}</div>
                    {msg.file && (
                      <div className="mt-2 max-w-sm rounded-xl overflow-hidden border border-white/5">
                        {msg.file.startsWith('data:image') ? (
                          <img src={msg.file} alt="Upload" className="max-h-64 object-contain" />
                        ) : (
                          <div className="p-3 bg-white/5 flex items-center gap-2">
                            <ImageIcon size={20} className="text-[#00f2ff]" />
                            <a href={msg.file} download="file" className="text-xs text-[#00f2ff] hover:underline">Télécharger le fichier</a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {!activePrivateChat && isMod && (
                    <button 
                      onClick={() => onDeleteMessage(msg.id)}
                      className="absolute right-0 top-0 p-2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="p-6">
              <form 
                onSubmit={handleSendMessage}
                className="bg-[#16161a] rounded-2xl flex items-center px-4 py-2 gap-3 border border-white/5 focus-within:border-[#00f2ff]/30 transition-all"
              >
                <label className="p-2 text-gray-500 hover:text-[#00f2ff] transition-all cursor-pointer">
                  <Plus size={20} />
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
                <input 
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={activePrivateChat ? `Message à @${activePrivateChat}` : `Message dans #${currentChannel?.name}`}
                  className="flex-1 bg-transparent border-none outline-none text-white py-2 text-sm"
                />
                <div className="flex items-center gap-2 text-gray-500">
                  <Smile size={20} className="hover:text-white cursor-pointer" />
                  <button type="submit" className="p-2 text-[#00f2ff] hover:scale-110 transition-all">
                    <Send size={20} />
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>

      {/* Sidebar Users */}
      <div className="w-64 bg-[#111114] border-l border-white/5 hidden lg:flex flex-col">
        <div className="h-16 px-6 flex items-center border-b border-white/5 text-[10px] font-black text-gray-500 uppercase tracking-widest">
          Membres — {users.length}
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {users.map(u => (
            <div 
              key={u.id} 
              onClick={() => isMod && u.username !== username && setSelectedUser(u)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl transition-all group relative",
                isMod && u.username !== username ? "cursor-pointer hover:bg-white/5" : ""
              )}
            >
              <div className="relative">
                <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                  {u.username[0]?.toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#111114]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-gray-400 group-hover:text-white transition-all truncate">{u.username}</div>
                <div className="text-[8px] font-black uppercase text-gray-600 tracking-tighter">{u.role}</div>
              </div>
              {isMod && u.username !== username && (
                <ShieldAlert size={14} className="text-gray-600 group-hover:text-[#00f2ff] transition-all" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Moderation Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm bg-[#16161a] p-6 rounded-3xl border border-white/5 shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-[#00f2ff] rounded-2xl flex items-center justify-center text-[#0a0a0c] font-black text-xl">
                  {selectedUser.username[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">{selectedUser.username}</h3>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Action de modération</p>
                </div>
              </div>

              <div className="space-y-3">
                {isOwner && (
                  <>
                    {selectedUser.role !== 'moderator' ? (
                      <button 
                        onClick={() => handleSetRole(selectedUser.username, 'moderator')}
                        className="w-full flex items-center gap-3 p-4 bg-[#00f2ff]/5 hover:bg-[#00f2ff]/10 text-[#00f2ff] rounded-2xl transition-all font-bold text-sm"
                      >
                        <ShieldAlert size={20} />
                        Promouvoir Modérateur
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleSetRole(selectedUser.username, 'user')}
                        className="w-full flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 text-gray-400 rounded-2xl transition-all font-bold text-sm"
                      >
                        <UserX size={20} />
                        Rétrograder en Utilisateur
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
                  className="w-full flex items-center gap-3 p-4 bg-white/5 hover:bg-orange-500/10 hover:text-orange-500 rounded-2xl transition-all font-bold text-sm"
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
                    className="w-full flex items-center gap-3 p-4 bg-white/5 hover:bg-red-500/10 hover:text-red-500 rounded-2xl transition-all font-bold text-sm"
                  >
                    <Ban size={20} />
                    Bannir (Ban IP)
                  </button>
                )}
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="w-full p-4 text-gray-500 hover:text-white font-bold text-sm transition-all"
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Server Modal */}
      <AnimatePresence>
        {showCreateServerModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-md bg-[#16161a] p-8 rounded-3xl border border-white/5 shadow-2xl"
            >
              <h2 className="text-2xl font-black text-white mb-2">Créer votre serveur</h2>
              <p className="text-gray-500 text-sm mb-6">Donnez une personnalité à votre serveur avec un nom unique.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Nom du serveur</label>
                  <input 
                    type="text"
                    value={newServerName}
                    onChange={(e) => setNewServerName(e.target.value)}
                    placeholder="Mon super serveur"
                    className="w-full bg-[#0a0a0c] border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-[#00f2ff]/30 transition-all"
                    autoFocus
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setShowCreateServerModal(false)}
                    className="flex-1 py-3 px-4 bg-white/5 text-white rounded-xl font-bold hover:bg-white/10 transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={handleCreateServer}
                    disabled={!newServerName.trim()}
                    className="flex-1 py-3 px-4 bg-[#00f2ff] text-[#0a0a0c] rounded-xl font-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
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
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-md bg-[#16161a] p-8 rounded-3xl border border-white/5 shadow-2xl"
            >
              <h2 className="text-2xl font-black text-white mb-2">Inviter un ami</h2>
              <p className="text-gray-500 text-sm mb-6">Entrez le pseudo de la personne que vous souhaitez inviter sur {currentServer?.name}.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Pseudo de l'utilisateur</label>
                  <input 
                    type="text"
                    value={inviteTarget}
                    onChange={(e) => setInviteTarget(e.target.value)}
                    placeholder="Pseudo"
                    className="w-full bg-[#0a0a0c] border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-[#00f2ff]/30 transition-all"
                    autoFocus
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 py-3 px-4 bg-white/5 text-white rounded-xl font-bold hover:bg-white/10 transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={handleInvite}
                    disabled={!inviteTarget.trim()}
                    className="flex-1 py-3 px-4 bg-[#00f2ff] text-[#0a0a0c] rounded-xl font-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
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
