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
    { id: "general", name: "général", locked: false, lockMessage: "", backgroundUrl: "" },
    { id: "fitness", name: "fitness-tips", locked: false, lockMessage: "", backgroundUrl: "" },
    { id: "nutrition", name: "nutrition", locked: false, lockMessage: "", backgroundUrl: "" },
  ];

  let messages: any[] = [];
  let serverConfig = {
    logoUrl: "" // Empty means use default FC logo
  };

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

    // Send initial state
    socket.emit("init", { channels, messages, serverConfig });

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

      const newChannel = {
        id: data.name.toLowerCase().replace(/\s+/g, '-'),
        name: data.name,
        locked: false,
        lockMessage: "",
        backgroundUrl: ""
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
