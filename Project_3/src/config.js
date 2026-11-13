import dotenv from 'dotenv';

// Values already present in the real environment win over .env, so deploy targets can override it.
dotenv.config({ quiet: true });

function toInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const env = process.env.NODE_ENV ?? 'development';

const config = Object.freeze({
  env,
  isProduction: env === 'production',
  port: toInt(process.env.PORT, 3000),
  db: Object.freeze({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: toInt(process.env.DB_PORT, 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'zero_waste_matchmaker',
    connectionLimit: toInt(process.env.DB_CONNECTION_LIMIT, 10),
  }),
  googleMaps: Object.freeze({
    apiKey: process.env.GOOGLE_MAPS_API_KEY?.trim() || null,
    // Advanced Markers need a Map ID; Google's DEMO_MAP_ID is fine for local development.
    mapId: process.env.GOOGLE_MAPS_MAP_ID?.trim() || 'DEMO_MAP_ID',
  }),
});

export default config;
