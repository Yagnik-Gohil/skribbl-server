import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { ChatService } from "./chat.service";

const app = express();
const corsOptions = {
  origin: "*", // Frontend URL
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
    console.log("join");
    // Store user data in Object
    chatService.joinRoom(data, socket.id);
    // Join Room
    socket.join(data.room);

    // Get updated room members list
    const roomMembers = chatService.getRoomMembers(data.room);

    // Get current Game state
    const gameState = chatService.getGameState(data.room);

    // Get current Turn User
    const currentTurn = chatService.getCurrentPlayerByRoomId(data.room);

    // Emit the "joined" event to **everyone**, including the user who just joined
    io.to(data.room).emit("joined", {
      user: data,
      members: roomMembers,
      gameState: gameState,
      currentTurn: currentTurn,
    });
  });

  // Handle Typing
  socket.on("typing", (data: ITyping) => {
    console.log("typing");
    socket.broadcast
      .to(data.room)
      .emit("typing", { user: data.user, typing: data.typing });
  });

  // Handle Message
  socket.on("send", (data: ISend) => {
    console.log("send");
    socket.broadcast.to(data.room).emit("receive", {
      user: data.user,
      message: data.message,
    });
  });

  // Handle Word Guessed Message
  socket.on("word-guessed", (data: IUser) => {
    console.log("word-guessed");
    socket.broadcast.to(data.room).emit("word-guessed", data);
  });

  // Handle Game Configurations
  socket.on("update-configuration", (data: IConfiguration) => {
    console.log("update-configuration");
    chatService.updateGameConfiguration(data);
    socket.broadcast.to(data.room).emit("configuration-updated", data);
  });

  socket.on("word-selection", (user: IUser) => {
    console.log("word-selection");
    chatService.updateGameStatus(user.room, "word-selection");
    chatService.incrementCurrentRound(user.room);

    // Get current Game state
    const gameState = chatService.getGameState(user.room);

    io.to(user.room).emit("word-selection", {
      currentTurn: user,
      gameState: gameState,
      list: ["apple", "banana shake", "cat and dog"],
    });
  });

  socket.on("word-selected", (data: IWordSelected) => {
    console.log("word-selected");
    chatService.updateGameStatus(data.currentTurn.room, "live");
    chatService.updateGameWord(data.currentTurn.room, data.word);
    io.to(data.currentTurn.room).emit("game-started", data);
  });

  // Handle Leave
  socket.on("leave", (data: IUser) => {
    console.log("leave");
    // Remove user data in Object
    chatService.leaveRoom(socket.id);
    // Leave Room
    socket.leave(data.room);

    // Get updated room members list
    const roomMembers = chatService.getRoomMembers(data.room);

    // Get current Game state
    const gameState = chatService.getGameState(data.room);

    // Get current Turn User
    const currentTurn = chatService.getCurrentPlayerByRoomId(data.room);

    // Broadcast
    socket.broadcast.to(data.room).emit("left", {
      user: data,
      members: roomMembers,
      gameState: gameState,
      currentTurn: currentTurn,
    });
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("disconnect");
    // Get room id before disconnect.
    const data = chatService.getUserByClientId(socket.id);
    // Remove user data in Object
    chatService.leaveRoom(socket.id);

    if (data) {
      // Leave Room
      socket.leave(data.room);

      // Get updated room members list
      const roomMembers = chatService.getRoomMembers(data.room);

      // Get current Game state
      const gameState = chatService.getGameState(data.room);

      // Get current Turn User
      const currentTurn = chatService.getCurrentPlayerByRoomId(data.room);

      // Broadcast
      socket.broadcast.to(data.room).emit("left", {
        user: data,
        members: roomMembers,
        gameState: gameState,
        currentTurn: currentTurn,
      });
    }
  });
});
