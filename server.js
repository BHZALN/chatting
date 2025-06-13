const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const session = require("express-session");
const path = require("path");
const bodyParser = require("body-parser");

const users = require("./users");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: "star-chat-secret",
    resave: false,
    saveUninitialized: true,
  })
);

// Routes
app.get("/", (req, res) => {
  if (req.session.user) return res.redirect("/index.html");
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (users[username] && users[username].password === password) {
    req.session.user = username;
    return res.redirect("/index.html");
  }
  res.send("❌ Invalid credentials. <a href='/'>Try again</a>");
});

app.post("/signup", (req, res) => {
  const { username, password } = req.body;
  if (users[username]) {
    return res.send("⚠️ Username already exists. <a href='/signup.html'>Try again</a>");
  }
  users[username] = { password };
  req.session.user = username;
  return res.redirect("/index.html");
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

io.use((socket, next) => {
  const req = socket.request;
  const session = req.session;
  if (session && session.user) {
    socket.user = session.user;
    next();
  } else {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  const user = socket.user;
  console.log(`${user} connected`);

  socket.on("chat message", (msg) => {
    io.emit("chat message", `${user}: ${msg}`);
  });

  socket.on("disconnect", () => {
    console.log(`${user} disconnected`);
  });
});

server.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
