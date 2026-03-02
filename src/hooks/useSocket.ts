import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { User, Channel, Message, Friend, FriendRequest, PrivateMessage, Server } from '../types';

export function useSocket(username: string) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelMessages, setChannelMessages] = useState<Record<string, Message[]>>({});
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [privateMessages, setPrivateMessages] = useState<Record<string, PrivateMessage[]>>({});
  const [serverMembers, setServerMembers] = useState<string[]>([]);
  const [activeServer, setActiveServer] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState('general');
  const [activePrivateChat, setActivePrivateChat] = useState<string | null>(null);
  const [activeVoiceChannel, setActiveVoiceChannel] = useState<string | null>(null);
  const [voiceUsers, setVoiceUsers] = useState<{ sid: string, username: string }[]>([]);
  const [voiceStates, setVoiceStates] = useState<Record<string, { sid: string, username: string }[]>>({});
  const [appConfig, setAppConfig] = useState<Record<string, string>>({});
  const [loginError, setLoginError] = useState<string | null>(null);
  const [me, setMe] = useState<User | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const activeChannelRef = useRef(activeChannel);
  const activePrivateChatRef = useRef(activePrivateChat);

  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  useEffect(() => {
    activePrivateChatRef.current = activePrivateChat;
  }, [activePrivateChat]);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(config => setAppConfig(config))
      .catch(err => console.error("Error fetching initial config:", err));
  }, []);

  // Auto-connect if credentials exist
  useEffect(() => {
    const savedUser = localStorage.getItem('vox_username');
    const savedPass = localStorage.getItem('vox_password');
    if (savedUser && savedPass && !socketRef.current) {
      connect(savedUser, savedPass);
    }
  }, []);

  const connect = (u: string, p: string) => {
    const newSocket = io(window.location.origin);
    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join', { username: u, password: p });
    });

    newSocket.on('login_success', () => {
      setIsLoggedIn(true);
      localStorage.setItem('vox_username', u);
      localStorage.setItem('vox_password', p);
    });

    newSocket.on("me", (data) => {
      console.log("[Socket] Received 'me' update:", data);
      setMe(data);
    });

    newSocket.on('login_error', (msg) => {
      setLoginError(msg);
      newSocket.disconnect();
    });

    newSocket.on('error', (msg) => {
      window.dispatchEvent(new CustomEvent('vox_alert', { detail: msg }));
    });

    newSocket.on('user_list', (list) => setUsers(list));
    newSocket.on('server_list', (list) => setServers(list));
    newSocket.on('channel_list', (list) => {
      setChannels(list);
      // Auto-select first channel if none is active (e.g. after switching server)
      if (activeChannelRef.current === '' && list.length > 0) {
        const first = list[0];
        setActiveChannel(first.id);
        newSocket.emit('switch_channel', first.id);
      }
    });
    newSocket.on('friend_list', (list) => setFriends(list));
    newSocket.on('friend_requests', (list) => setFriendRequests(list));

    newSocket.on('server_members', ({ serverId, members }) => {
      setServerMembers(members);
    });

    newSocket.on('friend_status_update', ({ username, status }) => {
      setFriends(prev => prev.map(f => f.username === username ? { ...f, status } : f));
    });

    newSocket.on('user_profile_updated', ({ username, displayName, avatar, bio }) => {
      setFriends(prev => prev.map(f => f.username === username ? { ...f, displayName, avatar } : f));
      setUsers(prev => prev.map(u => u.username === username ? { ...u, displayName, avatar, bio } : u));
    });

    newSocket.on('new_friend_request', (request) => {
      setFriendRequests(prev => [...prev, request]);
    });

    newSocket.on('friend_added', (friend) => {
      setFriends(prev => [...prev, friend]);
      setFriendRequests(prev => prev.filter(r => r.from_user !== friend.username && r.to_user !== friend.username));
    });

    newSocket.on('init_messages', ({ channelId, messages: msgs }) => {
      setChannelMessages(prev => ({ ...prev, [channelId]: msgs }));
    });

    newSocket.on('new_message', (msg) => {
      setChannelMessages(prev => ({
        ...prev,
        [msg.channel_id]: [...(prev[msg.channel_id] || []).filter(m => m.id !== msg.id), msg]
      }));
    });

    newSocket.on('init_private_messages', ({ otherUser, messages: msgs }) => {
      setPrivateMessages(prev => ({ ...prev, [otherUser]: msgs }));
    });

    newSocket.on('new_private_message', (msg) => {
      const otherUser = msg.from_user === u ? msg.to_user : msg.from_user;
      setPrivateMessages(prev => ({
        ...prev,
        [otherUser]: [...(prev[otherUser] || []), msg]
      }));
    });

    newSocket.on('message_deleted', (messageId) => {
      setChannelMessages(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(cid => {
          next[cid] = next[cid].filter(m => m.id !== messageId);
        });
        return next;
      });
    });

    newSocket.on('messages_cleared', (channelId) => {
      setChannelMessages(prev => ({ ...prev, [channelId]: [] }));
    });

    newSocket.on('voice_users', (users) => {
      console.log("[Socket] Received voice_users (direct):", users);
      setVoiceUsers(users);
    });
    
    newSocket.on('voice_state_update', ({ channelId, users }) => {
      console.log(`[Socket] Voice state update for ${channelId}:`, users);
      setVoiceStates(prev => ({ ...prev, [channelId]: users }));
    });

    newSocket.on('app_config', (config) => {
      setAppConfig(config);
    });

    newSocket.on('voice_signal', (data) => {
      // This will be handled by ChatInterface via an event listener or a ref
      window.dispatchEvent(new CustomEvent('vox_voice_signal', { detail: data }));
    });

    newSocket.on('private_call_incoming', (data) => {
      window.dispatchEvent(new CustomEvent('vox_private_call_incoming', { detail: data }));
    });

    newSocket.on('private_call_accepted', (data) => {
      window.dispatchEvent(new CustomEvent('vox_private_call_accepted', { detail: data }));
    });

    newSocket.on('private_call_rejected', (data) => {
      window.dispatchEvent(new CustomEvent('vox_private_call_rejected', { detail: data }));
    });

    newSocket.on('private_call_ended', (data) => {
      window.dispatchEvent(new CustomEvent('vox_private_call_ended', { detail: data }));
    });

    newSocket.on('private_call_signal', (data) => {
      window.dispatchEvent(new CustomEvent('vox_private_call_signal', { detail: data }));
    });

    newSocket.on('channel_updated', (updatedChannel) => {
      setChannels(prev => prev.map(c => c.id === updatedChannel.id ? updatedChannel : c));
    });

    newSocket.on('server_deleted', (serverId) => {
      setServers(prev => prev.filter(s => s.id !== serverId));
      if (activeServer === serverId) {
        setActiveServer('fitcord-global');
        newSocket.emit('get_server_channels', 'fitcord-global');
      }
    });

    newSocket.on('channel_deleted', (channelId) => {
      setChannels(prev => prev.filter(c => c.id !== channelId));
      if (activeChannel === channelId) {
        setActiveChannel('general');
        newSocket.emit('switch_channel', 'general');
      }
    });

    return newSocket;
  };

  const createServer = (name: string) => {
    socketRef.current?.emit('create_server', name);
  };

  const inviteToServer = (serverId: string, targetUsername: string) => {
    socketRef.current?.emit('invite_to_server', { serverId, targetUsername });
  };

  const switchServer = (serverId: string | null) => {
    if (serverId === activeServer) return;
    setActiveServer(serverId);
    setActiveChannel('');
    setChannels([]); // Clear channels immediately to avoid showing stale data from previous server
    if (serverId) {
      socketRef.current?.emit('get_server_channels', serverId);
    }
  };

  const sendMessage = (text?: string, file?: string | ArrayBuffer | null) => {
    if (socketRef.current) {
      if (activePrivateChat) {
        socketRef.current.emit('send_private_message', { toUser: activePrivateChat, text, file });
      } else {
        socketRef.current.emit('send_message', { channelId: activeChannel, text, file });
      }
    }
  };

  const sendFriendRequest = (targetUsername: string) => {
    socketRef.current?.emit('send_friend_request', targetUsername);
  };

  const respondFriendRequest = (requestId: number, response: 'accepted' | 'rejected') => {
    socketRef.current?.emit('respond_friend_request', { requestId, response });
    setFriendRequests(prev => prev.filter(r => r.id !== requestId));
  };

  const updateStatus = (status: 'online' | 'away') => {
    socketRef.current?.emit('update_status', status);
  };

  const updateProfile = (profile: { displayName?: string, avatar?: string, banner?: string, bio?: string }) => {
    socketRef.current?.emit('update_profile', profile);
  };

  const switchPrivateChat = (otherUser: string | null) => {
    setActivePrivateChat(otherUser);
    if (otherUser) {
      setActiveChannel('');
      setActiveServer(null);
      if (!privateMessages[otherUser]) {
        socketRef.current?.emit('get_private_messages', otherUser);
      }
    }
  };

  const kickUser = (targetUsername: string, reason: string) => {
    socketRef.current?.emit('mod_kick', { targetUsername, reason });
  };

  const banUser = (targetUsername: string, reason: string) => {
    socketRef.current?.emit('mod_ban', { targetUsername, reason });
  };

  const deleteMessage = (messageId: number) => {
    socketRef.current?.emit('mod_delete_message', messageId);
  };

  const clearChannel = (channelId: string) => {
    socketRef.current?.emit('mod_clear_channel', channelId);
  };

  const createChannel = (serverId: string, name: string, type: 'text' | 'voice') => {
    socketRef.current?.emit('create_channel', { serverId, name, type });
  };

  const deleteServer = (serverId: string) => {
    socketRef.current?.emit('mod_delete_server', serverId);
  };

  const deleteChannel = (channelId: string) => {
    socketRef.current?.emit('mod_delete_channel', channelId);
  };

  const joinServer = (serverId: string) => {
    socketRef.current?.emit('mod_join_server', serverId);
  };

  const lockChannel = (channelId: string, lockMessage: string) => {
    socketRef.current?.emit('lock_channel', { channelId, lockMessage });
  };

  const unlockChannel = (channelId: string) => {
    socketRef.current?.emit('unlock_channel', channelId);
  };

  const updateChannelBackground = (channelId: string, backgroundUrl: string) => {
    socketRef.current?.emit('update_channel_background', { channelId, backgroundUrl });
  };

  const updateChannelDescription = (channelId: string, description: string) => {
    socketRef.current?.emit('update_channel_description', { channelId, description });
  };

  const setRole = (targetUsername: string, role: string) => {
    socketRef.current?.emit('mod_set_role', { targetUsername, role });
  };

  const setTitle = (targetUsername: string, title: string) => {
    socketRef.current?.emit('mod_set_title', { targetUsername, title });
  };

  const toggleLargeVideo = (targetUsername: string) => {
    socketRef.current?.emit('mod_toggle_large_video', targetUsername);
  };

  const toggleGifs = (targetUsername: string) => {
    socketRef.current?.emit('mod_toggle_gifs', targetUsername);
  };

  const updateServer = (serverId: string, name: string, icon: string, banner: string) => {
    socketRef.current?.emit('update_server', { serverId, name, icon, banner });
  };

  const resetServerIcon = (serverId: string) => {
    socketRef.current?.emit('mod_reset_server_icon', serverId);
  };

  const resetServerBanner = (serverId: string) => {
    socketRef.current?.emit('mod_reset_server_banner', serverId);
  };

  const switchChannel = (id: string) => {
    if (socketRef.current && id !== activeChannel) {
      const channel = channels.find(c => c.id === id);
      if (channel?.type === 'voice') {
        setActiveChannel(id); // Set activeChannel to show the voice UI
        joinVoice(id);
      } else {
        setActiveChannel(id);
        setActivePrivateChat(null);
        socketRef.current.emit('switch_channel', id);
      }
    }
  };

  const joinVoice = (channelId: string) => {
    if (activeVoiceChannel === channelId) return;
    
    // Just set the new channel and emit join. 
    // The server will handle leaving the previous room.
    setActiveVoiceChannel(channelId);
    socketRef.current?.emit('join_voice', channelId);
  };

  const leaveVoice = () => {
    setActiveVoiceChannel(null);
    setVoiceUsers([]);
    socketRef.current?.emit('leave_voice');
    // Switch back to general or a sensible default to avoid the "stuck" selection
    if (activeChannelRef.current && channels.find(c => c.id === activeChannelRef.current)?.type === 'voice') {
      setActiveChannel('general');
      socketRef.current?.emit('switch_channel', 'general');
    }
  };

  const updateAppLogo = (logoUrl: string) => {
    socketRef.current?.emit('update_app_logo', logoUrl);
  };

  const updateAppRingtone = (ringtoneUrl: string) => {
    socketRef.current?.emit('update_app_ringtone', ringtoneUrl);
  };

  const updateAppCallBanner = (bannerUrl: string) => {
    socketRef.current?.emit('update_app_call_banner', bannerUrl);
  };

  const sendVoiceSignal = (to: string, signal: any) => {
    socketRef.current?.emit('voice_signal', { to, signal });
  };

  const logout = () => {
    localStorage.removeItem('vox_username');
    localStorage.removeItem('vox_password');
    window.location.reload();
  };

  const updateCallSettings = (soundsEnabled: boolean) => {
    socketRef.current?.emit('update_call_settings', { soundsEnabled });
  };

  const initPrivateCall = (to: string, peerId: string) => {
    socketRef.current?.emit('private_call_init', { to, peerId });
  };

  const acceptPrivateCall = (to: string, peerId: string) => {
    socketRef.current?.emit('private_call_accept', { to, peerId });
  };

  const rejectPrivateCall = (to: string) => {
    socketRef.current?.emit('private_call_reject', { to });
  };

  const endPrivateCall = (to: string) => {
    socketRef.current?.emit('private_call_end', { to });
  };

  const sendPrivateCallSignal = (to: string, signal: any) => {
    socketRef.current?.emit('private_call_signal', { to, signal });
  };

  return {
    isLoggedIn,
    users,
    servers,
    channels,
    messages: activeChannel ? (channelMessages[activeChannel] || []) : [],
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
    appConfig,
    loginError,
    me,
    connect,
    createServer,
    inviteToServer,
    switchServer,
    sendMessage,
    sendFriendRequest,
    respondFriendRequest,
    updateStatus,
    onUpdateProfile: updateProfile,
    onUpdateAppLogo: updateAppLogo,
    onUpdateAppRingtone: updateAppRingtone,
    onUpdateAppCallBanner: updateAppCallBanner,
    onUpdateServer: updateServer,
    onResetServerIcon: resetServerIcon,
    onResetServerBanner: resetServerBanner,
    onToggleLargeVideo: toggleLargeVideo,
    onToggleGifs: toggleGifs,
    switchPrivateChat,
    kickUser,
    banUser,
    deleteMessage,
    clearChannel,
    deleteServer,
    deleteChannel,
    createChannel,
    joinServer,
    lockChannel,
    unlockChannel,
    updateChannelBackground,
    updateChannelDescription,
    setRole,
    onSetTitle: setTitle,
    switchChannel,
    joinVoice,
    leaveVoice,
    sendVoiceSignal,
    onMuteToggle: (channelId: string, isMuted: boolean) => {
      socketRef.current?.emit('voice_mute_toggle', { channelId, isMuted });
    },
    updateCallSettings,
    initPrivateCall,
    acceptPrivateCall,
    rejectPrivateCall,
    endPrivateCall,
    sendPrivateCallSignal,
    logout,
    socket: socketRef.current
  };
}
