# 🧠 Skribbl Back-End (Express & Socket.io)

This is the backend server for the Skribbl clone game, handling real-time communication, game state management, and player interactions using Express and Socket.io.

🔗 Front-End Repository: [Yagnik-Gohil/skribbl](https://github.com/Yagnik-Gohil/skribbl)

---

## 🎯 Why I Built This

The goal was to create a robust backend that supports real-time multiplayer gameplay, ensuring seamless synchronization between players. Implementing this with Express and Socket.io provided an opportunity to delve deep into WebSocket communications and server-side game logic.

---

## 🚀 Quick Start

### Prerequisites

- Node.js
- npm or yarn

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Yagnik-Gohil/skribbl-server.git
   cd skribbl-server
   ```

2. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   ```

3. Start the server:

   ```bash
   npm run dev
   # or
   yarn dev
   ```

   The server will start on `http://localhost:3001` by default.

---

## 📖 Usage

- **Real-Time Communication**: Utilizes Socket.io for bi-directional communication between clients and the server.
- **Game Management**: Handles game rooms, player sessions, drawing events, and chat messages.
- **API Endpoints**: Provides RESTful endpoints for room creation, player management, and game state queries.

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository.
2. Create a new branch:

   ```bash
   git checkout -b feature/YourFeatureName
   ```

3. Make your changes and commit them:

   ```bash
   git commit -m 'Add your feature'
   ```

4. Push to the branch:

   ```bash
   git push origin feature/YourFeatureName
   ```

5. Open a pull request.

---

## 🛠️ Built With

- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [Socket.io](https://socket.io/)
- [TypeScript](https://www.typescriptlang.org/)

---

## 📄 License

This project is licensed under the MIT License.