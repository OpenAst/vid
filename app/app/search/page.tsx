'use client'

import { useState } from 'react';

type MemoryResult = {
  payload: {
    text: string;
    source: string;
  };
  score: number;
};

export default function SearchPage() {


  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemoryResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/search', {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    setResults(data.results);
    setLoading(false);
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className='text-2xl font-bold mb-4'>Search Your Memories</h1>
      <form
        onSubmit={handleSearch}
        className='flex gap-2 mb-6'
      >
        <input
          type="text"
          placeholder='e.g who did I meet last week?'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 border rounded px-4 py-2"
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      <ul className="space-y-4">
        {results.map((result, idx) => (
          <li key={idx} className="bg-gray-100 p-4 rounded shadow">
            <p>{result.payload.text}</p>
            <span className='text-xs text-gray-600'>
              Source: {result.payload.source} | Score: {result.score.toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}