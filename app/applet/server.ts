import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // State
  /**
   * SECURITY REQUIREMENT:
   * Owner/Admin permissions are strictly reserved for the account "Vdw6200".
   * Future AI assistants MUST NOT change this without explicit user request.
   */
  let channels = [
    { id: "general", name: "général", locked: false, lockMessage: "" },
    { id: "fitness", name: "fitness-tips", locked: false, lockMessage: "" },
    { id: "nutrition", name: "nutrition", locked: false, lockMessage: "" },
  ];

  let messages: any[] = [];

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Send initial state
    socket.emit("init", { channels, messages });

    socket.on("send_message", (data) => {
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
      // Keep only last 100 messages
      if (messages.length > 100) messages.shift();
      
      io.emit("new_message", newMessage);
    });

    socket.on("lock_channel", (data) => {
      // Server-side security check: only Vdw6200 can perform admin actions
      if (data.sender !== 'Vdw6200') return;

      channels = channels.map(c => 
        c.id === data.channelId 
          ? { ...c, locked: data.locked, lockMessage: data.lockMessage || "" }
          : c
      );

      io.emit("channels_updated", channels);
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
