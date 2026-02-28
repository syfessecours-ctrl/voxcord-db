import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { User, Channel, Message, Friend, FriendRequest, PrivateMessage, Server } from '../types';

export function useSocket(username: string) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
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

    newSocket.on('me', (data) => setMe(data));

    newSocket.on('login_error', (msg) => {
      setLoginError(msg);
      newSocket.disconnect();
    });

    newSocket.on('error', (msg) => {
      alert(msg);
    });

    newSocket.on('user_list', (list) => setUsers(list));
    newSocket.on('server_list', (list) => setServers(list));
    newSocket.on('channel_list', (list) => setChannels(list));
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
      if (channelId === activeChannelRef.current) setMessages(msgs);
    });

    newSocket.on('new_message', (msg) => {
      if (msg.channel_id === activeChannelRef.current) {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
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
      setMessages(prev => prev.filter(m => m.id !== messageId));
    });

    newSocket.on('messages_cleared', (channelId) => {
      if (channelId === activeChannelRef.current) {
        setMessages([]);
      }
    });

    newSocket.on('voice_users', (users) => {
      console.log("[Socket] Received voice_users (direct):", users);
      setVoiceUsers(users);
    });
    
    newSocket.on('voice_state_update', ({ channelId, users }) => {
      console.log(`[Socket] Voice state update for ${channelId}:`, users);
      setVoiceStates(prev => ({ ...prev, [channelId]: users }));
    });

    newSocket.on('voice_signal', (data) => {
      // This will be handled by ChatInterface via an event listener or a ref
      window.dispatchEvent(new CustomEvent('vox_voice_signal', { detail: data }));
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
    setActiveServer(serverId);
    if (serverId) {
      socketRef.current?.emit('get_server_channels', serverId);
    } else {
      setChannels([]);
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

  const updateProfile = (profile: { displayName?: string, avatar?: string, bio?: string }) => {
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

  const setRole = (targetUsername: string, role: string) => {
    socketRef.current?.emit('mod_set_role', { targetUsername, role });
  };

  const switchChannel = (id: string) => {
    if (socketRef.current && id !== activeChannel) {
      const channel = channels.find(c => c.id === id);
      if (channel?.type === 'voice') {
        joinVoice(id);
      } else {
        setActiveChannel(id);
        setActivePrivateChat(null);
        setMessages([]);
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
  };

  const sendVoiceSignal = (to: string, signal: any) => {
    socketRef.current?.emit('voice_signal', { to, signal });
  };

  const logout = () => {
    localStorage.removeItem('vox_username');
    localStorage.removeItem('vox_password');
    window.location.reload();
  };

  return {
    isLoggedIn,
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
    switchPrivateChat,
    kickUser,
    banUser,
    deleteMessage,
    clearChannel,
    deleteServer,
    deleteChannel,
    joinServer,
    lockChannel,
    unlockChannel,
    setRole,
    switchChannel,
    joinVoice,
    leaveVoice,
    sendVoiceSignal,
    logout,
    socket: socketRef.current
  };
}
