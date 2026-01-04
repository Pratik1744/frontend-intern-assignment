import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();

/* -------------------- MIDDLEWARE -------------------- */
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

/* -------------------- DB -------------------- */
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/intern-task")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

/* -------------------- MODELS -------------------- */
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
}, { timestamps: true });

const taskSchema = new mongoose.Schema({
  title: String,
  completed: { type: Boolean, default: false },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
const Task = mongoose.model("Task", taskSchema);

/* -------------------- AUTH HELPERS -------------------- */
const generateToken = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET || "secret", {
    expiresIn: "7d",
  });

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
  });
};

const protect = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Not authorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    req.user = await User.findById(decoded.userId).select("-password");
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

/* -------------------- AUTH ROUTES -------------------- */

// Register
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;

  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: "User already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashedPassword });

  generateToken(res, user._id);
  res.status(201).json({ user });
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ message: "Invalid credentials" });

  generateToken(res, user._id);
  res.json({ user });
});

// Logout
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

/* -------------------- USER ROUTES -------------------- */
app.get("/api/user/profile", protect, (req, res) => {
  res.json(req.user);
});

/* -------------------- TASK ROUTES -------------------- */

// Get tasks
app.get("/api/tasks", protect, async (req, res) => {
  const tasks = await Task.find({ user: req.user._id });
  res.json(tasks);
});

// Create task
app.post("/api/tasks", protect, async (req, res) => {
  const task = await Task.create({
    title: req.body.title,
    user: req.user._id,
  });
  res.status(201).json(task);
});

// Update task
app.put("/api/tasks/:id", protect, async (req, res) => {
  const task = await Task.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json(task);
});

// Delete task
app.delete("/api/tasks/:id", protect, async (req, res) => {
  await Task.findByIdAndDelete(req.params.id);
  res.json({ message: "Task deleted" });
});

/* -------------------- SERVER -------------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
