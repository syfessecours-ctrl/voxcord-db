import React, { useState } from 'react';
import { useSocket } from './hooks/useSocket';
import { Login } from './components/Login';
import { ChatInterface } from './components/ChatInterface';
import { KickScreen, KickConfig } from './components/KickScreen';

export default function App() {
  const [username, setUsername] = useState(() => localStorage.getItem('vox_username') || '');
  const [showKickDemo, setShowKickDemo] = useState(false);
  const [demoConfig, setDemoConfig] = useState<KickConfig>({
    title: "Pause Communautaire",
    message: "Votre accès est temporairement restreint pour permettre à l'atmosphère du salon de s'apaiser.",
    imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000",
    accentColor: "#8B5CF6",
    showProgressBar: true,
    tone: "immersive",
    layout: "banner",
    reason: "Non-respect des consignes de sécurité dans le salon #poids-libres",
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(), // 2 hours from now
    staffContactUrl: "https://fitcord.com/support"
  });

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

      {/* Demo Controls */}
      <div className="fixed bottom-4 left-4 z-[10000] flex gap-2">
        <button 
          onClick={() => {
            setDemoConfig(prev => ({ ...prev, layout: 'banner' }));
            setShowKickDemo(true);
          }}
          className="px-3 py-1 bg-fit-primary text-white text-xs font-bold rounded-full shadow-lg hover:scale-105 transition-transform"
        >
          Demo Kick (Banner)
        </button>
        <button 
          onClick={() => {
            setDemoConfig(prev => ({ ...prev, layout: 'immersive' }));
            setShowKickDemo(true);
          }}
          className="px-3 py-1 bg-fit-primary text-white text-xs font-bold rounded-full shadow-lg hover:scale-105 transition-transform"
        >
          Demo Kick (Immersive)
        </button>
        <button 
          onClick={() => {
            setDemoConfig(prev => ({ ...prev, layout: 'poster' }));
            setShowKickDemo(true);
          }}
          className="px-3 py-1 bg-fit-primary text-white text-xs font-bold rounded-full shadow-lg hover:scale-105 transition-transform"
        >
          Demo Kick (Poster)
        </button>
      </div>

      {showKickDemo && (
        <KickScreen 
          config={demoConfig} 
          onClose={() => setShowKickDemo(false)} 
        />
      )}
    </>
  );
}
