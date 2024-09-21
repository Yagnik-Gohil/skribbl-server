import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { ChatService } from "./chat.service";

const app = express();
const corsOptions = {
  origin: "http://localhost:5173", // Frontend URL
  methods: ["GET", "POST"],
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is live");
});

app.get("/room/:id", (req, res) => {
  const data = chatService.getRoomDetails(req.params.id);
  res.status(200).json({
    status: 1,
    message: data ? "Room Found Successfully" : "Room not found!",
    data: data ? data : {},
  });
});

// Create an HTTP server
const server = createServer(app);

// Initialize Socket.IO with the HTTP server
const io = new Server(server, { cors: corsOptions });

const chatService = new ChatService();

server.listen(3000, () => {
  console.log("Server running on port 3000");
});

// Handle Socket.IO connections
io.on("connection", (socket: Socket) => {
  // Handle Join
  socket.on("join", (data: IUser) => {
    // Store user data in Object
    chatService.joinRoom(data, socket.id);
    // Join Room
    socket.join(data.room);
    // Broadcast
    socket.broadcast.to(data.room).emit("joined", data);
  });

  // Handle Leave
  socket.on("leave", (data: IUser) => {
    // Remove user data in Object
    chatService.leaveRoom(data, socket.id);
    // Leave Room
    socket.leave(data.room);
    // Broadcast
    socket.broadcast.to(data.room).emit("left", data);
  });

  // Handle Typing
  socket.on("typing", (data: ITyping) => {
    socket.broadcast
      .to(data.room)
      .emit("typing", { user: data.user, typing: data.typing });
  });

  // Handle Message
  socket.on("send", (data: ISend) => {
    socket.broadcast.to(data.room).emit("receive", {
      user: data.user,
      message: data.message,
    });
  });

  // Handle Game Configurations
  socket.on("configuration", (data: IConfiguration) => {
    chatService.updateGameConfiguration(data);

    socket.broadcast
      .to(data.room)
      .emit("configuration", { configuration: data });
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    chatService.handleDisconnect(socket.id);
  });
});
