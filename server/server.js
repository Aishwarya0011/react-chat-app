const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.get("/", (_req, res) => res.send("Chat server is running"));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const history = []; // in-memory message store

io.on("connection", (socket) => {
  console.log("client connected:", socket.id);
  socket.emit("chat:history", history);

  // publish: client sends a message, server broadcasts to everyone
  socket.on("chat:message", (msg) => {
    if (!msg || typeof msg.text !== "string" || !msg.text.trim()) return;
    const clean = {
      id: String(msg.id),
      user: String(msg.user),
      text: msg.text.slice(0, 1000),
      likes: 0,
      time: msg.time,
    };
    history.push(clean);
    io.emit("chat:message", clean);
  });

  socket.on("chat:like", (id) => {
    const m = history.find((x) => x.id === id);
    if (!m) return;
    m.likes += 1;
    io.emit("chat:likes", { id, likes: m.likes });
  });

  socket.on("disconnect", () => console.log("client disconnected:", socket.id));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
