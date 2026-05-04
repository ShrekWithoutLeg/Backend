import express   from "express"
import { createServer } from 'http'
import cors from 'cors'
import 'dotenv/config'

import { Server } from 'socket.io'


const app = express()
const port = process.env.PORT || 4000

app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST"]
}))

const server = createServer(app)

const io = new Server(server, {
    cors: {

        origin: process.env.CLIENT_URL,

        credentials: true,

        methods: ["GET", "POST"]

    }
})

io.on('connection', (socket) => {
    let user = "Unknown"
    let roomName = ''
     

    socket.on("username", (username) => {
        user = username


    })

    // joins room
    socket.on("join-room", (room) => {
        socket.join(room)
        socket.to(room).emit("newuser", `${user} `)
        roomName = room

        const roomData = io.of("/").adapter.rooms.get(room)
        const totalPeople = roomData ? roomData.size : 0

         
        io.to(room).emit("room-count", { count: totalPeople })

        console.log("total people" ,totalPeople )

    })



    // handle message form room

    socket.on("message", (data) => {

        io.to(data.roomName).emit("recived-message", { message: data.message, senderID: data.senderID, sender: data.sender })
    })

    // ON disconnect
    socket.on("disconnect", () => {
        socket.to(roomName).emit("user-left", user)
        socket.emit("user-detail-left", {
            name: user,
            roomName: roomName,
            status: "offline"
        })
         const roomData = io.of("/").adapter.rooms.get(roomName)
         const totalPeople = roomData ? roomData.size : 0
         io.to(roomName).emit("room-count", { count: totalPeople })
    })
})

app.get('/', (req, res) => {
    res.send('Hello World!')
})
app.get('/chk', (req, res) => {
    res.send('Hello World!')
})
app.post('/chk', (req, res) => {
   res.send("yyep")
})
 

server.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
