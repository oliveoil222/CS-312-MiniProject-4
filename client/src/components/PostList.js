//imports
import React, { useEffect, useState } from 'react';


export default function PostList({ onEdit }) {
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState(null);

  const load = async () => {
    setError(null);
    try {
      const res = await fetch('/api/blogs', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setPosts(data.posts);
      else setError(data.error || 'Failed to load');
    } catch (err) {
      setError('Network error');
    }
  };

  useEffect(() => { load(); }, []);

  const deletePost = async (id) => {
    if (!confirm('Delete this post?')) return;
    const res = await fetch(`/api/blogs/${id}`, { method: 'DELETE', credentials: 'include' });
    const data = await res.json();
    if (data.success) setPosts(posts.filter(p => p.blog_id !== id));
    else alert(data.error || 'Delete failed');
  };

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}
      {posts.map(p => (
        <div key={p.blog_id} className="post-card">
          <h5>{p.title}</h5>
          <p>{p.body}</p>
          <small>By {p.creator_name} on {new Date(p.date_created).toLocaleString()}</small>
          <div className="mt-2">
            <button className="btn btn-sm btn-outline-primary me-2" onClick={() => onEdit(p)}>Edit</button>
            <button className="btn btn-sm btn-outline-danger" onClick={() => deletePost(p.blog_id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
