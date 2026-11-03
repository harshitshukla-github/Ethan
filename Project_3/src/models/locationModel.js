import pool from '../db/pool.js';

const LOCATION_COLUMNS = `
  l.id, l.name, l.category, l.description, l.address, l.latitude, l.longitude,
  l.website, l.phone, l.hours, l.is_verified, l.created_at,
  COALESCE(r.review_count, 0) AS review_count,
  r.avg_rating`;

// Aggregating in a derived table keeps one row per location without a GROUP BY over every column.
const LOCATION_FROM = `
  FROM locations l
  LEFT JOIN (
    SELECT location_id, COUNT(*) AS review_count, ROUND(AVG(rating), 1) AS avg_rating
    FROM reviews
    GROUP BY location_id
  ) r ON r.location_id = l.id`;

function toLocation(row) {
  return {
    ...row,
    is_verified: Boolean(row.is_verified),
    review_count: Number(row.review_count),
  };
}

export function createLocationModel(db) {
  return {
    async findVerified({ categories = [] } = {}) {
      const params = [];
      let where = 'WHERE l.is_verified = TRUE';
      if (categories.length > 0) {
        where += ` AND l.category IN (${categories.map(() => '?').join(', ')})`;
        params.push(...categories);
      }

      const [rows] = await db.execute(
        `SELECT ${LOCATION_COLUMNS} ${LOCATION_FROM} ${where} ORDER BY l.name ASC`,
        params,
      );
      return rows.map(toLocation);
    },

    /** Returns the verified location with its reviews (newest first), or null if it does not exist or is unverified. */
    async findVerifiedById(id) {
      const [rows] = await db.execute(
        `SELECT ${LOCATION_COLUMNS} ${LOCATION_FROM} WHERE l.id = ? AND l.is_verified = TRUE`,
        [id],
      );
      if (rows.length === 0) return null;

      const [reviews] = await db.execute(
        `SELECT rv.id, rv.rating, rv.comment, rv.created_at, u.username
         FROM reviews rv
         LEFT JOIN users u ON u.id = rv.user_id
         WHERE rv.location_id = ?
         ORDER BY rv.created_at DESC, rv.id DESC`,
        [id],
      );
      return { ...toLocation(rows[0]), reviews };
    },

    /** Inserts a community suggestion. is_verified is always FALSE regardless of input. */
    async createSuggestion(suggestion) {
      const [result] = await db.execute(
        `INSERT INTO locations
           (name, category, description, address, latitude, longitude, website, phone, hours, is_verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
        [
          suggestion.name,
          suggestion.category,
          suggestion.description ?? null,
          suggestion.address,
          suggestion.latitude,
          suggestion.longitude,
          suggestion.website ?? null,
          suggestion.phone ?? null,
          suggestion.hours ?? null,
        ],
      );
      return result.insertId;
    },
  };
}

export default createLocationModel(pool);
