export class ChatService {
  private room: Record<
    string,
    {
      users: Record<string, IUser>;
      gameState: IGameState;
      leaderBoard: Record<string, number>;
    }
  > = {};
  private clientRooms: Record<string, string> = {}; // Now only one room per client

  // Helper function to create default game state
  private createDefaultGameState(): IGameState {
    return {
      status: "lobby",
      players: [],
      currentTurn: 0,
      word: "Random Word",
      startTime: null,
      drawTime: 60,
      hints: 2,
      rounds: 3,
      currentRound: 0,
      wordCount: 3,
      wordMode: "normal",
    };
  }

  async joinRoom(user: IUser, clientId: string) {
    const roomId = user.room;

    // Check if the client is already in a room and handle room switching
    const previousRoom = this.clientRooms[clientId];
    if (previousRoom && previousRoom !== roomId) {
      // Leave the previous room before joining a new one
      await this.leaveRoom(clientId);
    }

    // Initialize room if it doesn't exist
    if (!this.room[roomId]) {
      this.room[roomId] = {
        users: {},
        gameState: this.createDefaultGameState(),
        leaderBoard: {},
      };
    }

    // Add user to the room
    this.room[roomId].users[clientId] = user;
    // set Current Score to 0
    this.room[roomId].leaderBoard[clientId] = 0;

    // If the user is the admin, set the game state (if it's not already initialized)
    if (user.admin) {
      this.room[roomId].gameState = this.createDefaultGameState();
    }

    // Add clientId to the list of players if they're not already in it
    if (!this.room[roomId].gameState.players.includes(clientId)) {
      this.room[roomId].gameState.players.push(clientId);
    }

    // Track which room the client is part of (only one room now)
    this.clientRooms[clientId] = roomId;
  }

  async leaveRoom(clientId: string) {
    const roomId = this.clientRooms[clientId];

    if (roomId && this.room[roomId]) {
      const room = this.room[roomId];
      const userLeaving = room.users[clientId];

      // Check if the user leaving is the admin
      const isLeavingAdmin = userLeaving?.admin;

      // Remove the user from the room
      delete this.room[roomId].users[clientId];
      // Remove the user score from the leaderBoard
      delete this.room[roomId].leaderBoard[clientId];

      // Remove the user from the gameState.players list
      const players = this.room[roomId].gameState.players;
      this.room[roomId].gameState.players = players.filter(
        (id) => id !== clientId
      );

      // Handle if the player was in turn
      const currentTurn = this.room[roomId].gameState.currentTurn;
      if (players[currentTurn] === clientId) {
        this.room[roomId].gameState.currentTurn =
          this.room[roomId].gameState.players.length > 0
            ? this.room[roomId].gameState.currentTurn %
              this.room[roomId].gameState.players.length
            : 0;
      }

      // If the leaving player was the admin, assign a new admin
      if (isLeavingAdmin && Object.keys(this.room[roomId].users).length > 0) {
        // Get the first available user to make admin
        const newAdminId = Object.keys(this.room[roomId].users)[0];
        this.room[roomId].users[newAdminId].admin = true;
      }

      // If no players remain in the room, clean up the room
      if (Object.keys(this.room[roomId].users).length === 0) {
        delete this.room[roomId]; // Room cleanup
      }
    }

    // Remove the room from the clientRooms tracking (since there's only one room per client)
    delete this.clientRooms[clientId];
  }

  async updateGameConfiguration(configuration: IConfiguration) {
    const roomId = configuration.room;

    // Ensure the room exists in your room data structure
    if (!this.room[roomId]) {
      console.error(`Room ${roomId} not found`);
      return;
    }

    // Update the game state for the specific room
    const gameState = this.room[roomId].gameState;

    // Apply the new configuration to the game state
    gameState.drawTime = configuration.drawTime;
    gameState.hints = configuration.hints;
    gameState.rounds = configuration.rounds;
    gameState.wordCount = configuration.wordCount;
    gameState.wordMode = configuration.wordMode;
  }

  async updateGameStatus(roomId: string, status: STATUS) {
    // Ensure the room exists in your room data structure
    if (!this.room[roomId]) {
      console.error(`Room ${roomId} not found`);
      return;
    }

    // Update the game state for the specific room
    const gameState = this.room[roomId].gameState;

    // Apply the new configuration to the game state
    gameState.status = status;

    if (status == "word-selection") {
      // Reset the leader-board by clearing the entries
      this.room[roomId].leaderBoard = {};
    }
  }

  async incrementCurrentRound(roomId) {
    // Ensure the room exists in your room data structure
    if (!this.room[roomId]) {
      console.error(`Room ${roomId} not found`);
      return;
    }

    // Update the game state for the specific room
    const gameState = this.room[roomId].gameState;

    // Apply the new configuration to the game state
    gameState.currentRound += 1;
  }

