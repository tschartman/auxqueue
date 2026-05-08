import { useState, useRef, type FormEvent } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading?: boolean;
  placeholder?: string;
}

export function SearchBar({ onSearch, loading = false, placeholder = 'Search for a song…' }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-lg pointer-events-none">
        🔍
      </span>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-border text-white placeholder-white/25 focus:outline-none focus:border-white/20 transition-colors"
      />
      {loading && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 text-sm animate-spin">
          ⟳
        </span>
      )}
    </form>
  );
}
