export class ChatService {
  // private room: Record<string, Record<string, IUser>> = {};
  private room: Record<
    string,
    { users: Record<string, IUser>; gameState: IGameState }
  > = {};
  private clientRooms: Record<string, string[]> = {};

  // Helper function to create default game state
  private createDefaultGameState(): IGameState {
    return {
      isGameStarted: false,
      players: [],
      currentTurn: 0,
      word: null,
      drawTime: 60,
      hints: 2,
      rounds: 3,
      wordCount: 3,
      wordMode: "normal",
    };
  }

  handleDisconnect(clientId: string) {
    const clientRooms = this.clientRooms[clientId] || [];

    clientRooms.forEach((roomId) => {
      if (this.room[roomId]) {
        // Remove the user from the room
        if (this.room[roomId].users[clientId]) {
          delete this.room[roomId].users[clientId];

          // Remove the user from the gameState.players list
          const players = this.room[roomId].gameState.players;
          this.room[roomId].gameState.players = players.filter(
            (id) => id !== clientId
          );

          // Handle if the player was in turn
          const currentTurn = this.room[roomId].gameState.currentTurn;
          if (players[currentTurn] === clientId) {
            // Adjust the current turn to the next player (if any players remain)
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
      }
    });

    // Remove the client from clientRooms tracking
    delete this.clientRooms[clientId];
  }

  async joinRoom(user: IUser, clientId: string) {
    const roomId = user.room;

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

    // Track which rooms the client is part of
    this.clientRooms[clientId] ??= [];
    if (!this.clientRooms[clientId].includes(roomId)) {
      this.clientRooms[clientId].push(roomId);
    }
  }

  async leaveRoom(user: IUser, clientId: string) {
    const roomId = user.room;

    if (this.room[roomId]) {
      // Remove the user from the room
      if (this.room[roomId].users[clientId]) {
        delete this.room[roomId].users[clientId];

        // Remove the user from the gameState.players list
        const players = this.room[roomId].gameState.players;
        this.room[roomId].gameState.players = players.filter(
          (id) => id !== clientId
        );

        // Handle if the player was in turn
        const currentTurn = this.room[roomId].gameState.currentTurn;
        if (players[currentTurn] === clientId) {
          // Adjust the current turn to the next player (if any players remain)
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
    }

    // Remove the room from the clientRooms tracking
    this.clientRooms[clientId] = this.clientRooms[clientId]?.filter(
      (id) => id !== roomId
    );

    // Clean up clientRooms if empty
    if (this.clientRooms[clientId]?.length === 0) {
      delete this.clientRooms[clientId];
    }
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
    gameState.isGameStarted = configuration.isGameStarted;
    gameState.drawTime = configuration.drawTime;
    gameState.hints = configuration.hints;
    gameState.rounds = configuration.rounds;
    gameState.wordCount = configuration.wordCount;
    gameState.wordMode = configuration.wordMode;

    // Optionally, log the updated game state to ensure the update took place
    console.log(`Updated game state for room ${roomId}:`, gameState);
  }

  getRoomDetails(room: string) {
    return this.room[room];
  }

  logRoom() {
    console.log(this.room);
    return this.room;
  }
}
