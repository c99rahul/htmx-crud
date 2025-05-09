import express from 'express';
import bodyParser from 'body-parser';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || 'localhost';

app.set('view engine', 'ejs'); // Tell Express to use ejs
app.use(bodyParser.urlencoded({ extended: true })); // For parsing form data
app.use('/js', express.static(path.join(__dirname, 'node_modules/htmx.org/dist')));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Routes
app.get('/', async (req, res) => {
  try {
    const { data: todos, error } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    res.render('index', {
      todos: todos || [],
      error: null,
    });
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.render('index', {
      todos: [],
      error: error
    });
  }
});

app.post('/todos', async (req, res) => {
  try {
    const { task } = req.body;

    if (!task || task.trim().length === 0) {
      return res.render('partials/error', { message: 'Task is required' });
    }

    const { error } = await supabase
      .from('todos')
      .insert([{ task: task.trim() }])

    if (error) throw error;

    // Fetch updated list
    const { data: todos, error: fetchError} = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    res.render('partials/todo-list', { todos });
  } catch (error) {
    console.error('Error creating todo:', error);
    res.render('partials/error', { message: error });
  }
});

app.put('/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { task, completed } = req.body;

    if (!id) {
      return res.render('partials/error', { message: 'Todo ID is required' });
    }

    // Create updates object with proper handling for checkbox
    const updates = {
      task: task ? task.trim() : undefined,
      completed: completed === 'on', // Will be true if checkbox is checked, false otherwise
    };

    // Remove undefined values
    Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

    // Only proceed if we have updates
    if (Object.keys(updates).length === 0) {
      return res.render('partials/error', { message: 'No updates provided' });
    }

    const { error } = await supabase
      .from('todos')
      .update(updates)
      .eq('id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Return the updated todo item partial
    const { data: todo } = await supabase
      .from('todos')
      .select('*')
      .eq('id', id)
      .single()
      .order('created_at', { ascending: false });

    res.render('partials/todo-item', { todo });
  } catch (error) {
    res.render('partials/error', { message: error });
  }
});

app.delete('/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.render('partials/error', { message: 'Todo ID is required' });
    }

    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id)

    if (error) throw error;

    // Check if this was the last todo
    const { data: remainingTodos } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false });

    res.setHeader('HX-Retarget', '#todo-list');
    res.render('partials/todo-list', { todos: remainingTodos });
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.render('partials/error', { message: 'Failed to delete todo' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://${host}:${port}`);
});
