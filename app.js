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

app.set('view engine', 'ejs'); // Tell Express to use Pug
app.use(bodyParser.urlencoded({ extended: true })); // For parsing form data
app.use(express.static('public')); // Serve static files (HTML, CSS, JS)
app.use('/js', express.static(path.join(__dirname, 'node_modules/htmx.org/dist')));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Routes
app.get('/', async (req, res) => {
  res.render('index');
});

app.get('/todos', async (req, res) => {
  try {
    const { data: todos, error } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    res.render('todo-list', {
      todos: todos || [],
      error: null,
    });
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.render('todo-list', {
      todos: [],
      error: 'Failed to load todos',
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
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch updated list
    const { data: todos } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false });
    
    res.setHeader('HX-Trigger', 'resetTodoForm');
    res.render('partials/todo-list', { todos });
  } catch (error) {
    console.error('Error creating todo:', error);
    res.render('partials/error', { message: 'Failed to create todo' });
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
    console.error('Error updating todo:', error);
    res.render('partials/error', { message: 'Failed to update todo' });
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
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Check if this was the last todo
    const { data: remainingTodos } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false });

    if (!remainingTodos || remainingTodos.length === 0) {
      // If no todos left, render the empty state
      // If no todos left, retarget to the entire list and replace it
      res.setHeader('HX-Retarget', '#todo-list');
      res.setHeader('HX-Reswap', 'outerHTML');
      return res.render('partials/todo-list', { todos: [] });
    }

    // Otherwise send empty response for the individual item deletion
    res.status(200).send('');
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.render('partials/error', { message: 'Failed to delete todo' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://${host}:${port}`);
});
