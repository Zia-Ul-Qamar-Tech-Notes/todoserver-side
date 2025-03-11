require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI, {
    dbName: "azureDO",
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

const TodoSchema = new mongoose.Schema({
  task: String,
  completed: Boolean,
});

const Todo = mongoose.model("Todo", TodoSchema);

// Routes

app.get("/", async (req, res) => {
  res.json("Welcome to Server Side! Go to TODOS");
});

app.get("/todos", async (req, res) => {
  try {
    const todos = await Todo.find();
    res.status(200).json(todos); // ✅ Ensure JSON is returned
  } catch (error) {
    console.error("Error fetching todos:", error);
    res.status(500).json({ message: "Server error", error: error.message }); // ✅ Return error as JSON
  }
});

app.post("/todos", async (req, res) => {
  const newTodo = new Todo({ task: req.body.task, completed: false });
  await newTodo.save();
  res.json(newTodo);
});

app.put("/todos/:id", async (req, res) => {
  const { id } = req.params;
  const { completed } = req.body;
  await Todo.findByIdAndUpdate(id, { completed });
  res.json({ message: "Todo Updated" });
});

app.delete("/todos/:id", async (req, res) => {
  const { id } = req.params;
  await Todo.findByIdAndDelete(id);
  res.json({ message: "Todo Deleted" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
