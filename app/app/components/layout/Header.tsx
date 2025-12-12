import { useState } from "react";
import { Search, X } from "lucide-react";

export default function Header() {
  const [showSearch, setShowSearch] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  return (
    <header className="fixed top-0 left-0 right-0 z-20 bg-white py-4 px-6 flex items-center justify-center">
      <h1 className="relative text-lg font-semibold text-center flex-1 text-gray-800">
        OneClyq
      </h1>

      <div className="absolute right-1">
        {!showSearch ? (
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 text-gray-700 hover:text-gray-900"
          >
            <Search size={20} />
          </button>
        ) : (
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="border border-gray-300 rounded-full px-4 py-1 w-40 sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-300"
              autoFocus
            />
            <button
              onClick={() => {
                setShowSearch(false);
                setSearchValue("");
              }}
              className="ml-1 p-2 text-gray-600 hover:text-gray-900"
            >
              <X size={20} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
