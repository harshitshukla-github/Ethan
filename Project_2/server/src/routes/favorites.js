import { Router } from 'express';
import { missionsById } from '../data/missions.js';
import { planetsById } from '../data/planets.js';
import { db } from '../db.js';
import { HttpError } from '../lib/httpError.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const catalog = { planet: planetsById, mission: missionsById };

const selectFavorites = db.prepare(`
  SELECT item_type AS type, item_id AS id, created_at AS createdAt
  FROM favorites
  WHERE user_id = ?
  ORDER BY created_at DESC
`);
const insertFavorite = db.prepare('INSERT OR IGNORE INTO favorites (user_id, item_type, item_id) VALUES (?, ?, ?)');
const deleteFavorite = db.prepare('DELETE FROM favorites WHERE user_id = ? AND item_type = ? AND item_id = ?');

router.use(requireAuth);

router.get('/', (req, res) => {
  res.json({ favorites: selectFavorites.all(req.user.id) });
});

router.put('/:type/:id', (req, res) => {
  const { type, id } = req.params;
  if (!Object.hasOwn(catalog, type) || !catalog[type].has(id)) {
    throw new HttpError(404, 'That item does not exist.');
  }
  insertFavorite.run(req.user.id, type, id);
  res.status(204).end();
});

router.delete('/:type/:id', (req, res) => {
  deleteFavorite.run(req.user.id, req.params.type, req.params.id);
  res.status(204).end();
});

export default router;
