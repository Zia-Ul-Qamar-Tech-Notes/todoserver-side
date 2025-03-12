const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const redis = require("redis");
const Redis = require("ioredis");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection

mongoose
  .connect(process.env.MONGO_URI, {
    dbName: "azureDB",
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// Redis Connection
// const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
// const redisClient = redis.createClient({ url: REDIS_URL });

const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  tls: {}, // Required for secure Azure Redis connection
});

// redisClient
//   .connect()
//   .then(() => console.log("Redis Connected"))
//   .catch((err) => console.error("Redis Connection Error:", err));

redisClient.on("connect", () =>
  console.log("🔗 Connected to Azure Redis Successfully")
);
redisClient.on("error", (err) => console.error("❌ Redis Error:", err));

// Todo Schema & Model
const TodoSchema = new mongoose.Schema({ task: String, completed: Boolean });
const Todo = mongoose.model("Todo", TodoSchema);

// Middleware to check Redis cache
const cacheTodos = async (req, res, next) => {
  try {
    const cachedData = await redisClient.get("todos");
    if (cachedData) {
      console.log("Serving from cache");
      return res.json(JSON.parse(cachedData));
    }
    next();
  } catch (error) {
    console.error("Redis Cache Error:", error);
    next();
  }
};

// Routes
app.get("/", (req, res) => {
  res.send("API is running...");
});

app.get("/todos", cacheTodos, async (req, res) => {
  try {
    const todos = await Todo.find({});
    await redisClient.set("todos", 3600, JSON.stringify(todos)); // Cache for 1 hour
    res.json(todos);
  } catch (error) {
    console.error("Error fetching todos:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.post("/todos", async (req, res) => {
  try {
    const newTodo = new Todo({ task: req.body.task, completed: false });
    await newTodo.save();
    await redisClient
      .del("todos")
      .then(
        console.log("Previous Todo Deleted in Redis too After new adding in DB")
      ); // Clear cache after adding a new todo
    res.json(newTodo);
  } catch (error) {
    console.error("Error adding todo:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.put("/todos/:id", async (req, res) => {
  const { id } = req.params;
  const { completed } = req.body;
  await Todo.findByIdAndUpdate(id, { completed });
  await redisClient
    .del("todos")
    .then(console.log("Todo Deleted in Redis too After Updated in DB"));
  res.json({ message: "Todo Updated" });
});

app.delete("/todos/:id", async (req, res) => {
  const { id } = req.params;
  await Todo.findByIdAndDelete(id);
  await redisClient
    .del("todos")
    .then(console.log("Todo Deleted in Redis too After deleted in DB"));
  res.json({ message: "Todo Deleted" });
});

// Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
