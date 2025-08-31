const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
  paused: { type: Boolean, default: false },
  deadline: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model("Task", TaskSchema);
