const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

const Task = require("./models/Task");

// Get all tasks
app.get("/tasks", async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// Add task
app.post("/tasks", async (req, res) => {
  try {
    const newTask = new Task({
      text: req.body.text,
      deadline: req.body.deadline || null,
      completed: false,
      paused: false,
      remainingTime: null,
    });
    const savedTask = await newTask.save();
    res.json(savedTask);
  } catch (err) {
    res.status(500).json({ error: "Failed to add task" });
  }
});

// Delete task
app.delete("/tasks/:id", async (req, res) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);
    if (!deletedTask) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(deletedTask);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// Update task
app.put("/tasks/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found." });

    // prevent editing if completed
    if (task.completed && (req.body.text || req.body.deadline)) {
      return res
        .status(400)
        .json({ error: "Completed tasks cannot be edited." });
    }

    // update allowed fields
    if (req.body.text !== undefined) task.text = req.body.text;
    if (req.body.deadline !== undefined) task.deadline = req.body.deadline;
    if (req.body.completed !== undefined) task.completed = req.body.completed;
    if (req.body.paused !== undefined) task.paused = req.body.paused;
    if (req.body.remainingTime !== undefined) {
      task.remainingTime = req.body.remainingTime;
    }

    const updatedTask = await task.save();
    res.json(updatedTask);
  } catch (err) {
    console.error("PUT error:", err);
    res.status(500).json({ error: "Failed to update task." });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
