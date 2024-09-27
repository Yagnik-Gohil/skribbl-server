import express from "express";
import cors from "cors";
import * as schedule from "node-schedule";
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
    const roomMembers = chatService.getRoomMembers(user.room);

    io.to(user.room).emit("word-selection", {
      currentTurn: user,
      gameState: gameState,
      roomMembers: roomMembers,
    });
  });

  socket.on("word-selected", (data: IWordSelected) => {
    console.log("word-selected");

    // Update game status and word in your chat service
    chatService.updateGameStatus(data.currentTurn.room, "live");
    chatService.updateGameWord(data.currentTurn.room, data.word);

    // Emit "game-started" event to the room
    io.to(data.currentTurn.room).emit("game-started", data);

    const startTime = Date.now();
    chatService.updateGameStartTime(data.currentTurn.room, startTime);

    // Retrieve the game state to access the drawTime
    const gameState = chatService.getGameState(data.currentTurn.room);

    // Schedule the "leader-board" and "next-round" events based on the drawTime
    if (gameState && gameState.drawTime) {
      // Convert drawTime (seconds) to milliseconds
      const drawTimeInMilliseconds = gameState.drawTime * 1000;

      // Schedule the "leader-board" event
      const leaderBoardTime = startTime + drawTimeInMilliseconds;
      schedule.scheduleJob(leaderBoardTime, () => {
        console.log("leader-board");
        const leaderBoard = chatService.getLeaderBoard(data.currentTurn.room);
        io.to(data.currentTurn.room).emit("leader-board", leaderBoard);
      });

      // Schedule the "next-round" event 10 seconds after the "leader-board" event
      const nextRoundTime = leaderBoardTime + 10 * 1000; // Add 10 seconds
      schedule.scheduleJob(nextRoundTime, () => {
        console.log("next-round");

        const gameState = chatService.getGameState(data.currentTurn.room);

        if (gameState.currentRound < gameState.rounds) {
          chatService.updateGameStatus(data.currentTurn.room, "word-selection");
          chatService.incrementCurrentRound(data.currentTurn.room);

          // Get current Game state
          const gameState = chatService.getGameState(data.currentTurn.room);
          const roomMembers = chatService.getRoomMembers(data.currentTurn.room);

          io.to(data.currentTurn.room).emit("word-selection", {
            currentTurn: chatService.getNextPlayerByRoomId(
              data.currentTurn.room
            ),
            gameState: gameState,
            roomMembers: roomMembers,
          });
        } else {
          chatService.updateGameStatus(data.currentTurn.room, "lobby");

          const roomMembers = chatService.getRoomMembers(data.currentTurn.room, true);

          io.to(data.currentTurn.room).emit("result", roomMembers);
        }
      });
    }
  });

  // Handle Word Guessed Message
  socket.on("word-guessed", (user: IUser) => {
    console.log("word-guessed");

    // update leader-board here
    chatService.updateLeaderBoard(socket.id, user);

    socket.broadcast.to(user.room).emit("word-guessed", user);
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
