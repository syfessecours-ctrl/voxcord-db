import React, { useState } from 'react';
import { useSocket } from './hooks/useSocket';
import { Login } from './components/Login';
import { ChatInterface } from './components/ChatInterface';

export default function App() {
  const [username, setUsername] = useState(() => localStorage.getItem('vox_username') || '');
  const {
    isLoggedIn,
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
    switchPrivateChat,
    kickUser,
    banUser,
    deleteMessage,
    clearChannel,
    setRole,
    switchChannel,
    joinVoice,
    leaveVoice,
    sendVoiceSignal,
    logout
  } = useSocket(username);

  const handleLogin = (u: string, p: string) => {
    setUsername(u);
    connect(u, p);
  };

  if (!isLoggedIn) {
    return (
      <Login 
        onLogin={handleLogin} 
        error={loginError} 
        initialUsername={username} 
      />
    );
  }

  return (
    <ChatInterface 
      username={username}
      users={users}
      servers={servers}
      channels={channels}
      messages={messages}
      friends={friends}
      friendRequests={friendRequests}
      privateMessages={privateMessages}
      activeServer={activeServer}
      activeChannel={activeChannel}
      activePrivateChat={activePrivateChat}
      activeVoiceChannel={activeVoiceChannel}
      voiceUsers={voiceUsers}
      voiceStates={voiceStates}
      onSendMessage={sendMessage}
      onSwitchChannel={switchChannel}
      onJoinVoice={joinVoice}
      onLeaveVoice={leaveVoice}
      onSendVoiceSignal={sendVoiceSignal}
      onLogout={logout}
      me={me}
      onKickUser={kickUser}
      onBanUser={banUser}
      onDeleteMessage={deleteMessage}
      onClearChannel={clearChannel}
      onSetRole={setRole}
      onSendFriendRequest={sendFriendRequest}
      onRespondFriendRequest={respondFriendRequest}
      onUpdateStatus={updateStatus}
      onSwitchPrivateChat={switchPrivateChat}
      onCreateServer={createServer}
      onInviteToServer={inviteToServer}
      onSwitchServer={switchServer}
    />
  );
}
