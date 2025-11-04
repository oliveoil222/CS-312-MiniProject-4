//imports
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import SignUp from './components/SignUp';
import SignIn from './components/SignIn';
import PostList from './components/PostList';
import BlogPostForm from './components/BlogPostForm';

function AppWrapper() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    fetch('/api/me', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setUser(data.user));
  }, []);

  return (
    <BrowserRouter>
      <div className="container">
        <nav className="d-flex justify-content-between align-items-center mb-4">
          <h2><Link to="/">My Blog</Link></h2>
          <div>
            {!user && <Link to="/signin" className="me-2">Sign In</Link>}
            {!user && <Link to="/signup">Sign Up</Link>}
            {user && <span className="me-2">Hello, {user.name}</span>}
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signin" element={<SignIn onSignIn={setUser} />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function Home({ user }) {
  const [editing, setEditing] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const onSaved = () => setRefreshKey(k => k + 1);

  return (
    <div>
      {user && (
        <div className="mb-4">
          <h4>Create a new post</h4>
          <BlogPostForm onSaved={onSaved} />
        </div>
      )}

      <PostList key={refreshKey} onEdit={setEditing} />

      {editing && (
        <div className="mt-4">
          <h4>Edit post</h4>
          <BlogPostForm initial={editing} onSaved={() => { setEditing(null); onSaved(); }} />
        </div>
      )}
    </div>
  );
}

export default AppWrapper;
