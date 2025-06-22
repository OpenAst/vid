'use client';

import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';

interface SearchBoxProp {
  onSearch: (query: string) => void;
}
const SearchBox: React.FC<SearchBoxProp> = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };


  return (
    <div className='relative w-full max-w-md mx-auto mt-10'>
      <input
        type='text'
        placeholder='Search videos...'
        className='w-full px-4 py-2 pr-10 border border-gray-300 
        rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
        value={query}
        onChange={handleChange}
       />
       {query && (
        <button 
          onClick={handleClear}
          className='absolute right-3 top-1/2 transform -translate-y-1/2
           text-gray-500 hover:text-red-600'>
            <FiX size={20} />
        </button>
       )}
    </div>
  )
}

export default SearchBox;