import express from "express";
import { createServer } from "http";
import cors from "cors";
import "dotenv/config";
import Redis from "ioredis";
import { Server } from "socket.io";
 

const app = express();
app.use(express.json());
const redis = new Redis({ url: process.env.REDIS_URL });
const port = process.env.PORT || 4000;

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST"],
  }),
);

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,

    credentials: true,

    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  let user = "Unknown";
  let roomName = "";

  socket.on("username", (username) => {
    user = username;
  });

  // joins room
  socket.on("join-room", (room) => {
    socket.join(room);
    socket.to(room).emit("newuser", `${user} `);
    roomName = room;

    const roomData = io.of("/").adapter.rooms.get(room);
    const totalPeople = roomData ? roomData.size : 0;

    io.to(room).emit("room-count", { count: totalPeople });
  });

  // handle message form room

  socket.on("message", async (data) => {
    io.to(data.roomName).emit("recived-message", {
      message: data.message,
      senderID: data.senderID,
      sender: data.sender,
    });


      await redis.rpush(`messages:${data.roomName}`, JSON.stringify(data));
  });

  // ON disconnect
  socket.on("disconnect", async () => {
    socket.to(roomName).emit("user-left", user);
    socket.emit("user-detail-left", {
      name: user,
      roomName: roomName,
      status: "offline",
    });
    const roomData = io.of("/").adapter.rooms.get(roomName);
    const totalPeople = roomData ? roomData.size : 0;
    io.to(roomName).emit("room-count", { count: totalPeople });
    if (totalPeople === 0) {
      await redis.del(`messages:${roomName}`);
    }
  });
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});
app.get("/get_messages", async (req, res) => {
  let raw = await redis.lrange(`messages:${req.query.room}`, 0, -1);
  
   
  res.json({
    message:  raw.map(m=> JSON.parse(m))
   
  });
});

app.get("/del", async (req, res) => {
  await redis.del(`messages:${req.query.room}`);
  res.json({ message: "messages deleted" });
});

app.post("/chk", (req, res) => {
  res.send("Server running");
});

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
