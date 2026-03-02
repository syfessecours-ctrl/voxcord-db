import React, { useState } from 'react';
import { useSocket } from './hooks/useSocket';
import { Login } from './components/Login';
import { ChatInterface } from './components/ChatInterface';
import { KickScreen, KickConfig } from './components/KickScreen';

export default function App() {
  const [username, setUsername] = useState(() => localStorage.getItem('vox_username') || '');
  const [kickData, setKickData] = useState<KickConfig | null>(null);

  const {
    isLoggedIn,
    // ... rest of useSocket destructuring
    users,
    servers,
    channels,
    messages,
    friends,
    friendRequests,
    privateMessages,
    serverMembers,
    serverMemberDetails,
    modBans,
    modLogs,
    modStats,
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
    onUpdateKickConfig,
    onUpdateServer,
    onResetServerIcon,
    onResetServerBanner,
    onToggleLargeVideo,
    onToggleGifs,
    switchPrivateChat,
    kickUser,
    banUser,
    unbanUser,
    getModBans,
    getModLogs,
    getModStats,
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
    updateUserRole,
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

  React.useEffect(() => {
    const handleKicked = (e: any) => {
      const data = e.detail;
      setKickData({
        title: data.title,
        message: data.message,
        imageUrl: data.image,
        reason: data.reason,
        endsAt: data.endsAt,
        tone: 'immersive',
        layout: 'immersive',
        accentColor: '#8B5CF6',
        showProgressBar: true
      });
    };
    window.addEventListener('vox_kicked' as any, handleKicked);
    return () => window.removeEventListener('vox_kicked' as any, handleKicked);
  }, []);

  if (kickData) {
    return (
      <KickScreen 
        config={kickData} 
        onClose={() => {
          setKickData(null);
          logout();
        }} 
      />
    );
  }

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
    <>
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
        serverMemberDetails={serverMemberDetails}
        modBans={modBans}
        modLogs={modLogs}
        modStats={modStats}
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
        onUnbanUser={unbanUser}
        onGetModBans={getModBans}
        onGetModLogs={getModLogs}
        onGetModStats={getModStats}
        onDeleteMessage={deleteMessage}
        onClearChannel={clearChannel}
        onDeleteServer={deleteServer}
        onDeleteChannel={deleteChannel}
        onJoinServer={joinServer}
        onLockChannel={lockChannel}
        onUnlockChannel={unlockChannel}
        onUpdateChannelBackground={updateChannelBackground}
        onUpdateChannelDescription={updateChannelDescription}
        onUpdateUserRole={updateUserRole}
        onSetRole={setRole}
        onSetTitle={onSetTitle}
        onSendFriendRequest={sendFriendRequest}
        onRespondFriendRequest={respondFriendRequest}
        onUpdateStatus={updateStatus}
        onUpdateProfile={onUpdateProfile}
        onUpdateAppLogo={onUpdateAppLogo}
        onUpdateAppRingtone={onUpdateAppRingtone}
        onUpdateAppCallBanner={onUpdateAppCallBanner}
        onUpdateKickConfig={onUpdateKickConfig}
        onUpdateServer={onUpdateServer}
        onResetServerIcon={onResetServerIcon}
        onResetServerBanner={onResetServerBanner}
        onToggleLargeVideo={onToggleLargeVideo}
        onToggleGifs={onToggleGifs}
        onSwitchPrivateChat={switchPrivateChat}
        onCreateServer={createServer}
        onInviteToServer={inviteToServer}
        onCreateChannel={createChannel}
        onSwitchServer={switchServer}
        onMuteToggle={onMuteToggle}
        onInitPrivateCall={initPrivateCall}
        onAcceptPrivateCall={acceptPrivateCall}
        onRejectPrivateCall={rejectPrivateCall}
        onEndPrivateCall={endPrivateCall}
        onSendPrivateCallSignal={sendPrivateCallSignal}
        onUpdateCallSettings={updateCallSettings}
      />
    </>
  );
}
