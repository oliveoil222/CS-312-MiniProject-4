//imports
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SignIn({ onSignIn }) {
  const [user_id, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    const res = await fetch('/api/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, password }),
      credentials: 'include'
    });
    const data = await res.json();
    if (data.success) {
      onSignIn && onSignIn(data.user);
      navigate('/');
    } else {
      setError(data.error || 'Sign in failed');
    }
  };

  return (
    <div className="col-md-6">
      <h3>Sign In</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={submit}>
        <div className="mb-2">
          <label className="form-label">User ID</label>
          <input className="form-control" value={user_id} onChange={e => setUserId(e.target.value)} />
        </div>
        <div className="mb-2">
          <label className="form-label">Password</label>
          <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <button className="btn btn-primary" type="submit">Sign In</button>
      </form>
    </div>
  );
}
