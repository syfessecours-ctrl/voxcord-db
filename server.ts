import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import pg from "pg";
import multer from "multer";
const { Pool } = pg;

// Database abstraction to support both SQLite and PostgreSQL
let db: any;
const isPostgres = !!process.env.DATABASE_URL;

if (isPostgres) {
  console.log("[DB] Using PostgreSQL (Supabase)");
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
} else {
  console.log("[DB] Using SQLite (Local)");
  db = new Database("voxcord.db");
}

async function query(sql: string, params: any[] = []) {
  if (isPostgres) {
    let count = 0;
    const betterPgSql = sql.replace(/\?/g, () => `$${++count}`);
    const result = await db.query(betterPgSql, params);
    return result.rows;
  } else {
    return db.prepare(sql).all(...params);
  }
}

async function execute(sql: string, params: any[] = []) {
  if (isPostgres) {
    let count = 0;
    const betterPgSql = sql.replace(/\?/g, () => `$${++count}`);
    await db.query(betterPgSql, params);
  } else {
    db.prepare(sql).run(...params);
  }
}

async function getOne(sql: string, params: any[] = []) {
  const rows = await query(sql, params);
  return rows[0];
}

// Initialize database
async function initDb() {
  const schema = `
    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      name TEXT,
      owner TEXT,
      icon TEXT,
      banner TEXT,
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS server_members (
      server_id TEXT,
      username TEXT,
      timestamp TEXT,
      PRIMARY KEY(server_id, username)
    );

    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      name TEXT,
      type TEXT,
      server_id TEXT,
      locked BOOLEAN DEFAULT false,
      lock_message TEXT DEFAULT 'Ce salon est verrouillé.',
      background_url TEXT,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password_hash TEXT,
      role TEXT DEFAULT 'user',
      last_ip TEXT,
      display_name TEXT,
      avatar TEXT,
      banner TEXT,
      bio TEXT,
      can_send_large_videos BOOLEAN DEFAULT false,
      can_use_gifs BOOLEAN DEFAULT false,
      call_sounds_enabled BOOLEAN DEFAULT true,
      ringtone_url TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      channel_id TEXT,
      "user" TEXT,
      text TEXT,
      file TEXT,
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS banned_ips (
      ip TEXT PRIMARY KEY,
      reason TEXT,
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS mod_logs (
      id SERIAL PRIMARY KEY,
      admin TEXT,
      action TEXT,
      target TEXT,
      reason TEXT,
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS friends (
      user1 TEXT,
      user2 TEXT,
      timestamp TEXT,
      PRIMARY KEY(user1, user2)
    );

    CREATE TABLE IF NOT EXISTS friend_requests (
      id SERIAL PRIMARY KEY,
      from_user TEXT,
      to_user TEXT,
      status TEXT DEFAULT 'pending',
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS private_messages (
      id SERIAL PRIMARY KEY,
      from_user TEXT,
      to_user TEXT,
      text TEXT,
      file TEXT,
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `;

  if (isPostgres) {
    // Split schema into individual statements for better error handling in Postgres
    const statements = schema
      .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      try {
        await db.query(statement);
      } catch (e) {
        console.error(`[DB] Error executing schema statement:`, e);
      }
    }

    // Migrations for PostgreSQL
    const migrations = [
      { sql: "ALTER TABLE users ADD COLUMN display_name TEXT;", code: "42701" },
      { sql: "ALTER TABLE users ADD COLUMN avatar TEXT;", code: "42701" },
      { sql: "ALTER TABLE users ADD COLUMN bio TEXT;", code: "42701" },
      { sql: "ALTER TABLE users ADD COLUMN banner TEXT;", code: "42701" },
      { sql: "ALTER TABLE users ADD COLUMN can_use_gifs BOOLEAN DEFAULT false;", code: "42701" },
      { sql: "ALTER TABLE channels ADD COLUMN server_id TEXT;", code: "42701" },
      { sql: "ALTER TABLE channels ADD COLUMN locked BOOLEAN DEFAULT false;", code: "42701" },
      { sql: "ALTER TABLE channels ADD COLUMN lock_message TEXT DEFAULT 'Ce salon est verrouillé.';", code: "42701" },
      { sql: "ALTER TABLE channels ADD COLUMN background_url TEXT;", code: "42701" },
      { sql: "ALTER TABLE channels ADD COLUMN description TEXT;", code: "42701" },
      { sql: "ALTER TABLE servers ADD COLUMN icon TEXT;", code: "42701" },
      { sql: "ALTER TABLE servers ADD COLUMN banner TEXT;", code: "42701" }
    ];

    for (const migration of migrations) {
      try {
        await db.query(migration.sql);
      } catch (e: any) {
        // 42701 is "duplicate_column" in Postgres
        if (e.code !== migration.code) {
          console.error(`[DB] Migration error (${migration.sql}):`, e);
        }
      }
    }
  } else {
    db.exec(schema.replace(/SERIAL PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT'));
    // Migrations for SQLite
    const sqliteMigrations = [
      "ALTER TABLE channels ADD COLUMN server_id TEXT;",
      "ALTER TABLE channels ADD COLUMN locked BOOLEAN DEFAULT false;",
      "ALTER TABLE channels ADD COLUMN lock_message TEXT DEFAULT 'Ce salon est verrouillé.';",
      "ALTER TABLE channels ADD COLUMN background_url TEXT;",
      "ALTER TABLE channels ADD COLUMN description TEXT;",
      "ALTER TABLE servers ADD COLUMN icon TEXT;",
      "ALTER TABLE servers ADD COLUMN banner TEXT;",
      "ALTER TABLE users ADD COLUMN display_name TEXT;",
      "ALTER TABLE users ADD COLUMN avatar TEXT;",
      "ALTER TABLE users ADD COLUMN bio TEXT;",
      "ALTER TABLE users ADD COLUMN banner TEXT;",
      "ALTER TABLE users ADD COLUMN can_send_large_videos BOOLEAN DEFAULT false;",
      "ALTER TABLE users ADD COLUMN can_use_gifs BOOLEAN DEFAULT false;",
      "ALTER TABLE users ADD COLUMN call_sounds_enabled BOOLEAN DEFAULT true;",
      "ALTER TABLE users ADD COLUMN ringtone_url TEXT;"
    ];

    for (const sql of sqliteMigrations) {
      try {
        db.exec(sql);
      } catch (e) {
        // Ignore "duplicate column name" errors in SQLite
      }
    }
  }

  await execute("INSERT INTO servers (id, name, owner, timestamp) VALUES ('fitcord-global', 'FitCord Global', 'system', '2026-02-27T00:00:00.000Z') ON CONFLICT DO NOTHING");
  await execute("INSERT INTO channels (id, name, type, server_id) VALUES ('general', 'général', 'text', 'fitcord-global') ON CONFLICT DO NOTHING");
  await execute("INSERT INTO app_config (key, value) VALUES ('logo_url', 'https://m.media-amazon.com/images/M/MV5BNDg4NjM1YjYtMzcyZC00NjZlLTk0Y2QtNzI3MGEzZDUyZDExXkEyXkFqcGdeQXVyNjU0OTQ0OTY@._V1_.jpg') ON CONFLICT DO NOTHING");
}

const OWNER_USERNAME = "Vdw6200";

async function startServer() {
  try {
    const app = express();
    const httpServer = createServer(app);
    const io = new Server(httpServer, {
      maxHttpBufferSize: 1e9, // 1GB limit for the server
      cors: { origin: "*" }
    });

    const PORT = 3000;
    console.log("[SERVER] Initializing database...");
    await initDb();
    console.log("[SERVER] Database initialized successfully.");

    // Health check endpoint for Render keep-alive
    app.get("/api/health", (req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    app.get("/api/config", async (req, res) => {
      try {
        const configRows = await query("SELECT key, value FROM app_config");
        const config: Record<string, string> = {};
        configRows.forEach((row: any) => {
          config[row.key] = row.value;
        });
        res.json(config);
      } catch (err) {
        console.error("Error fetching config:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // File Upload Setup
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, 'uploads/');
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
      }
    });

    const upload = multer({ 
      storage: storage,
      limits: { fileSize: 1024 * 1024 * 1024 } // 1GB
    });

    app.use('/uploads', express.static('uploads'));

    app.post('/api/upload', upload.single('file'), (req: any, res) => {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ url: fileUrl });
    });

  const users = new Map(); // socket.id -> user info
  const voiceStates = new Map(); // channelId -> Set of { sid, username, isMuted }

  const getAppConfig = async () => {
    const rows = await query("SELECT * FROM app_config");
    const config: Record<string, string> = {};
    rows.forEach((row: any) => {
      config[row.key] = row.value;
    });
    return config;
  };

  const broadcastUserList = async () => {
    // Get unique users by username to avoid duplicates
    const uniqueUsersMap = new Map();
    for (const u of users.values()) {
      uniqueUsersMap.set(u.username, u);
    }
    const allUsers = Array.from(uniqueUsersMap.values());

    for (const [sid, u] of users.entries()) {
      if (u.role === 'owner' || u.role === 'moderator') {
        io.to(sid).emit("user_list", allUsers);
      } else {
        // Get all users who share at least one server with this user
        const userServers = await query("SELECT server_id FROM server_members WHERE username = ?", [u.username]);
        const serverIds = userServers.map((s: any) => s.server_id);
        
        if (serverIds.length > 0) {
          const placeholders = serverIds.map(() => '?').join(',');
          const serverMembers = await query(`
            SELECT DISTINCT username FROM server_members 
            WHERE server_id IN (${placeholders})
          `, serverIds);
          const memberNames = new Set(serverMembers.map((m: any) => m.username));
          const filtered = allUsers.filter(user => memberNames.has(user.username));
          io.to(sid).emit("user_list", filtered);
        } else {
          // Fallback to just themselves if not in any server (shouldn't happen as they join global)
          io.to(sid).emit("user_list", allUsers.filter(user => user.username === u.username));
        }
      }
    }
  };

  io.on("connection", (socket) => {
    const clientIp = socket.handshake.address;

    socket.on("join", async ({ username, password }) => {
      if (!username || !password) return socket.emit("login_error", "Pseudo et mot de passe requis.");

      // Check if IP is banned
      const isBanned = await getOne("SELECT * FROM banned_ips WHERE ip = ?", [clientIp]);
      if (isBanned) return socket.emit("login_error", `Vous êtes banni. Raison: ${isBanned.reason}`);

      let userRecord = await getOne("SELECT * FROM users WHERE username = ?", [username]);
      
      if (userRecord) {
        const isValid = await bcrypt.compare(password, userRecord.password_hash);
        if (!isValid) return socket.emit("login_error", "Mot de passe incorrect.");
        
        // Ensure owner role is updated if username matches OWNER_USERNAME exactly
        if (username === OWNER_USERNAME && (userRecord.role !== 'owner' || !userRecord.can_use_gifs)) {
          await execute("UPDATE users SET role = 'owner', can_send_large_videos = true, can_use_gifs = true WHERE username = ?", [username]);
          userRecord.role = 'owner';
          userRecord.can_send_large_videos = true;
          userRecord.can_use_gifs = true;
        }
      } else {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        const role = username === OWNER_USERNAME ? 'owner' : 'user';
        const canSendLarge = role === 'owner';
        const canUseGifs = role === 'owner';
        
        await execute("INSERT INTO users (username, password_hash, role, last_ip, can_send_large_videos, can_use_gifs) VALUES (?, ?, ?, ?, ?, ?)", 
          [username, hash, role, clientIp, canSendLarge, canUseGifs]);
        userRecord = { username, role, can_send_large_videos: canSendLarge, can_use_gifs: canUseGifs };
      }

      users.set(socket.id, { 
        username, 
        id: socket.id, 
        role: userRecord.role, 
        currentChannel: 'general', 
        status: 'online',
        displayName: userRecord.display_name,
        avatar: userRecord.avatar,
        banner: userRecord.banner,
        bio: userRecord.bio,
        canSendLargeVideos: !!userRecord.can_send_large_videos,
        canUseGifs: !!userRecord.can_use_gifs,
        callSoundsEnabled: !!userRecord.call_sounds_enabled,
        ringtoneUrl: userRecord.ringtone_url
      });
      socket.join('general');
      
      socket.emit("me", { 
        username, 
        role: userRecord.role,
        displayName: userRecord.display_name,
        avatar: userRecord.avatar,
        banner: userRecord.banner,
        bio: userRecord.bio,
        canSendLargeVideos: !!userRecord.can_send_large_videos,
        canUseGifs: !!userRecord.can_use_gifs,
        callSoundsEnabled: !!userRecord.call_sounds_enabled,
        ringtoneUrl: userRecord.ringtone_url
      });
      
      // Auto-join global server members if not already
      await execute("INSERT INTO server_members (server_id, username, timestamp) VALUES (?, ?, ?) ON CONFLICT DO NOTHING", ['fitcord-global', username, new Date().toISOString()]);

      const userServers = await query(
        userRecord.role === 'owner' 
          ? "SELECT * FROM servers" 
          : `
            SELECT s.* FROM servers s
            JOIN server_members sm ON s.id = sm.server_id
            WHERE sm.username = ?
          `, 
        userRecord.role === 'owner' ? [] : [username]
      );
      socket.emit("server_list", userServers);
      
      // Send friends list and requests
      const friends = await query(`
        SELECT f.*, u.display_name, u.avatar FROM friends f
        JOIN users u ON (f.user1 = u.username OR f.user2 = u.username)
        WHERE (f.user1 = ? OR f.user2 = ?) AND u.username != ?
      `, [username, username, username]);
      
      const friendList = friends.map((f: any) => {
        const friendName = f.user1 === username ? f.user2 : f.user1;
        const isOnline = Array.from(users.values()).find(u => u.username === friendName);
        return { 
          username: friendName, 
          status: isOnline ? (isOnline.status || 'online') : 'offline',
          displayName: f.display_name,
          avatar: f.avatar
        };
      });
      socket.emit("friend_list", friendList);

      const requests = await query("SELECT * FROM friend_requests WHERE to_user = ? AND status = 'pending'", [username]);
      socket.emit("friend_requests", requests);

      // Send initial voice states
      for (const [channelId, userSet] of voiceStates.entries()) {
        socket.emit("voice_state_update", { channelId, users: Array.from(userSet) });
      }

      const appConfig = await getAppConfig();
      socket.emit("app_config", appConfig);

      await broadcastUserList();
      
      // Notify friends that this user is online
      friendList.forEach(f => {
        const friendSocketId = Array.from(users.entries()).find(([id, u]) => u.username === f.username)?.[0];
        if (friendSocketId) {
          io.to(friendSocketId).emit("friend_status_update", { username, status: 'online' });
        }
      });
      
      const msgs = (await query("SELECT * FROM messages WHERE channel_id = ? ORDER BY id DESC LIMIT 50", ['general'])).reverse();
      socket.emit("init_messages", { channelId: 'general', messages: msgs });
      socket.emit("login_success");
    });

    socket.on("create_server", async (name) => {
      console.log(`[Server] create_server request from ${socket.id} with name: ${name}`);
      const user = users.get(socket.id);
      if (!user) {
        console.log("[Server] User not found for socket", socket.id);
        return;
      }

      // Check if user already owns a server (limit 1 for free tier)
      const existing = await getOne("SELECT * FROM servers WHERE owner = ?", [user.username]);
      if (existing && user.role !== 'owner') {
        console.log(`[Server] User ${user.username} already owns a server: ${existing.id}`);
        return socket.emit("error", "Vous ne pouvez créer qu'un seul serveur.");
      }

      const serverId = `srv-${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = new Date().toISOString();
      const randomIcon = `https://picsum.photos/seed/${serverId}/200/200`;
      
      try {
        await execute("INSERT INTO servers (id, name, owner, icon, timestamp) VALUES (?, ?, ?, ?, ?)", [serverId, name, user.username, randomIcon, timestamp]);
        await execute("INSERT INTO server_members (server_id, username, timestamp) VALUES (?, ?, ?)", [serverId, user.username, timestamp]);

        // Create default channels for the new server
        const textChannelId = `ch-${Math.random().toString(36).substr(2, 9)}`;
        await execute("INSERT INTO channels (id, name, type, server_id) VALUES (?, ?, ?, ?)", [textChannelId, "général", "text", serverId]);
        
        const voiceChannelId = `vc-${Math.random().toString(36).substr(2, 9)}`;
        await execute("INSERT INTO channels (id, name, type, server_id) VALUES (?, ?, ?, ?)", [voiceChannelId, "Salon Vocal", "voice", serverId]);

        // Broadcast to all owners that a new server was created
        const allServers = await query("SELECT * FROM servers");
        for (const [sid, u] of users.entries()) {
          if (u.role === 'owner') {
            io.to(sid).emit("server_list", allServers);
          } else if (u.username === user.username) {
            const userServers = await query(`
              SELECT s.* FROM servers s
              JOIN server_members sm ON s.id = sm.server_id
              WHERE sm.username = ?
            `, [u.username]);
            io.to(sid).emit("server_list", userServers);
          }
        }
        
        socket.emit("server_created", { id: serverId, name });
      } catch (err) {
        console.error("[SERVER_ERROR] Failed to create server:", err);
        socket.emit("error", "Erreur lors de la création du serveur.");
      }
    });

    socket.on("update_server", async ({ serverId, name, icon, banner }) => {
      const user = users.get(socket.id);
      if (!user) return;

      const server = await getOne("SELECT * FROM servers WHERE id = ?", [serverId]);
      if (!server || server.owner !== user.username) return;

      await execute("UPDATE servers SET name = ?, icon = ?, banner = ? WHERE id = ?", [name, icon, banner, serverId]);
      
      // Update all users about the server update
      const allServers = await query("SELECT * FROM servers");
      for (const [sid, u] of users.entries()) {
        if (u.role === 'owner') {
          io.to(sid).emit("server_list", allServers);
        } else {
          const userServers = await query(`
            SELECT s.* FROM servers s
            JOIN server_members sm ON s.id = sm.server_id
            WHERE sm.username = ?
          `, [u.username]);
          io.to(sid).emit("server_list", userServers);
        }
      }
      
      // Notify members of this server specifically
      io.to(serverId).emit("server_updated", { id: serverId, name, icon, banner });
    });

    socket.on("mod_reset_server_icon", async (serverId) => {
      const user = users.get(socket.id);
      if (!user || (user.role !== 'admin' && user.role !== 'owner' && user.role !== 'moderator')) return;

      await execute("UPDATE servers SET icon = NULL WHERE id = ?", [serverId]);
      
      // Update all users
      const allServers = await query("SELECT * FROM servers");
      for (const [sid, u] of users.entries()) {
        if (u.role === 'owner') {
          io.to(sid).emit("server_list", allServers);
        } else {
          const userServers = await query(`
            SELECT s.* FROM servers s
            JOIN server_members sm ON s.id = sm.server_id
            WHERE sm.username = ?
          `, [u.username]);
          io.to(sid).emit("server_list", userServers);
        }
      }
    });

    socket.on("mod_reset_server_banner", async (serverId) => {
      const user = users.get(socket.id);
      if (!user || (user.role !== 'admin' && user.role !== 'owner' && user.role !== 'moderator')) return;

      await execute("UPDATE servers SET banner = NULL WHERE id = ?", [serverId]);
      
      // Update all users
      const allServers = await query("SELECT * FROM servers");
      for (const [sid, u] of users.entries()) {
        if (u.role === 'owner') {
          io.to(sid).emit("server_list", allServers);
        } else {
          const userServers = await query(`
            SELECT s.* FROM servers s
            JOIN server_members sm ON s.id = sm.server_id
            WHERE sm.username = ?
          `, [u.username]);
          io.to(sid).emit("server_list", userServers);
        }
      }
    });

    socket.on("get_server_channels", async (serverId) => {
      const channels = await query("SELECT * FROM channels WHERE server_id = ?", [serverId]);
      socket.emit("channel_list", channels);

      const members = await query("SELECT username FROM server_members WHERE server_id = ?", [serverId]);
      socket.emit("server_members", { serverId, members: members.map((m: any) => m.username) });
    });

    // Voice Signaling
    socket.on("join_voice", (channelId) => {
      const user = users.get(socket.id);
      if (!user) return;
      
      console.log(`[Voice] User ${user.username} joining voice channel: ${channelId}`);
      
      // If user was in another voice channel, leave it first
      if (user.currentVoiceChannel && user.currentVoiceChannel !== channelId) {
        const oldChannelId = user.currentVoiceChannel;
        socket.leave(`voice:${oldChannelId}`);
        
        const oldSet = voiceStates.get(oldChannelId);
        if (oldSet) {
          Array.from(oldSet).forEach((u: any) => {
            if (u.sid === socket.id) oldSet.delete(u);
          });
          io.emit("voice_state_update", { channelId: oldChannelId, users: Array.from(oldSet) });
        }
      }
      
      socket.join(`voice:${channelId}`);
      user.currentVoiceChannel = channelId;
      
      if (!voiceStates.has(channelId)) {
        voiceStates.set(channelId, new Set());
      }
      const channelSet = voiceStates.get(channelId);
      // Remove any existing entry for this sid to avoid duplicates
      Array.from(channelSet).forEach((u: any) => {
        if (u.sid === socket.id) channelSet.delete(u);
      });
      channelSet.add({ sid: socket.id, username: user.username, isMuted: false });
      
      const currentUsers = Array.from(channelSet);
      io.emit("voice_state_update", { channelId, users: currentUsers });
      
      // Still send the direct voice_users for the PeerJS logic
      const others = currentUsers.filter((u: any) => u.sid !== socket.id);
      socket.emit("voice_users", others);
    });

    socket.on("leave_voice", () => {
      const user = users.get(socket.id);
      if (!user || !user.currentVoiceChannel) return;
      
      const channelId = user.currentVoiceChannel;
      socket.leave(`voice:${channelId}`);
      user.currentVoiceChannel = null;
      
      const channelSet = voiceStates.get(channelId);
      if (channelSet) {
        Array.from(channelSet).forEach((u: any) => {
          if (u.sid === socket.id) channelSet.delete(u);
        });
        io.emit("voice_state_update", { channelId, users: Array.from(channelSet) });
      }
    });

    socket.on("voice_signal", ({ to, signal }) => {
      const user = users.get(socket.id);
      if (!user) return;
      io.to(to).emit("voice_signal", { from: socket.id, signal, username: user.username });
    });

    socket.on("voice_mute_toggle", ({ channelId, isMuted }) => {
      const user = users.get(socket.id);
      if (!user || !channelId) return;

      const channelSet = voiceStates.get(channelId);
      if (channelSet) {
        // Update the user's mute status in the set
        const userInChannel = Array.from(channelSet).find((u: any) => u.sid === socket.id);
        if (userInChannel) {
          (userInChannel as any).isMuted = isMuted;
          io.emit("voice_state_update", { channelId, users: Array.from(channelSet) });
        }
      }
    });

    socket.on("invite_to_server", async ({ serverId, targetUsername }) => {
      const user = users.get(socket.id);
      if (!user) return;

      const server = await getOne("SELECT * FROM servers WHERE id = ?", [serverId]);
      if (!server || server.owner !== user.username) return socket.emit("error", "Seul le propriétaire peut inviter.");

      await execute("INSERT INTO server_members (server_id, username, timestamp) VALUES (?, ?, ?) ON CONFLICT DO NOTHING", [serverId, targetUsername, new Date().toISOString()]);

      // Notify target if online
      for (const [sid, u] of users.entries()) {
        if (u.username === targetUsername) {
          const userServers = await query(`
            SELECT s.* FROM servers s
            JOIN server_members sm ON s.id = sm.server_id
            WHERE sm.username = ?
          `, [targetUsername]);
          io.to(sid).emit("server_list", userServers);
          break;
        }
      }
    });

    socket.on("update_status", async (status) => {
      const user = users.get(socket.id);
      if (user) {
        user.status = status;
        await broadcastUserList();
        
        // Notify friends
        const friends = await query("SELECT * FROM friends WHERE user1 = ? OR user2 = ?", [user.username, user.username]);
        friends.forEach(f => {
          const friendName = f.user1 === user.username ? f.user2 : f.user1;
          const friendSocketId = Array.from(users.entries()).find(([id, u]) => u.username === friendName)?.[0];
          if (friendSocketId) {
            io.to(friendSocketId).emit("friend_status_update", { username: user.username, status });
          }
        });
      }
    });

    socket.on("update_profile", async ({ displayName, avatar, banner, bio }) => {
      const user = users.get(socket.id);
      if (!user) return;

      await execute("UPDATE users SET display_name = ?, avatar = ?, banner = ?, bio = ? WHERE username = ?", [displayName, avatar, banner, bio, user.username]);
      
      // Update ALL sockets for this user
      for (const [sid, u] of users.entries()) {
        if (u.username === user.username) {
          u.displayName = displayName;
          u.avatar = avatar;
          u.banner = banner;
          u.bio = bio;
          
          io.to(sid).emit("me", { 
            username: u.username, 
            role: u.role,
            displayName,
            avatar,
            banner,
            bio,
            canSendLargeVideos: u.canSendLargeVideos,
            canUseGifs: u.canUseGifs,
            callSoundsEnabled: u.callSoundsEnabled,
            ringtoneUrl: u.ringtoneUrl
          });
        }
      }

      await broadcastUserList();

      // Notify all users about the profile update (for friend lists and chat)
      io.emit("user_profile_updated", {
        username: user.username,
        displayName,
        avatar,
        banner,
        bio
      });
    });

    socket.on("update_call_settings", async ({ soundsEnabled, ringtoneUrl }) => {
      const user = users.get(socket.id);
      if (!user) return;
      
      await execute("UPDATE users SET call_sounds_enabled = ?, ringtone_url = ? WHERE username = ?", [soundsEnabled, ringtoneUrl, user.username]);
      
      for (const [sid, u] of users.entries()) {
        if (u.username === user.username) {
          u.callSoundsEnabled = soundsEnabled;
          u.ringtoneUrl = ringtoneUrl;
          
          io.to(sid).emit("me", { 
            username: u.username, 
            role: u.role, 
            displayName: u.displayName, 
            avatar: u.avatar, 
            bio: u.bio, 
            banner: u.banner,
            canSendLargeVideos: u.canSendLargeVideos,
            canUseGifs: u.canUseGifs,
            callSoundsEnabled: soundsEnabled, 
            ringtoneUrl 
          });
        }
      }
    });

    // Private Calls
    socket.on("private_call_init", ({ to, peerId }) => {
      const fromUser = users.get(socket.id);
      if (!fromUser) return;
      
      const targetSocketId = Array.from(users.entries()).find(([id, u]) => u.username === to)?.[0];
      if (targetSocketId) {
        io.to(targetSocketId).emit("private_call_incoming", { 
          from: fromUser.username, 
          peerId,
          displayName: fromUser.displayName,
          avatar: fromUser.avatar,
          banner: fromUser.banner
        });
      }
    });

    socket.on("private_call_accept", ({ to, peerId }) => {
      const fromUser = users.get(socket.id);
      if (!fromUser) return;
      
      const targetSocketId = Array.from(users.entries()).find(([id, u]) => u.username === to)?.[0];
      if (targetSocketId) {
        io.to(targetSocketId).emit("private_call_accepted", { from: fromUser.username, peerId });
      }
    });

    socket.on("private_call_reject", ({ to }) => {
      const targetSocketId = Array.from(users.entries()).find(([id, u]) => u.username === to)?.[0];
      if (targetSocketId) {
        io.to(targetSocketId).emit("private_call_rejected", { from: users.get(socket.id)?.username });
      }
    });

    socket.on("private_call_end", ({ to }) => {
      const targetSocketId = Array.from(users.entries()).find(([id, u]) => u.username === to)?.[0];
      if (targetSocketId) {
        io.to(targetSocketId).emit("private_call_ended", { from: users.get(socket.id)?.username });
      }
    });

    socket.on("private_call_signal", ({ to, signal }) => {
      const targetSocketId = Array.from(users.entries()).find(([id, u]) => u.username === to)?.[0];
      if (targetSocketId) {
        io.to(targetSocketId).emit("private_call_signal", { from: users.get(socket.id)?.username, signal });
      }
    });

    socket.on("send_friend_request", async (targetUsername) => {
      const user = users.get(socket.id);
      if (!user || user.username === targetUsername) return;

      // Check if already friends
      const existingFriend = await getOne("SELECT * FROM friends WHERE (user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?)", [user.username, targetUsername, targetUsername, user.username]);
      if (existingFriend) return;

      // Check if request already exists
      const existingRequest = await getOne("SELECT * FROM friend_requests WHERE from_user = ? AND to_user = ? AND status = 'pending'", [user.username, targetUsername]);
      if (existingRequest) return;

      const timestamp = new Date().toISOString();
      await execute("INSERT INTO friend_requests (from_user, to_user, timestamp) VALUES (?, ?, ?)", [user.username, targetUsername, timestamp]);
      
      const request = await getOne("SELECT * FROM friend_requests WHERE from_user = ? AND to_user = ? AND timestamp = ?", [user.username, targetUsername, timestamp]);

      const targetSocketId = Array.from(users.entries()).find(([id, u]) => u.username === targetUsername)?.[0];
      if (targetSocketId) {
        io.to(targetSocketId).emit("new_friend_request", request);
      }
    });

    socket.on("respond_friend_request", async ({ requestId, response }) => {
      const user = users.get(socket.id);
      if (!user) return;

      const request = await getOne("SELECT * FROM friend_requests WHERE id = ? AND to_user = ?", [requestId, user.username]);
      if (!request) return;

      if (response === 'accepted') {
        const [u1, u2] = [request.from_user, request.to_user].sort();
        await execute("UPDATE friend_requests SET status = 'accepted' WHERE id = ?", [requestId]);
        await execute("INSERT INTO friends (user1, user2, timestamp) VALUES (?, ?, ?) ON CONFLICT DO NOTHING", [u1, u2, new Date().toISOString()]);
        
        // Notify both users
        const fromUserOnline = Array.from(users.values()).find(u => u.username === request.from_user);
        const toUserOnline = Array.from(users.values()).find(u => u.username === request.to_user);

        const fromUserRecord = await getOne("SELECT display_name, avatar FROM users WHERE username = ?", [request.from_user]);
        const toUserRecord = await getOne("SELECT display_name, avatar FROM users WHERE username = ?", [request.to_user]);

        const fromSocketId = Array.from(users.entries()).find(([id, u]) => u.username === request.from_user)?.[0];
        if (fromSocketId) {
          io.to(fromSocketId).emit("friend_added", { 
            username: user.username, 
            status: toUserOnline ? (toUserOnline.status || 'online') : 'offline',
            displayName: toUserRecord?.display_name,
            avatar: toUserRecord?.avatar
          });
        }
        socket.emit("friend_added", { 
          username: request.from_user, 
          status: fromUserOnline ? (fromUserOnline.status || 'online') : 'offline',
          displayName: fromUserRecord?.display_name,
          avatar: fromUserRecord?.avatar
        });
        await broadcastUserList();
      } else {
        await execute("UPDATE friend_requests SET status = 'rejected' WHERE id = ?", [requestId]);
      }
    });

    socket.on("send_private_message", async ({ toUser, text, file }) => {
      const user = users.get(socket.id);
      if (!user) return;

      const timestamp = new Date().toISOString();
      await execute("INSERT INTO private_messages (from_user, to_user, text, file, timestamp) VALUES (?, ?, ?, ?, ?)", [user.username, toUser, text || "", file || null, timestamp]);
      
      const message = await getOne("SELECT * FROM private_messages WHERE from_user = ? AND to_user = ? AND timestamp = ?", [user.username, toUser, timestamp]);

      const targetSocketId = Array.from(users.entries()).find(([id, u]) => u.username === toUser)?.[0];
      if (targetSocketId) {
        io.to(targetSocketId).emit("new_private_message", message);
      }
      socket.emit("new_private_message", message);
    });

    socket.on("get_private_messages", async (otherUser) => {
      const user = users.get(socket.id);
      if (!user) return;

      const msgs = await query(`
        SELECT * FROM private_messages 
        WHERE (from_user = ? AND to_user = ?) OR (from_user = ? AND to_user = ?)
        ORDER BY id ASC
      `, [user.username, otherUser, otherUser, user.username]);
      
      socket.emit("init_private_messages", { otherUser, messages: msgs });
    });

    socket.on("switch_channel", async (channelId) => {
      const user = users.get(socket.id);
      if (user) {
        socket.leave(user.currentChannel);
        user.currentChannel = channelId;
        socket.join(channelId);
        const msgs = (await query("SELECT * FROM messages WHERE channel_id = ? ORDER BY id DESC LIMIT 50", [channelId])).reverse();
        socket.emit("init_messages", { channelId, messages: msgs });
      }
    });

    socket.on("send_message", async ({ channelId, text, file }) => {
      const user = users.get(socket.id);
      if (!user) return;

      // Check if channel is locked
      const channel = await getOne("SELECT * FROM channels WHERE id = ?", [channelId]);
      if (channel && channel.locked && user.role !== 'owner' && user.role !== 'moderator') {
        return socket.emit("error", channel.lock_message || "Ce salon est verrouillé.");
      }

      const timestamp = new Date().toISOString();
      await execute("INSERT INTO messages (channel_id, \"user\", text, file, timestamp) VALUES (?, ?, ?, ?, ?)", [channelId, user.username, text || "", file || null, timestamp]);
      
      const message = await getOne("SELECT * FROM messages WHERE channel_id = ? AND \"user\" = ? AND timestamp = ?", [channelId, user.username, timestamp]);
      
      io.to(channelId).emit("new_message", message);
    });

    // Moderation Handlers
    socket.on("mod_kick", async ({ targetUsername, reason }) => {
      const admin = users.get(socket.id);
      if (!admin || (admin.role !== 'owner' && admin.role !== 'moderator')) return;

      const targetSocketId = Array.from(users.entries()).find(([id, u]) => u.username === targetUsername)?.[0];
      if (targetSocketId) {
        io.to(targetSocketId).emit("login_error", `Vous avez été expulsé. Raison: ${reason}`);
        io.sockets.sockets.get(targetSocketId)?.disconnect();
        
        await execute("INSERT INTO mod_logs (admin, action, target, reason, timestamp) VALUES (?, ?, ?, ?, ?)", [admin.username, 'kick', targetUsername, reason, new Date().toISOString()]);
      }
    });

    socket.on("mod_ban", async ({ targetUsername, reason }) => {
      const admin = users.get(socket.id);
      if (!admin || admin.role !== 'owner') return;

      const targetUser = await getOne("SELECT last_ip FROM users WHERE username = ?", [targetUsername]);
      if (targetUser?.last_ip) {
        await execute("INSERT INTO banned_ips (ip, reason, timestamp) VALUES (?, ?, ?) ON CONFLICT DO NOTHING", [targetUser.last_ip, reason, new Date().toISOString()]);
        
        const targetSocketId = Array.from(users.entries()).find(([id, u]) => u.username === targetUsername)?.[0];
        if (targetSocketId) {
          io.to(targetSocketId).emit("login_error", `Vous avez été banni. Raison: ${reason}`);
          io.sockets.sockets.get(targetSocketId)?.disconnect();
        }

        await execute("INSERT INTO mod_logs (admin, action, target, reason, timestamp) VALUES (?, ?, ?, ?, ?)", [admin.username, 'ban', targetUsername, reason, new Date().toISOString()]);
      }
    });

    socket.on("mod_delete_message", async (messageId) => {
      const admin = users.get(socket.id);
      if (!admin || (admin.role !== 'owner' && admin.role !== 'moderator')) return;

      await execute("DELETE FROM messages WHERE id = ?", [messageId]);
      io.emit("message_deleted", messageId);
      
      await execute("INSERT INTO mod_logs (admin, action, target, reason, timestamp) VALUES (?, ?, ?, ?, ?)", [admin.username, 'delete_message', `msg:${messageId}`, 'Suppression par modérateur', new Date().toISOString()]);
    });

    socket.on("lock_channel", async ({ channelId, lockMessage }) => {
      const user = users.get(socket.id);
      if (!user || user.role !== 'owner') return;

      await execute("UPDATE channels SET locked = ?, lock_message = ? WHERE id = ?", [true, lockMessage, channelId]);
      
      const channel = await getOne("SELECT * FROM channels WHERE id = ?", [channelId]);
      if (channel) {
        io.emit("channel_updated", channel);
      }
    });

    socket.on("unlock_channel", async (channelId) => {
      const user = users.get(socket.id);
      if (!user || user.role !== 'owner') return;

      await execute("UPDATE channels SET locked = ? WHERE id = ?", [false, channelId]);
      
      const channel = await getOne("SELECT * FROM channels WHERE id = ?", [channelId]);
      if (channel) {
        io.emit("channel_updated", channel);
      }
    });

    socket.on("update_channel_background", async ({ channelId, backgroundUrl }) => {
      const user = users.get(socket.id);
      if (!user) return;

      const channel = await getOne("SELECT * FROM channels WHERE id = ?", [channelId]);
      if (!channel) return;

      const server = await getOne("SELECT * FROM servers WHERE id = ?", [channel.server_id]);
      const isServerOwner = server && server.owner === user.username;
      const isGlobalOwner = user.role === 'owner';

      if (!isServerOwner && !isGlobalOwner) return;

      await execute("UPDATE channels SET background_url = ? WHERE id = ?", [backgroundUrl, channelId]);
      
      const updatedChannel = await getOne("SELECT * FROM channels WHERE id = ?", [channelId]);
      if (updatedChannel) {
        io.emit("channel_updated", updatedChannel);
      }
    });

    socket.on("update_channel_description", async ({ channelId, description }) => {
      const user = users.get(socket.id);
      if (!user) return;

      const channel = await getOne("SELECT * FROM channels WHERE id = ?", [channelId]);
      if (!channel) return;

      const server = await getOne("SELECT * FROM servers WHERE id = ?", [channel.server_id]);
      const isServerOwner = server && server.owner === user.username;
      const isGlobalOwner = user.role === 'owner';

      if (!isServerOwner && !isGlobalOwner) return;

      await execute("UPDATE channels SET description = ? WHERE id = ?", [description, channelId]);
      
      const updatedChannel = await getOne("SELECT * FROM channels WHERE id = ?", [channelId]);
      if (updatedChannel) {
        io.emit("channel_updated", updatedChannel);
      }
    });

    socket.on("mod_clear_channel", async (channelId) => {
      const admin = users.get(socket.id);
      if (!admin || admin.role !== 'owner') return;

      console.log(`[MOD] Clear channel requested for: ${channelId} by ${admin.username}`);
      
      await execute("DELETE FROM messages WHERE channel_id = ?", [channelId]);
      
      // Global broadcast to ensure everyone clears their view
      io.emit("messages_cleared", channelId);
      
      await execute("INSERT INTO mod_logs (admin, action, target, reason, timestamp) VALUES (?, ?, ?, ?, ?)", [admin.username, 'clear_channel', channelId, 'Nettoyage du salon', new Date().toISOString()]);
    });

    socket.on("mod_set_role", async ({ targetUsername, role }) => {
      const admin = users.get(socket.id);
      if (!admin || admin.role !== 'owner') return;
      if (role !== 'moderator' && role !== 'user') return;

      await execute("UPDATE users SET role = ? WHERE username = ?", [role, targetUsername]);
      
      // Update role in connected users map if they are online
      for (const [sid, u] of users.entries()) {
        if (u.username === targetUsername) {
          u.role = role;
          io.to(sid).emit("me", { 
            username: u.username, 
            role: u.role,
            displayName: u.displayName,
            avatar: u.avatar,
            bio: u.bio
          });
        }
      }
      
      await broadcastUserList();
      
      await execute("INSERT INTO mod_logs (admin, action, target, reason, timestamp) VALUES (?, ?, ?, ?, ?)", [admin.username, 'set_role', targetUsername, `Role set to ${role}`, new Date().toISOString()]);
    });

    socket.on("mod_toggle_large_video", async (targetUsername) => {
      const admin = users.get(socket.id);
      if (!admin || admin.role !== 'owner') return;

      const target = await getOne("SELECT can_send_large_videos FROM users WHERE username = ?", [targetUsername]);
      if (!target) return;

      const newValue = !target.can_send_large_videos;
      await execute("UPDATE users SET can_send_large_videos = ? WHERE username = ?", [newValue, targetUsername]);

      // Update online users
      for (const [sid, u] of users.entries()) {
        if (u.username === targetUsername) {
          u.canSendLargeVideos = newValue;
          io.to(sid).emit("me", { 
            username: u.username, 
            role: u.role,
            displayName: u.displayName,
            avatar: u.avatar,
            banner: u.banner,
            bio: u.bio,
            canSendLargeVideos: newValue,
            canUseGifs: u.canUseGifs
          });
        }
      }
      await broadcastUserList();
      
      await execute("INSERT INTO mod_logs (admin, action, target, reason, timestamp) VALUES (?, ?, ?, ?, ?)", [admin.username, 'toggle_large_video', targetUsername, `Large video permission set to ${newValue}`, new Date().toISOString()]);
    });

    socket.on("mod_toggle_gifs", async (targetUsername) => {
      const admin = users.get(socket.id);
      if (!admin || admin.role !== 'owner') return;

      const target = await getOne("SELECT can_use_gifs FROM users WHERE username = ?", [targetUsername]);
      if (!target) return;

      const newValue = !target.can_use_gifs;
      await execute("UPDATE users SET can_use_gifs = ? WHERE username = ?", [newValue, targetUsername]);

      // Update online users
      for (const [sid, u] of users.entries()) {
        if (u.username === targetUsername) {
          u.canUseGifs = newValue;
          io.to(sid).emit("me", { 
            username: u.username, 
            role: u.role,
            displayName: u.displayName,
            avatar: u.avatar,
            banner: u.banner,
            bio: u.bio,
            canSendLargeVideos: u.canSendLargeVideos,
            canUseGifs: newValue
          });
        }
      }
      await broadcastUserList();
      
      await execute("INSERT INTO mod_logs (admin, action, target, reason, timestamp) VALUES (?, ?, ?, ?, ?)", [admin.username, 'toggle_gifs', targetUsername, `GIF permission set to ${newValue}`, new Date().toISOString()]);
    });

    socket.on("mod_join_server", async (serverId) => {
      const admin = users.get(socket.id);
      if (!admin || admin.role !== 'owner') return;

      await execute("INSERT INTO server_members (server_id, username, timestamp) VALUES (?, ?, ?) ON CONFLICT DO NOTHING", [serverId, admin.username, new Date().toISOString()]);
      
      const userServers = await query("SELECT * FROM servers");
      socket.emit("server_list", userServers);
      const members = await query("SELECT username FROM server_members WHERE server_id = ?", [serverId]);
      socket.emit("server_members", { serverId, members: members.map((m: any) => m.username) });
      await broadcastUserList();
    });

    socket.on("mod_delete_server", async (serverId) => {
      const admin = users.get(socket.id);
      if (!admin || admin.role !== 'owner') return;
      if (serverId === 'fitcord-global') return socket.emit("error", "Impossible de supprimer le serveur global.");

      await execute("DELETE FROM messages WHERE channel_id IN (SELECT id FROM channels WHERE server_id = ?)", [serverId]);
      await execute("DELETE FROM channels WHERE server_id = ?", [serverId]);
      await execute("DELETE FROM server_members WHERE server_id = ?", [serverId]);
      await execute("DELETE FROM servers WHERE id = ?", [serverId]);
      
      io.emit("server_deleted", serverId);
      
      // Broadcast updated list to all owners and affected members
      const allServers = await query("SELECT * FROM servers");
      for (const [sid, u] of users.entries()) {
        if (u.role === 'owner') {
          io.to(sid).emit("server_list", allServers);
        } else {
          const userServers = await query(`
            SELECT s.* FROM servers s
            JOIN server_members sm ON s.id = sm.server_id
            WHERE sm.username = ?
          `, [u.username]);
          io.to(sid).emit("server_list", userServers);
        }
      }
      
      await execute("INSERT INTO mod_logs (admin, action, target, reason, timestamp) VALUES (?, ?, ?, ?, ?)", [admin.username, 'delete_server', serverId, 'Suppression par owner', new Date().toISOString()]);
    });

    socket.on("mod_delete_channel", async (channelId) => {
      const admin = users.get(socket.id);
      if (!admin || admin.role !== 'owner') return;

      const channel = await getOne("SELECT * FROM channels WHERE id = ?", [channelId]);
      if (!channel) return;

      await execute("DELETE FROM messages WHERE channel_id = ?", [channelId]);
      await execute("DELETE FROM channels WHERE id = ?", [channelId]);
      
      io.emit("channel_deleted", channelId);
      
      await execute("INSERT INTO mod_logs (admin, action, target, reason, timestamp) VALUES (?, ?, ?, ?, ?)", [admin.username, 'delete_channel', channelId, 'Suppression par owner', new Date().toISOString()]);
    });

    socket.on("update_app_logo", async (logoUrl) => {
      const user = users.get(socket.id);
      if (!user || user.role !== 'owner') return;

      await execute("INSERT INTO app_config (key, value) VALUES ('logo_url', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [logoUrl]);
      const appConfig = await getAppConfig();
      io.emit("app_config", appConfig);
    });

    socket.on("disconnect", async () => {
      const user = users.get(socket.id);
      if (user) {
        const username = user.username;
        
        // Notify others in voice channel if user was in one
        if (user.currentVoiceChannel) {
          const channelId = user.currentVoiceChannel;
          const channelSet = voiceStates.get(channelId);
          if (channelSet) {
            Array.from(channelSet).forEach((u: any) => {
              if (u.sid === socket.id) channelSet.delete(u);
            });
            io.emit("voice_state_update", { channelId, users: Array.from(channelSet) });
          }
        }

        users.delete(socket.id);
        await broadcastUserList();

        // Notify friends that this user is offline
        const friends = await query("SELECT * FROM friends WHERE user1 = ? OR user2 = ?", [username, username]);
        friends.forEach(f => {
          const friendName = f.user1 === username ? f.user2 : f.user1;
          const friendSocketId = Array.from(users.entries()).find(([id, u]) => u.username === friendName)?.[0];
          if (friendSocketId) {
            io.to(friendSocketId).emit("friend_status_update", { username, status: 'offline' });
          }
        });
      }
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => res.sendFile(path.join(process.cwd(), "dist", "index.html")));
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    // Heartbeat for user list
    setInterval(() => {
      broadcastUserList();
    }, 30000);
  });
  } catch (error) {
    console.error("[SERVER_FATAL] Error during startup:", error);
    process.exit(1);
  }
}

startServer();
