'use client';

import { useState } from 'react';

export default function CreatePostPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, content }),
      });

      if (res.ok) {
        alert('Post created successfully!');
        setTitle('');
        setContent('');
      } else {
        alert('Failed to create post.')
      }
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Create a Post</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor='title'>Title</label>
          <input 
            id='title'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            />
        </div>
        <div>
          <label htmlFor='title'>Content</label>
            <input 
              id='title'
              value={content}
              onChange={(e) => setTitle(e.target.value)}
              required
              />
        </div>
        <button type='submit' disabled={loading}>
          {loading ? 'Creating...' : 'Create Post'}
        </button>
      </form>
    </div>
  )
}