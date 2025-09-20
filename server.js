const express = require("express");
const session = require("express-session");
const multer = require("multer");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Database
const db = new sqlite3.Database("./database.sqlite", (err) => {
  if (err) console.error(err);
  else console.log("✅ Database connected");
});

db.run("CREATE TABLE IF NOT EXISTS notes(id INTEGER PRIMARY KEY, title TEXT, content TEXT)");
db.run("CREATE TABLE IF NOT EXISTS questions(id INTEGER PRIMARY KEY, question TEXT, answer TEXT)");
db.run("CREATE TABLE IF NOT EXISTS media(id INTEGER PRIMARY KEY, type TEXT, filename TEXT)");

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));
app.set("view engine", "ejs");

// Session
app.use(
  session({
    secret: "mysecret",
    resave: false,
    saveUninitialized: false,
  })
);

// File upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Auth check
function checkAuth(req, res, next) {
  if (req.session.loggedIn) return next();
  res.redirect("/login");
}

// Routes
app.get("/", checkAuth, (req, res) => res.render("index"));
app.get("/login", (req, res) => res.render("login"));
app.post("/login", (req, res) => {
  if (req.body.username === "admin" && req.body.password === "1234") {
    req.session.loggedIn = true;
    res.redirect("/");
  } else res.send("❌ Invalid credentials");
});

// Notes
app.get("/notes", checkAuth, (req, res) => {
  db.all("SELECT * FROM notes", (err, rows) => res.render("notes", { notes: rows }));
});
app.post("/notes", checkAuth, (req, res) => {
  db.run("INSERT INTO notes(title, content) VALUES(?,?)", [req.body.title, req.body.content]);
  res.redirect("/notes");
});

// Questions
app.get("/questions", checkAuth, (req, res) => {
  db.all("SELECT * FROM questions", (err, rows) => res.render("questions", { questions: rows }));
});
app.post("/questions", checkAuth, (req, res) => {
  db.run("INSERT INTO questions(question, answer) VALUES(?,?)", [req.body.question, req.body.answer]);
  res.redirect("/questions");
});

// Media
app.get("/images", checkAuth, (req, res) => {
  db.all("SELECT * FROM media WHERE type='image'", (err, rows) => res.render("images", { images: rows }));
});
app.post("/images", checkAuth, upload.single("image"), (req, res) => {
  db.run("INSERT INTO media(type, filename) VALUES(?,?)", ["image", req.file.filename]);
  res.redirect("/images");
});

app.get("/videos", checkAuth, (req, res) => {
  db.all("SELECT * FROM media WHERE type='video'", (err, rows) => res.render("videos", { videos: rows }));
});
app.post("/videos", checkAuth, upload.single("video"), (req, res) => {
  db.run("INSERT INTO media(type, filename) VALUES(?,?)", ["video", req.file.filename]);
  res.redirect("/videos");
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

// Start server
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
