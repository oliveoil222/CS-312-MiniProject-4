//imports
import React, { useState, useEffect } from 'react';

export default function BlogPostForm({ initial = null, onSaved = () => {} }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initial) {
      setTitle(initial.title || '');
      setBody(initial.body || '');
      setCategory(initial.category || '');
    }
  }, [initial]);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    const method = initial && initial.blog_id ? 'PUT' : 'POST';
    const url = initial && initial.blog_id ? `/api/blogs/${initial.blog_id}` : '/api/blogs';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title, body, category })
    });
    const data = await res.json();
    if (data.success) {
      onSaved(data.post);
      if (!initial) { setTitle(''); setBody(''); setCategory(''); }
    } else {
      setError(data.error || 'Save failed');
    }
  };

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={submit}>
        <div className="mb-2">
          <input className="form-control" value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" />
        </div>
        <div className="mb-2">
          <textarea className="form-control" value={body} onChange={e => setBody(e.target.value)} placeholder="Body" rows={6} />
        </div>
        <div className="mb-2">
          <input className="form-control" value={category} onChange={e => setCategory(e.target.value)} placeholder="Category" />
        </div>
        <button className="btn btn-success" type="submit">Save</button>
      </form>
    </div>
  );
}
