import { useState } from "react";
import { Search, X } from "lucide-react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../store/store";
import { fetchVideos } from "../../store/videoSlice";
import { useRouter } from "next/navigation";

export default function Header() {
  const [showSearch, setShowSearch] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const handleSearch = () => {
    if (searchValue.trim()) {
      router.push(`/?search=${encodeURIComponent(searchValue.trim())}`);
    } else {
      router.push("/");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-20 bg-base-100/80 backdrop-blur-md py-2 px-6 flex items-center justify-center border-b border-base-300">
      <h1 className="relative text-lg font-semibold text-center flex-1 text-base-content">
        OneClyq
      </h1>

      <div className="absolute right-1">
        {!showSearch ? (
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 text-base-content/70 hover:text-base-content transition-colors"
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
              onKeyDown={handleKeyDown}
              className="bg-base-200 border border-base-300 rounded-full px-4 py-1 w-40 sm:w-64 focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300 text-base-content"
              autoFocus
            />
            <button
              // If there is text, clear it. If empty, close search.
              onClick={() => {
                if (searchValue) {
                  setSearchValue("");
                  router.push("/");
                } else {
                  setShowSearch(false);
                }
              }}
              className="ml-1 p-2 text-base-content/60 hover:text-base-content transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