  async updateGameWord(roomId: string, word: string) {
    // Ensure the room exists in your room data structure
    if (!this.room[roomId]) {
      console.error(`Room ${roomId} not found`);
      return;
    }

    // Update the game state for the specific room
    const gameState = this.room[roomId].gameState;

    // Apply the new configuration to the game state
    gameState.word = word;
  }

  async updateGameStartTime(roomId: string, startTime: number) {
    // Ensure the room exists in your room data structure
    if (!this.room[roomId]) {
      console.error(`Room ${roomId} not found`);
      return;
    }

    // Update the game state for the specific room
    const gameState = this.room[roomId].gameState;

    // Apply the new configuration to the game state
    gameState.startTime = startTime;
  }

  async updateLeaderBoard(clientId: string, user: IUser) {
    const roomId = user.room;
    // Ensure the room exists in your room data structure
    if (!this.room[roomId]) {
      console.error(`Room ${roomId} not found`);
      return;
    }

    const startTime = this.room[roomId].gameState.startTime;
    const currentTime = Date.now();

    // Calculate the score based on how quickly the word was guessed
    const timeTaken = (currentTime - startTime) / 1000; // Time in seconds
    const maxScore = 100; // Maximum score for guessing quickly
    const score = Math.max(0, maxScore - Math.floor(timeTaken)); // Decrease score based on time

    this.room[roomId].leaderBoard[clientId] = score;
    this.room[roomId].users[clientId].score += score;
  }

  getGameState(roomId: string) {
    const room = this.room[roomId];
    if (!room) {
      console.error(`Room ${roomId} not found`);
      return null;
    }
    return this.room[roomId].gameState;
  }

  getUserByClientId(clientId: string): IUser | null {
    const roomId = this.clientRooms[clientId]; // Now should only be a single room

    if (!roomId) {
      console.error(`Client ${clientId} is not in any room`);
      return null;
    }

    const room = this.room[roomId];
    if (!room) {
      console.error(`Room ${roomId} not found for client ${clientId}`);
      return null;
    }

    const user = room.users[clientId];
    if (!user) {
      console.error(`User ${clientId} not found in room ${roomId}`);
      return null;
    }

    return user;
  }

  getRoomDetails(room: string) {
    return this.room[room];
  }

  getCurrentPlayerByRoomId(roomId: string) {
    const room = this.room[roomId];

    // Check if the room exists and has users and gameState
    if (room && room.users && room.gameState) {
      const { players, currentTurn } = room.gameState;

      // Get the player's socket ID by currentTurn index
      const currentPlayerId = players[currentTurn];

      // Return the user object if it exists
      if (currentPlayerId && room.users[currentPlayerId]) {
        return room.users[currentPlayerId];
      }
    }

    // If room, users, or currentPlayerId doesn't exist, return null
    return null;
  }

  getNextPlayerByRoomId(roomId: string) {
    const room = this.room[roomId];

    // Check if the room exists and has users and gameState
    if (room && room.users && room.gameState) {
      const { players, currentTurn } = room.gameState;

      // Ensure players exist and there is more than 1 player
      if (players && players.length > 0) {
        // Calculate the index of the next player (wrap around using modulo)
        const nextTurn = (currentTurn + 1) % players.length;

        // Get the next player's socket ID by nextTurn index
        const nextPlayerId = players[nextTurn];

        // Update the currentTurn to the nextTurn
        room.gameState.currentTurn = nextTurn;

        // Return the next user object if it exists
        if (nextPlayerId && room.users[nextPlayerId]) {
          return room.users[nextPlayerId];
        }
      }
    }

    // If room, users, or nextPlayerId doesn't exist, return null
    return null;
  }

  getLeaderBoard(roomId: string): ILeaderBoard[] {
    // Check if the room exists
    if (!this.room[roomId]) {
      return [];
    }

    const room = this.room[roomId];
    const leaderBoard = room.leaderBoard;
    const users = room.users;

    // Extract the leader board entries and sort them by score in descending order
    const sortedLeaderBoard = Object.entries(leaderBoard)
      .map(([userId, score]) => ({
        id: users[userId]?.id,
        name: users[userId]?.name || "Unknown", // Fallback in case user object is missing
        score: score,
        emoji: users[userId]?.emoji || "", // Use emoji from the user object if available
      }))
      .sort((a, b) => b.score - a.score); // Sort by score in descending order

    return sortedLeaderBoard;
  }

  // Method to get the list of members in a room
  getRoomMembers(roomId: string, isResult: boolean = false): IUser[] {
    if (!this.room[roomId]) {
      return [];
    }

    const users = Object.values(this.room[roomId].users);

    // If isResult is true, return users sorted by their score in descending order
    if (isResult) {
      return users.sort((a, b) => b.score - a.score);
    }

    // Return the list of users without sorting if isResult is false
    return users;
  }

  logRoom() {
    console.log(this.room);
    return this.room;
  }
}
