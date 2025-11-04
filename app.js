//import modules
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 8080;
const pool = require('./db');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');

//test db connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Connected to database at:', res.rows[0].now);
  }
});


//establish middleware 
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(bodyParser.json());
// allow React dev server to access API
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(methodOverride('_method'));
app.use(session({
  secret: 'thesecretkey',
  resave: false,
  saveUninitialized: true
}));
app.use(flash());
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.user = req.session.user;
  next();
});


/* old code from project 1
//array for storage
let posts = [];
//post id counter
let postId = 1;
*/

//authentication middleware
function ensureAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  req.flash('error_msg', 'Log in first!');
  res.redirect('/signin');
}

//EJS Routes
//page to display posts on homepage in descending order of creation
app.get('/', async (req, res) => {
  const result = await pool.query('SELECT * FROM blogs ORDER BY date_created DESC');
  res.render('index', { posts: result.rows });
});

//page to create a new account (add name, userid, password)
app.get('/signup', (req, res) => res.render('signup'));
app.post('/signup', async (req, res) => {
  const { user_id, password, name } = req.body;
  const check = await pool.query('SELECT * FROM users WHERE user_id = $1', [user_id]);
  if (check.rows.length > 0) {
    req.flash('error', 'User ID already taken.');
    return res.redirect('/signup');
  }
  const hashed = await bcrypt.hash(password, 10);
  await pool.query('INSERT INTO users (user_id, password, name) VALUES ($1,$2,$3)', [user_id, hashed, name]);
  req.flash('success', 'Account created. Continue to sign in.');
  res.redirect('/signin');
});

//page to login
app.get('/signin', (req, res) => res.render('signin'));
app.post('/signin', async (req, res) => {
  const { user_id, password } = req.body;
  const result = await pool.query('SELECT * FROM users WHERE user_id = $1', [user_id]);
  if (result.rows.length === 0) {
    req.flash('error', 'Invalid user ID or password.');
    return res.redirect('/signin');
  }
  const user = result.rows[0];
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    req.flash('error', 'Invalid user ID or password.');
    return res.redirect('/signin');
  }
  req.session.user = { user_id: user.user_id, name: user.name };
  req.flash('success', 'Signed in!');
  res.redirect('/');
});

//sign out of account
app.get('/signout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});


//page to write a new post
app.get('/post', ensureAuthenticated, (req, res) => {
  res.render('post', { post: null });
});

//create the post, also allows editing of existing posts
app.post('/post', ensureAuthenticated, async (req, res) => {
  const { id, title, body, category } = req.body; // <- make sure you destructure category

  const user = req.session.user;

  if (id) {
    //update existing
    await pool.query(
      'UPDATE blogs SET title=$1, body=$2, category=$3 WHERE blog_id=$4',
      [title, body, category, id]
    );
  } else {
    //create new
    await pool.query(
      'INSERT INTO blogs (creator_name, creator_user_id, title, body, category, date_created) VALUES ($1,$2,$3,$4,$5,NOW())',
      [user.name, user.user_id, title, body, category]
    );
  }

  res.redirect('/');
});


//edit form for existing post
app.get('/post/:id', ensureAuthenticated, async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM blogs WHERE blog_id = $1', [id]);
  if (result.rows.length === 0) return res.redirect('/');
  const post = result.rows[0];

  if (post.creator_user_id !== req.session.user.user_id) {
    req.flash('error', 'You can only edit your own posts.');
    return res.redirect('/');
  }

  res.render('post', { post });
});


//delete post
app.post('/delete/:id', ensureAuthenticated, async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM blogs WHERE blog_id=$1', [id]);
  if (result.rows.length === 0 || result.rows[0].creator_user_id !== req.session.user.user_id) {
    req.flash('error', 'You can only delete your own posts.');
    return res.redirect('/');
  }
  await pool.query('DELETE FROM blogs WHERE blog_id=$1', [id]);
  res.redirect('/');
});

//JSON Routes

//return all blogs as JSON
app.get('/api/blogs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM blogs ORDER BY date_created DESC');
    res.json({ success: true, posts: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

//create a new post
app.post('/api/blogs', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
  const { title, body, category } = req.body;
  const user = req.session.user;
  try {
    const result = await pool.query(
      'INSERT INTO blogs (creator_name, creator_user_id, title, body, category, date_created) VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING *',
      [user.name, user.user_id, title, body, category]
    );
    res.json({ success: true, post: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

//get single post
app.get('/api/blogs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM blogs WHERE blog_id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, post: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

//update post 
app.put('/api/blogs/:id', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
  const { id } = req.params;
  const { title, body, category } = req.body;
  try {
    const check = await pool.query('SELECT * FROM blogs WHERE blog_id=$1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
    const post = check.rows[0];
    if (post.creator_user_id !== req.session.user.user_id) return res.status(403).json({ success: false, error: 'Forbidden' });
    await pool.query('UPDATE blogs SET title=$1, body=$2, category=$3 WHERE blog_id=$4', [title, body, category, id]);
    const updated = (await pool.query('SELECT * FROM blogs WHERE blog_id=$1', [id])).rows[0];
    res.json({ success: true, post: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

//delete post
app.delete('/api/blogs/:id', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM blogs WHERE blog_id=$1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
    const post = result.rows[0];
    if (post.creator_user_id !== req.session.user.user_id) return res.status(403).json({ success: false, error: 'Forbidden' });
    await pool.query('DELETE FROM blogs WHERE blog_id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

//API endpoints
app.post('/api/signup', async (req, res) => {
  const { user_id, password, name } = req.body;
  try {
    const check = await pool.query('SELECT * FROM users WHERE user_id = $1', [user_id]);
    if (check.rows.length > 0) return res.status(400).json({ success: false, error: 'User ID already taken.' });
    const hashed = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (user_id, password, name) VALUES ($1,$2,$3)', [user_id, hashed, name]);
    res.json({ success: true, message: 'Account created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

app.post('/api/signin', async (req, res) => {
  const { user_id, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE user_id = $1', [user_id]);
    if (result.rows.length === 0) return res.status(400).json({ success: false, error: 'Invalid user ID or password.' });
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ success: false, error: 'Invalid user ID or password.' });
    req.session.user = { user_id: user.user_id, name: user.name };
    res.json({ success: true, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

app.get('/api/me', (req, res) => {
  if (!req.session.user) return res.json({ user: null });
  res.json({ user: req.session.user });
});

//start server console log
app.listen(port, () => {
  console.log(`Blog app is listening at http://localhost:${port}`);
});

//allow deploying frontend with backend
const clientBuildPath = path.join(__dirname, 'client', 'build');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/signin') || req.path.startsWith('/signup') || req.path.startsWith('/signout') || req.path.startsWith('/post') || req.path.startsWith('/delete')) {
      return next();
    }
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}



