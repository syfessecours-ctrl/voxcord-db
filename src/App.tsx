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
    onUpdateProfile,
    onUpdateAppLogo,
    onUpdateAppRingtone,
    onUpdateAppCallBanner,
    onUpdateServer,
    onResetServerIcon,
    onResetServerBanner,
    onToggleLargeVideo,
    onToggleGifs,
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
    updateChannelBackground,
    updateChannelDescription,
    setRole,
    onSetTitle,
    switchChannel,
    joinVoice,
    leaveVoice,
    sendVoiceSignal,
    onMuteToggle,
    initPrivateCall,
    acceptPrivateCall,
    rejectPrivateCall,
    endPrivateCall,
    sendPrivateCallSignal,
    updateCallSettings,
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
        logoUrl={appConfig.logo_url}
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
      serverMembers={serverMembers}
      activeServer={activeServer}
      activeChannel={activeChannel}
      activePrivateChat={activePrivateChat}
      activeVoiceChannel={activeVoiceChannel}
      voiceUsers={voiceUsers}
      voiceStates={voiceStates}
      appConfig={appConfig}
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
      onDeleteServer={deleteServer}
      onDeleteChannel={deleteChannel}
      onJoinServer={joinServer}
      onLockChannel={lockChannel}
      onUnlockChannel={unlockChannel}
      onUpdateChannelBackground={updateChannelBackground}
      onUpdateChannelDescription={updateChannelDescription}
      onSetRole={setRole}
      onSetTitle={onSetTitle}
      onSendFriendRequest={sendFriendRequest}
      onRespondFriendRequest={respondFriendRequest}
      onUpdateStatus={updateStatus}
      onUpdateProfile={onUpdateProfile}
      onUpdateAppLogo={onUpdateAppLogo}
      onUpdateAppRingtone={onUpdateAppRingtone}
      onUpdateAppCallBanner={onUpdateAppCallBanner}
      onUpdateServer={onUpdateServer}
      onResetServerIcon={onResetServerIcon}
      onResetServerBanner={onResetServerBanner}
      onToggleLargeVideo={onToggleLargeVideo}
      onToggleGifs={onToggleGifs}
      onSwitchPrivateChat={switchPrivateChat}
      onCreateServer={createServer}
      onInviteToServer={inviteToServer}
      onSwitchServer={switchServer}
      onMuteToggle={onMuteToggle}
      onInitPrivateCall={initPrivateCall}
      onAcceptPrivateCall={acceptPrivateCall}
      onRejectPrivateCall={rejectPrivateCall}
      onEndPrivateCall={endPrivateCall}
      onSendPrivateCallSignal={sendPrivateCallSignal}
      onUpdateCallSettings={updateCallSettings}
    />
  );
}
