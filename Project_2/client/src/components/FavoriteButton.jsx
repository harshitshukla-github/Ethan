import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart as faHeartOutline } from '@fortawesome/free-regular-svg-icons';
import { faHeart } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

/**
 * Saves a planet or mission to the signed-in user's favorites.
 * `variant="icon"` renders a compact round button for use on cards.
 */
export default function FavoriteButton({ type, id, name, variant = 'full' }) {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);

  const saved = isFavorite(type, id);

  async function handleClick() {
    if (!user) {
      notify('Sign in to save favorites.', 'info');
      navigate('/login', { state: { from: location.pathname + location.search } });
      return;
    }

    setBusy(true);
    try {
      const nowSaved = await toggleFavorite(type, id);
      notify(nowSaved ? `${name} saved to your favorites.` : `${name} removed from your favorites.`);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`favorite favorite--${variant} ${saved ? 'is-saved' : ''}`}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from favorites` : `Save ${name} to favorites`}
      disabled={busy}
      onClick={handleClick}
    >
      <FontAwesomeIcon icon={saved ? faHeart : faHeartOutline} />
      {variant === 'full' && <span>{saved ? 'Saved' : 'Save'}</span>}
    </button>
  );
}
