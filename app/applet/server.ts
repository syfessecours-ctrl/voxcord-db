import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Configuration
const supabaseUrl = process.env.DATABASE_URL;
const supabaseKey = process.env.DATABASE_KEY;

let supabase: any = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log("[DB] Supabase client initialized via DATABASE_URL.");
} else {
  console.log("[DB] Supabase credentials missing (DATABASE_URL/DATABASE_KEY). Using in-memory storage.");
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // Initial State (In-memory fallback)
  let channels = [
    { id: "general", name: "général", locked: false, lockMessage: "", backgroundUrl: "", iconUrl: "https://picsum.photos/seed/fitcord-gen/200" },
    { id: "fitness", name: "fitness-tips", locked: false, lockMessage: "", backgroundUrl: "", iconUrl: "https://picsum.photos/seed/fitcord-fit/200" },
    { id: "nutrition", name: "nutrition", locked: false, lockMessage: "", backgroundUrl: "", iconUrl: "https://picsum.photos/seed/fitcord-nut/200" },
  ];

  let messages: any[] = [];
  let users: Record<string, any> = {}; // Track user profiles by pseudo
  let serverConfig = {
    logoUrl: "" // Empty means use default FC logo
  };

  const SUNNY_IMAGES = [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1506929199175-60903ee8b5a8?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1544735030-c567536e7267?w=200&h=200&fit=crop"
  ];

  // Load initial state from Supabase if available
  if (supabase) {
    try {
      const { data: dbChannels, error: channelsError } = await supabase
        .from('channels')
        .select('*');
      
      if (!channelsError && dbChannels && dbChannels.length > 0) {
        channels = dbChannels;
      }

      const { data: dbMessages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);
      
      if (!messagesError && dbMessages) {
        messages = dbMessages.reverse();
      }

      const { data: dbConfig, error: configError } = await supabase
        .from('config')
        .select('*')
        .single();
      
      if (!configError && dbConfig) {
        serverConfig = dbConfig;
      }
    } catch (err) {
      console.error("[DB] Error loading initial state:", err);
    }
  }

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("user_join", (data) => {
      const { pseudo } = data;
      if (!users[pseudo]) {
        users[pseudo] = {
          pseudo,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${pseudo}`,
          title: pseudo === 'Vdw6200' ? "Légende & Fondateur" : "Membre",
          status: "En ligne",
          isAdmin: pseudo === 'Vdw6200',
          lastSeen: new Date().toISOString()
        };
      }
      socket.data.pseudo = pseudo;
      io.emit("users_updated", Object.values(users));
      // Send initial state
      socket.emit("init", { channels, messages, serverConfig, users: Object.values(users) });
    });

    socket.on("update_user_profile", (data) => {
      const { pseudo, updates } = data;
      if (users[pseudo]) {
        users[pseudo] = { ...users[pseudo], ...updates };
        io.emit("users_updated", Object.values(users));
      }
    });

    socket.on("send_message", async (data) => {
      const channel = channels.find(c => c.id === data.channelId);
      
      // Server-side security check: only Vdw6200 can be admin
      const isActualAdmin = data.sender === 'Vdw6200';
      
      if (channel && channel.locked && !isActualAdmin) {
        return; // Prevent non-admins from sending to locked channels
      }

      const newMessage = {
        id: Date.now().toString(),
        ...data,
        isAdmin: isActualAdmin, // Override with server-side truth
        timestamp: new Date().toISOString(),
      };

      messages.push(newMessage);
      if (messages.length > 100) messages.shift();
      
      io.emit("new_message", newMessage);

      // Persist to Supabase
      if (supabase) {
        try {
          await supabase.from('messages').insert([newMessage]);
        } catch (err) {
          console.error("[DB] Error persisting message:", err);
        }
      }
    });

    socket.on("lock_channel", async (data) => {
      // Server-side security check: only Vdw6200 can perform admin actions
      if (data.sender !== 'Vdw6200') return;

      channels = channels.map(c => 
        c.id === data.channelId 
          ? { ...c, locked: data.locked, lockMessage: data.lockMessage || "", backgroundUrl: data.backgroundUrl ?? c.backgroundUrl }
          : c
      );

      io.emit("channels_updated", channels);

      // Persist to Supabase
      if (supabase) {
        try {
          const updatedChannel = channels.find(c => c.id === data.channelId);
          if (updatedChannel) {
            await supabase
              .from('channels')
              .upsert([updatedChannel]);
          }
        } catch (err) {
          console.error("[DB] Error persisting channel update:", err);
        }
      }
    });

    socket.on("update_channel", async (data) => {
      // Server-side security check: only Vdw6200 can perform admin actions
      if (data.sender !== 'Vdw6200') return;

      channels = channels.map(c => 
        c.id === data.channelId 
          ? { ...c, ...data.updates }
          : c
      );

      io.emit("channels_updated", channels);

      if (supabase) {
        try {
          const updatedChannel = channels.find(c => c.id === data.channelId);
          if (updatedChannel) {
            await supabase.from('channels').upsert([updatedChannel]);
          }
        } catch (err) {
          console.error("[DB] Error persisting channel update:", err);
        }
      }
    });

    socket.on("create_channel", async (data) => {
      // Server-side security check: only Vdw6200 can create channels
      if (data.sender !== 'Vdw6200') return;

      const randomIcon = SUNNY_IMAGES[Math.floor(Math.random() * SUNNY_IMAGES.length)];

      const newChannel = {
        id: data.name.toLowerCase().replace(/\s+/g, '-'),
        name: data.name,
        locked: false,
        lockMessage: "",
        backgroundUrl: "",
        iconUrl: randomIcon
      };

      // Avoid duplicates
      if (!channels.find(c => c.id === newChannel.id)) {
        channels.push(newChannel);
        io.emit("channels_updated", channels);

        // Persist to Supabase
        if (supabase) {
          try {
            await supabase.from('channels').insert([newChannel]);
          } catch (err) {
            console.error("[DB] Error persisting new channel:", err);
          }
        }
      }
    });

    socket.on("update_server_config", async (data) => {
      // Server-side security check: only Vdw6200 can update config
      if (data.sender !== 'Vdw6200') return;

      serverConfig = { ...serverConfig, ...data.config };
      io.emit("config_updated", serverConfig);

      // Persist to Supabase
      if (supabase) {
        try {
          await supabase.from('config').upsert([{ id: 1, ...serverConfig }]);
        } catch (err) {
          console.error("[DB] Error persisting config:", err);
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
