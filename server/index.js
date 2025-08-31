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

// GET all tasks
app.get("/tasks", async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// POST new task
app.post("/tasks", async (req, res) => {
  try {
    const { text, deadline } = req.body;
    const newTask = new Task({
      text,
      deadline: deadline ? new Date(deadline) : null,
      completed: false,
      paused: false,
      remainingTime: deadline ? new Date(deadline).getTime() - Date.now() : null,
    });
    const savedTask = await newTask.save();
    res.json(savedTask);
  } catch (err) {
    res.status(500).json({ error: "Failed to add task" });
  }
});

// PUT update task
app.put("/tasks/:id", async (req, res) => {
  try {
    const { text, deadline, completed, paused, remainingTime } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found." });

    // Prevent editing completed tasks text or deadline
    if (task.completed && text) {
      return res.status(400).json({ error: "Cannot edit completed task" });
    }

    task.text = text || task.text;
    
    // Handle deadline updates
    if (deadline !== undefined) {
      if (deadline === null) {
        task.deadline = null;
        task.remainingTime = null;
      } else {
        task.deadline = new Date(deadline);
        task.remainingTime = task.deadline.getTime() - Date.now();
      }
    }
    
    // Handle pause/resume functionality
    if (paused !== undefined) {
      if (paused && !task.paused) {
        // Pausing the task - store remaining time
        if (task.deadline) {
          task.remainingTime = task.deadline.getTime() - Date.now();
        }
      } else if (!paused && task.paused) {
        // Resuming the task - set new deadline based on remaining time
        if (task.remainingTime) {
          task.deadline = new Date(Date.now() + task.remainingTime);
        }
      }
      task.paused = paused;
    }
    
    if (remainingTime !== undefined) {
      task.remainingTime = remainingTime;
    }
    
    if (completed !== undefined) task.completed = completed;

    await task.save();
    res.json(task);
  } catch (err) {
    console.error("PUT error:", err);
    res.status(500).json({ error: "Failed to update task." });
  }
});

// DELETE task
app.delete("/tasks/:id", async (req, res) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);
    res.json(deletedTask);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete task." });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));