import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";

const API_URL = "http://localhost:5000";

function App() {
  const [tasks, setTasks] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState(null);

  // Fetch tasks
  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${API_URL}/tasks`);
      setTasks(res.data);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    }
  };

  useEffect(() => {
    fetchTasks();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const parseDeadline = (deadline) => (deadline ? new Date(deadline) : null);

  const isTimedOut = (task) => {
    const d = parseDeadline(task.deadline);
    return d && !task.paused && !task.completed
      ? Date.now() > d.getTime()
      : false;
  };

  const timeLeft = (task) => {
    if (task.completed) return "✅ Completed";
    if (task.paused && task.remainingTime) {
      const mins = Math.floor(task.remainingTime / 60000);
      const secs = Math.floor((task.remainingTime % 60000) / 1000);
      return `⏸ ${mins}m ${secs}s remaining`;
    }

    const d = parseDeadline(task.deadline);
    if (!d) return "No deadline";

    const diff = d.getTime() - Date.now();
    if (diff <= 0) return "⛔ Time Out";

    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}m ${secs}s left`;
  };

  // Add Task
  const addTask = async () => {
    if (!text.trim()) return;

    const { value: deadlineMinutes } = await Swal.fire({
      title: "Set deadline",
      input: "number",
      inputLabel: "Deadline in minutes",
      inputPlaceholder: "e.g. 60",
      inputAttributes: { min: 1 },
      showCancelButton: true,
    });

    if (deadlineMinutes === null) return;
    if (!deadlineMinutes) {
      Swal.fire("Error", "Please enter a valid deadline", "error");
      return;
    }

    const deadline = new Date(
      Date.now() + deadlineMinutes * 60000
    ).toISOString();

    try {
      const res = await axios.post(`${API_URL}/tasks`, { text, deadline });
      setTasks((prev) => [...prev, res.data]);
      setText("");
      Swal.fire({
        icon: "success",
        title: "Task added!",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (err) {
      Swal.fire("Error", "Failed to add task", "error");
    }
  };

  // Toggle Complete
  const toggleComplete = async (task) => {
    if (isTimedOut(task) && !task.completed) {
      Swal.fire({
        icon: "error",
        title: "Timed Out",
        text: "Can't complete now!",
        confirmButtonText: "OK",
      });
      return;
    }

    try {
      let remainingTime = null;
      if (task.deadline && !task.completed) {
        const d = parseDeadline(task.deadline);
        remainingTime = d.getTime() - Date.now();
      }

      const res = await axios.put(`${API_URL}/tasks/${task._id}`, {
        completed: !task.completed,
        remainingTime: remainingTime,
      });
      setTasks((prev) => prev.map((t) => (t._id === task._id ? res.data : t)));
    } catch (err) {
      Swal.fire("Error", "Failed to update task", "error");
    }
  };

  // Toggle Pause
  const togglePause = async (task) => {
    try {
      let updateData = {};

      if (!task.paused) {
        // Pausing the task - calculate remaining time
        const d = parseDeadline(task.deadline);
        const remainingTime = d ? Math.max(0, d.getTime() - Date.now()) : null;
        updateData = {
          paused: true,
          remainingTime: remainingTime,
        };
      } else {
        // Resuming the task - set new deadline based on remaining time
        if (task.remainingTime && task.remainingTime > 0) {
          const newDeadline = new Date(
            Date.now() + task.remainingTime
          ).toISOString();
          updateData = {
            paused: false,
            deadline: newDeadline,
            remainingTime: null,
          };
        } else {
          // If no remaining time, just unpause
          updateData = { paused: false, remainingTime: null };
        }
      }

      const res = await axios.put(`${API_URL}/tasks/${task._id}`, updateData);
      setTasks((prev) => prev.map((t) => (t._id === task._id ? res.data : t)));
    } catch (err) {
      Swal.fire("Error", "Failed to pause/resume task", "error");
    }
  };

  // Edit task inline
  const startEditing = (task) => {
    if (task.completed) {
      Swal.fire({
        icon: "error",
        title: "Cannot edit completed task",
        confirmButtonText: "OK",
      });
      return;
    }
    setEditingId(task._id);
  };

  const saveEdit = async (taskId, newText) => {
    if (!newText.trim()) {
      setEditingId(null);
      return;
    }
    try {
      const res = await axios.put(`${API_URL}/tasks/${taskId}`, {
        text: newText.trim(),
      });
      setTasks((prev) => prev.map((t) => (t._id === taskId ? res.data : t)));
      setEditingId(null);
    } catch (err) {
      Swal.fire("Error", "Failed to update task", "error");
    }
  };

  // Edit Deadline
  const editDeadline = async (task) => {
    const { value: deadlineMinutes } = await Swal.fire({
      title: "Edit Deadline",
      input: "number",
      inputLabel: "Deadline in minutes (enter 0 to remove deadline)",
      inputPlaceholder: "e.g. 30",
      inputAttributes: { min: 0 },
      showCancelButton: true,
    });

    if (deadlineMinutes === null) return;

    let updatedDeadline = null;
    if (deadlineMinutes > 0) {
      updatedDeadline = new Date(
        Date.now() + deadlineMinutes * 60000
      ).toISOString();
    }

    try {
      const res = await axios.put(`${API_URL}/tasks/${task._id}`, {
        deadline: updatedDeadline,
        paused: false,
        remainingTime: null,
      });
      setTasks((prev) => prev.map((t) => (t._id === task._id ? res.data : t)));
      Swal.fire({
        icon: "success",
        title: "Deadline updated!",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (err) {
      Swal.fire("Error", "Failed to update deadline", "error");
    }
  };

  // Delete Task
  const deleteTask = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This task will be deleted permanently.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`${API_URL}/tasks/${id}`);
        setTasks((prev) => prev.filter((t) => t._id !== id));
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          showConfirmButton: false,
          timer: 1500,
        });
      } catch (err) {
        Swal.fire("Error", "Failed to delete task", "error");
      }
    }
  };

  // View Task
  const viewTask = (task) => {
    const d = parseDeadline(task.deadline);
    const deadlineStr = d ? d.toLocaleString() : "No deadline";
    const status = task.completed
      ? "✅ Completed"
      : isTimedOut(task)
      ? "⛔ Timed Out"
      : task.paused
      ? "⏸ Paused"
      : "⏳ In Progress";

    Swal.fire({
      title: "Task Details",
      html: `
        <div class="text-left">
          <p><strong>Text:</strong> ${task.text}</p>
          <p><strong>Status:</strong> ${status}</p>
          <p><strong>Deadline:</strong> ${deadlineStr}</p>
          <p><strong>Time Left:</strong> ${timeLeft(task)}</p>
        </div>
      `,
      confirmButtonText: "OK",
      confirmButtonColor: "#3b82f6",
    });
  };

  // Categorize tasks (memoized to reduce re-renders)
  const activeTasks = useMemo(
    () => tasks.filter((t) => !t.completed && !t.paused && !isTimedOut(t)),
    [tasks, now]
  );
  const pausedTasks = useMemo(
    () => tasks.filter((t) => t.paused && !t.completed),
    [tasks]
  );
  const completedTasks = useMemo(
    () => tasks.filter((t) => t.completed),
    [tasks]
  );
  const timedOutTasks = useMemo(
    () => tasks.filter((t) => isTimedOut(t) && !t.completed),
    [tasks, now]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center">
            <span className="mr-3">⏰</span> Smart Task Manager
          </h1>
          <p className="text-gray-600">
            Organize your tasks with deadlines and priorities
          </p>
        </div>

        {/* Add Task Form */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addTask();
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What needs to be done?"
              className="flex-grow px-5 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-5 py-3 rounded-lg transition-colors shadow-md"
            >
              Add Task
            </button>
          </form>
        </div>

        {/* Task Sections */}
        <TaskSection
          title="Active Tasks"
          color="green"
          tasks={activeTasks}
          timeLeft={timeLeft}
          editingId={editingId}
          toggleComplete={toggleComplete}
          togglePause={togglePause}
          startEditing={startEditing}
          saveEdit={saveEdit}
          editDeadline={editDeadline}
          viewTask={viewTask}
          deleteTask={deleteTask}
          setEditingId={setEditingId}
        />

        <TaskSection
          title="Paused Tasks"
          color="yellow"
          tasks={pausedTasks}
          timeLeft={timeLeft}
          editingId={editingId}
          toggleComplete={toggleComplete}
          togglePause={togglePause}
          startEditing={startEditing}
          saveEdit={saveEdit}
          editDeadline={editDeadline}
          viewTask={viewTask}
          deleteTask={deleteTask}
          setEditingId={setEditingId}
        />

        <TaskSection
          title="Timed Out Tasks"
          color="red"
          tasks={timedOutTasks}
          timeLeft={timeLeft}
          editingId={editingId}
          toggleComplete={toggleComplete}
          togglePause={togglePause}
          startEditing={startEditing}
          saveEdit={saveEdit}
          editDeadline={editDeadline}
          viewTask={viewTask}
          deleteTask={deleteTask}
          setEditingId={setEditingId}
        />

        <TaskSection
          title="Completed Tasks"
          color="blue"
          tasks={completedTasks}
          timeLeft={timeLeft}
          editingId={editingId}
          toggleComplete={toggleComplete}
          togglePause={togglePause}
          startEditing={startEditing}
          saveEdit={saveEdit}
          editDeadline={editDeadline}
          viewTask={viewTask}
          deleteTask={deleteTask}
          setEditingId={setEditingId}
        />

        {tasks.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-xl font-medium text-gray-700 mb-2">
              No tasks yet
            </h3>
            <p className="text-gray-500">Add a task to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Task Section
const TaskSection = ({
  title,
  color,
  tasks,
  timeLeft,
  editingId,
  toggleComplete,
  togglePause,
  startEditing,
  saveEdit,
  editDeadline,
  viewTask,
  deleteTask,
  setEditingId,
}) => {
  if (!tasks.length) return null;

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
        <span className={`w-3 h-3 rounded-full mr-2 bg-${color}-500`}></span>
        {title} ({tasks.length})
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {tasks.map((task) => (
          <TaskCard
            key={task._id}
            task={task}
            timeLeft={timeLeft(task)}
            editingId={editingId}
            onToggleComplete={toggleComplete}
            onTogglePause={togglePause}
            onStartEditing={startEditing}
            onSaveEdit={saveEdit}
            onEditDeadline={editDeadline}
            onViewTask={viewTask}
            onDeleteTask={deleteTask}
            onCancelEdit={() => setEditingId(null)}
            isTimedOut={
              task.deadline
                ? Date.now() > new Date(task.deadline).getTime() &&
                  !task.completed
                : false
            }
          />
        ))}
      </div>
    </div>
  );
};

// Task Card
const TaskCard = ({
  task,
  timeLeft,
  editingId,
  onToggleComplete,
  onTogglePause,
  onStartEditing,
  onSaveEdit,
  onEditDeadline,
  onViewTask,
  onDeleteTask,
  onCancelEdit,
  isTimedOut,
}) => {
  const [editText, setEditText] = useState(task.text);

  return (
    <div
      className={`bg-white rounded-xl shadow-md p-5 transition-all hover:shadow-lg ${
        task.completed ? "opacity-70" : ""
      } ${isTimedOut ? "border-l-4 border-red-500" : ""}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center">
          <button
            onClick={() => onToggleComplete(task)}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 ${
              task.completed
                ? "bg-green-500 border-green-500 text-white"
                : isTimedOut
                ? "border-red-300"
                : "border-gray-300"
            }`}
          >
            {task.completed && "✓"}
          </button>

          {editingId === task._id ? (
            <input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={() => onSaveEdit(task._id, editText)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveEdit(task._id, editText);
                if (e.key === "Escape" && onCancelEdit) onCancelEdit();
              }}
              autoFocus
              className="font-medium text-gray-800 border-b-2 border-blue-400 outline-none px-1"
            />
          ) : (
            <span
              onClick={() => onToggleComplete(task)}
              className={`font-medium cursor-pointer ${
                task.completed
                  ? "line-through text-green-600"
                  : isTimedOut
                  ? "text-red-600"
                  : "text-gray-800"
              }`}
            >
              {task.text}
            </span>
          )}
        </div>

        <button
          onClick={() => onViewTask(task)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          👁️
        </button>
      </div>

      <div
        className={`text-sm mb-4 pl-9 ${
          isTimedOut
            ? "text-red-500 font-medium"
            : task.paused
            ? "text-amber-600"
            : task.completed
            ? "text-green-600"
            : "text-gray-500"
        }`}
      >
        {timeLeft}
      </div>

      <div className="flex flex-wrap gap-2">
        {!task.completed && (
          <>
            <button
              onClick={() => onTogglePause(task)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                task.paused
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : "bg-purple-100 text-purple-700 hover:bg-purple-200"
              }`}
            >
              {task.paused ? "▶ Resume" : "⏸ Pause"}
            </button>

            <button
              onClick={() => onStartEditing(task)}
              className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              ✏️ Edit
            </button>

            <button
              onClick={() => onEditDeadline(task)}
              className="px-3 py-1.5 text-xs bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
            >
              ⏱️ Change Time
            </button>
          </>
        )}

        <button
          onClick={() => onDeleteTask(task._id)}
          className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors ml-auto"
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  );
};

export default App;
