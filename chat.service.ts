export class ChatService {
  private room: Record<
    string,
    { users: Record<string, IUser>; gameState: IGameState }
  > = {};
  private clientRooms: Record<string, string> = {}; // Now only one room per client

  // Helper function to create default game state
  private createDefaultGameState(): IGameState {
    return {
      status: "lobby",
      players: [],
      currentTurn: 0,
      word: null,
      drawTime: 60,
      hints: 2,
      rounds: 3,
      currentRound: 0,
      wordCount: 3,
      wordMode: "normal",
    };
  }

  handleDisconnect(clientId: string) {
    const roomId = this.clientRooms[clientId];

    if (roomId && this.room[roomId]) {
      // Remove the user from the room
      delete this.room[roomId].users[clientId];

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

      // If no users remain in the room, clean up the room
      if (Object.keys(this.room[roomId].users).length === 0) {
        delete this.room[roomId]; // Room cleanup
      }
    }

    // Remove the client from clientRooms tracking
    delete this.clientRooms[clientId];
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
      };
    }

    // Add user to the room
    this.room[roomId].users[clientId] = user;

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
      // Remove the user from the room
      delete this.room[roomId].users[clientId];

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

    // Optionally, log the updated game state to ensure the update took place
    console.log(`Updated game state for room ${roomId}:`, gameState);
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

  getGameState(roomId: string) {
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

  // Method to get the list of members in a room
  getRoomMembers(roomId: string): IUser[] {
    if (!this.room[roomId]) {
      return [];
    }

    // Return an array of users from the room's `users` object
    return Object.values(this.room[roomId].users);
  }

  logRoom() {
    console.log(this.room);
    return this.room;
  }
}
