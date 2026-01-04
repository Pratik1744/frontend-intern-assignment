import { useState, useEffect } from "react";
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true,
});

export default function App() {
  const [page, setPage] = useState("login");
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [taskTitle, setTaskTitle] = useState("");

  /* ---------------- AUTH ---------------- */

  const register = async () => {
    const res = await api.post("/auth/register", form);
    setUser(res.data.user);
    setPage("dashboard");
  };

  const login = async () => {
    const res = await api.post("/auth/login", {
      email: form.email,
      password: form.password,
    });
    setUser(res.data.user);
    setPage("dashboard");
  };

  const logout = async () => {
    await api.post("/auth/logout");
    setUser(null);
    setPage("login");
  };

  /* ---------------- TASKS ---------------- */

  const fetchTasks = async () => {
    const res = await api.get("/tasks");
    setTasks(res.data);
  };

  const addTask = async () => {
    if (!taskTitle) return;
    await api.post("/tasks", { title: taskTitle });
    setTaskTitle("");
    fetchTasks();
  };

  const deleteTask = async (id) => {
    await api.delete(`/tasks/${id}`);
    fetchTasks();
  };

  useEffect(() => {
    if (page === "dashboard") fetchTasks();
  }, [page]);

  /* ---------------- UI ---------------- */

  if (page === "login")
    return (
      <div className="container">
        <h2>Login</h2>
        <input placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Password" type="password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button onClick={login}>Login</button>
        <p onClick={() => setPage("register")}>Create account</p>
      </div>
    );

  if (page === "register")
    return (
      <div className="container">
        <h2>Register</h2>
        <input placeholder="Name" onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Password" type="password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button onClick={register}>Register</button>
        <p onClick={() => setPage("login")}>Already have account</p>
      </div>
    );

  return (
    <div className="container">
      <h2>Dashboard</h2>
      <p>Welcome, {user?.name}</p>

      <input
        placeholder="New task"
        value={taskTitle}
        onChange={(e) => setTaskTitle(e.target.value)}
      />
      <button onClick={addTask}>Add Task</button>

      <ul>
        {tasks.map((task) => (
          <li key={task._id}>
            {task.title}
            <button onClick={() => deleteTask(task._id)}>❌</button>
          </li>
        ))}
      </ul>

      <button onClick={logout}>Logout</button>
    </div>
  );
}
