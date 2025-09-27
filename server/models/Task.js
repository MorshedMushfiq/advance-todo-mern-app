const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    deadline: { type: Date, default: null },
    completed: { type: Boolean, default: false },
    paused: { type: Boolean, default: false },
    remainingTime: { type: Number, default: null }, // milliseconds
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", TaskSchema);