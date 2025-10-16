'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';

export default function Header() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-20 flex items-center justify-between px-4 md:px-6 py-3">
      {/* Center text */}
      <p className="text-md md:text-lg font-semibold text-center flex-1">
        You are welcome to OneClyq
      </p>

      {/* Search Area */}
      <div className="relative flex items-center">
        {/* Desktop search bar */}
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="hidden md:block border border-gray-300 rounded-full px-4 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 transition-all duration-200"
        />

        {/* Mobile Search Icon + Expandable input */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="text-gray-600 p-2 rounded-full hover:bg-gray-100"
          >
            <Search size={20} />
          </button>

          {showSearch && (
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="absolute right-0 top-0 border border-gray-300 rounded-full px-3 py-1 text-sm focus:outline-none bg-white shadow-sm w-40 transition-all duration-300"
              autoFocus
            />
          )}
        </div>
      </div>
    </header>
  );
}
