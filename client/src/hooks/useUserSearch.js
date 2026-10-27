import { useEffect, useState } from 'react';
import api from '../services/api';

export default function useUserSearch(query) {
  const [results, setResults] = useState([]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/users', { params: { q } });
        setResults(data.users);
      } catch {
        setResults([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  return results;
}
