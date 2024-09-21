type WORD_MODE = "normal" | "hidden" | "both";
interface IUser {
  id: string;
  room: string;
  admin: boolean;
  name: string;
  score: number;
}
interface ISend {
  room: string;
  user: IUser;
  message: string;
}

interface ITyping {
  room: string;
  user: IUser;
  typing: boolean;
}

interface IGameState {
  isGameStarted: boolean;
  players: string[]; // Array of clientIds
  currentTurn: number;
  word: string | null;
  drawTime: number;
  rounds: number;
  wordMode: WORD_MODE;
  wordCount: number;
  hints: number;
}

interface IConfiguration {
  room: string;
  isGameStarted: boolean;
  drawTime: number;
  hints: number;
  rounds: number;
  wordCount: number;
  wordMode: WORD_MODE;
}
