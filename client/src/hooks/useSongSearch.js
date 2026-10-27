import { useEffect, useState } from 'react';
import api from '../services/api';

// Loads trending songs immediately, then re-queries as the person types a search.
export default function useSongSearch(query) {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query.trim();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = q
          ? await api.get('/songs', { params: { q } })
          : await api.get('/songs/trending');
        setSongs(data.songs);
      } catch {
        setSongs([]);
      } finally {
        setLoading(false);
      }
    }, q ? 250 : 0);
    return () => clearTimeout(timer);
  }, [query]);

  return { songs, loading };
}
