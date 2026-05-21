import { useState } from "react";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Header({ centerContent }: { centerContent?: React.ReactNode }) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const router = useRouter();

  const handleSearch = () => {
    if (searchValue.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchValue.trim())}`);
    } else {
      router.push("/search");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-20 border-b border-white/50 bg-base-100/70 px-3 pt-[var(--safe-area-top)] shadow-sm shadow-primary/5 backdrop-blur-2xl sm:px-6">
      <div className="relative flex h-[var(--app-header-row-height)] items-center justify-center">
      <div className="w-8 shrink-0 sm:w-0" />
      <div className="relative flex min-w-0 flex-1 justify-center px-8 sm:px-12">
        {centerContent || (
          <h1 className="text-center text-[1.15rem] font-semibold text-base-content sm:text-lg">
            OneClyq
          </h1>
        )}
      </div>

      <div className="absolute right-0 top-1/2 -translate-y-1/2 sm:right-1">
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
              className="w-40 rounded-full border border-white/60 bg-base-100/75 px-4 py-1 text-base-content shadow-sm backdrop-blur-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary sm:w-64"
              autoFocus
            />
            <button
              // If there is text, clear it. If empty, close search.
              onClick={() => {
                if (searchValue) {
                  setSearchValue("");
                  router.push("/search");
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
      </div>
    </header>
  );
}
