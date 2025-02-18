// server.js
import { createClient } from "@supabase/supabase-js";
import bodyParser from "body-parser";
import express from "express";

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs"); // Tell Express to use Pug
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(bodyParser.urlencoded({ extended: true })); // For parsing form data
app.use(express.static("public")); // Serve static files (HTML, CSS, JS)

// Routes
app.get("/todos", async (req, res) => {
  try {
    const { data: todos, error } = await supabase.from("todos").select("*");
    if (error) throw error;

    res.render("index", {
      todos: todos || [],
      error: null,
    });
  } catch (error) {
    console.error("Error fetching todos:", error);
    res.render("index", {
      todos: [],
      error: "Failed to load todos",
    });
  }
});

app.post("/todos", async (req, res) => {
  try {
    const { task } = req.body;

    if (!task || task.trim().length === 0) {
      return res.render("partials/error", { message: "Task is required" });
    }

    const { error } = await supabase
      .from("todos")
      .insert([{ task: task.trim() }]);

    if (error) throw error;

    // Fetch updated list
    const { data: todos } = await supabase.from("todos").select("*");
    res.setHeader("HX-Trigger", "resetTodoForm");
    res.render("partials/todo-list", { todos });
  } catch (error) {
    console.error("Error creating todo:", error);
    res.render("partials/error", { message: "Failed to create todo" });
  }
});

app.put("/todos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { task, completed } = req.body;

    if (!id) {
      return res.render("partials/error", { message: "Todo ID is required" });
    }

    const updates = {};
    if (task) updates.task = task.trim();
    if (completed !== undefined) updates.completed = completed === "on";

    const { error } = await supabase.from("todos").update(updates).eq("id", id);

    if (error) throw error;

    // Return the updated todo item partial
    const { data: todo } = await supabase
      .from("todos")
      .select("*")
      .eq("id", id)
      .single();

    res.render("partials/todo-item", { todo });
  } catch (error) {
    console.error("Error updating todo:", error);
    res.render("partials/error", { message: "Failed to update todo" });
  }
});

app.put("/todos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { task, completed } = req.body;

    if (!id) {
      return res.render("partials/error", { message: "Todo ID is required" });
    }

    const updates = {};
    if (task) updates.task = task.trim();
    if (completed !== undefined) updates.completed = completed === "on";

    const { error } = await supabase.from("todos").update(updates).eq("id", id);

    if (error) throw error;

    // Return the updated todo item partial
    const { data: todo } = await supabase
      .from("todos")
      .select("*")
      .eq("id", id)
      .single();

    res.render("partials/todo-item", { todo });
  } catch (error) {
    console.error("Error updating todo:", error);
    res.render("partials/error", { message: "Failed to update todo" });
  }
});

app.delete("/todos/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.render("partials/error", { message: "Todo ID is required" });
    }

    const { error } = await supabase.from("todos").delete().eq("id", id);

    if (error) throw error;

    // Check if this was the last todo
    const { data: remainingTodos } = await supabase.from("todos").select("*");

    if (!remainingTodos || remainingTodos.length === 0) {
      // If no todos left, render the empty state
      return res.render("partials/todo-list", { todos: [] });
    }

    // Otherwise send empty response for the individual item deletion
    res.status(200).send("");
  } catch (error) {
    console.error("Error deleting todo:", error);
    res.render("partials/error", { message: "Failed to delete todo" });
  }
});

app.listen(port, () => {
  console.log("Server listening on port ${port}");
});
