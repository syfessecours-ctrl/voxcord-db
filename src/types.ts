export interface User {
  id: string;
  username: string;
  role: string;
  currentChannel: string;
  status?: 'online' | 'offline' | 'away';
  displayName?: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  canSendLargeVideos?: boolean;
  canUseGifs?: boolean;
  callSoundsEnabled?: boolean;
  ringtoneUrl?: string;
}

export interface FriendRequest {
  id: number;
  from_user: string;
  to_user: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: string;
}

export interface Friend {
  username: string;
  status: 'online' | 'offline' | 'away';
  displayName?: string;
  avatar?: string;
  banner?: string;
}

export interface PrivateMessage {
  id: number;
  from_user: string;
  to_user: string;
  text: string;
  file?: string;
  timestamp: string;
}

export interface Server {
  id: string;
  name: string;
  owner: string;
  icon?: string;
  banner?: string;
}

export interface Channel {
  id: string;
  name: string;
  type: string;
  server_id: string;
  locked?: boolean;
  lock_message?: string;
  background_url?: string;
  description?: string;
}

export interface Message {
  id: number;
  channel_id: string;
  user: string;
  text: string;
  file?: string;
  timestamp: string;
}
