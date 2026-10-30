import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from './AuthContext.jsx';

const FavoritesContext = createContext(null);

const matches = (type, id) => (favorite) => favorite.type === type && favorite.id === id;

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    if (!userId) {
      setFavorites([]);
      return undefined;
    }

    let cancelled = false;
    api
      .get('/favorites')
      .then((data) => {
        if (!cancelled) setFavorites(data.favorites);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const isFavorite = useCallback((type, id) => favorites.some(matches(type, id)), [favorites]);

  // Updates the UI immediately and rolls back if the server rejects the change.
  // Resolves to true when the item ends up saved, false when it was removed.
  const toggleFavorite = useCallback(
    async (type, id) => {
      const saved = favorites.some(matches(type, id));
      const previous = favorites;
      setFavorites(
        saved
          ? favorites.filter((favorite) => !matches(type, id)(favorite))
          : [{ type, id, createdAt: new Date().toISOString() }, ...favorites],
      );

      try {
        const path = `/favorites/${type}/${encodeURIComponent(id)}`;
        await (saved ? api.delete(path) : api.put(path));
        return !saved;
      } catch (err) {
        setFavorites(previous);
        throw err;
      }
    },
    [favorites],
  );

  const value = useMemo(() => ({ favorites, isFavorite, toggleFavorite }), [favorites, isFavorite, toggleFavorite]);

  return <FavoritesContext value={value}>{children}</FavoritesContext>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('useFavorites must be used inside <FavoritesProvider>');
  return context;
}
