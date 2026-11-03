# Zero-Waste Matchmaker

Find local compost drop-offs, e-waste recycling, bulk/refill stores and recycling centers on a map, and suggest new spots for moderators to review.

- **Backend:** Node.js + Express 5, MySQL via `mysql2/promise` connection pool
- **Frontend:** vanilla JavaScript ES modules (no build step), Google Maps JavaScript API with Advanced Markers
- **Layout:** split screen, with a filterable list on the left and the map on the right (stacks vertically on small screens)

## Quick start

Prerequisites: Node.js 20.6+ and MySQL 8.0.16+ (CHECK constraints are enforced from 8.0.16).

```bash
npm install
cp .env.example .env          # then fill in DB_PASSWORD and GOOGLE_MAPS_API_KEY
npm run db:seed               # creates the database and tables and loads demo data
npm run dev                   # http://localhost:3000 (auto-restarts on changes)
```

| Script | What it does |
| --- | --- |
| `npm start` | Start the server |
| `npm run dev` | Start with `node --watch` |
| `npm run db:setup` | Create the database (if missing) and apply `db/schema.sql`. Safe to re-run; never drops data |
| `npm run db:seed` | `db:setup` plus the demo data in `db/seed.sql`. Skipped if `locations` already has rows |
| `npm run db:reset` | **Drops** `users`, `locations` and `reviews`, then recreates and seeds them |
| `npm test` | API tests (`node:test`). Uses an in-memory fake model, so no MySQL is needed |

The demo data uses fictional San Francisco spots, `example.org` websites and 555-01xx phone numbers.

## Configuration (`.env`)

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `3000` | |
| `NODE_ENV` | `development` | `production` re-enables the CSP `upgrade-insecure-requests` directive |
| `DB_HOST` / `DB_PORT` | `127.0.0.1` / `3306` | |
| `DB_USER` / `DB_PASSWORD` | `root` / empty | A dedicated user is better (see below) |
| `DB_NAME` | `zero_waste_matchmaker` | Letters, digits and `_` only |
| `DB_CONNECTION_LIMIT` | `10` | Pool size |
| `GOOGLE_MAPS_API_KEY` | none | Without it, the app still runs and the map pane shows setup instructions |
| `GOOGLE_MAPS_MAP_ID` | `DEMO_MAP_ID` | Advanced Markers need a Map ID. `DEMO_MAP_ID` is fine for development |

Values already set in the real environment take precedence over `.env`.

### Google Maps API key

1. In Google Cloud Console, enable the **Maps JavaScript API** for a project with billing enabled.
2. Create an API key and **restrict it**:
   - *Application restrictions* → HTTP referrers: `http://localhost:3000/*` plus your production origin.
   - *API restrictions* → Maps JavaScript API only.
3. Put the key in `.env` as `GOOGLE_MAPS_API_KEY` and restart the server.

A Maps JavaScript API key is always visible to the browser, because Google needs it in the script URL. Keeping it in `.env` keeps it out of source control. The referrer and API restrictions are what stop other sites from using it. The server hands the key to the page through `GET /api/config`.

### A least-privilege MySQL user (recommended)

```sql
CREATE USER 'zerowaste'@'localhost' IDENTIFIED BY 'choose-a-strong-password';
GRANT SELECT, INSERT ON zero_waste_matchmaker.* TO 'zerowaste'@'localhost';
```

Run `npm run db:setup` once with an admin account, then switch `DB_USER`/`DB_PASSWORD` to this user for the running app.

## REST API

All responses are JSON. Errors are returned as `{ "error": { "message": "...", "details": { "field": "..." } } }`.

### `GET /api/locations`

Returns **verified** locations only, sorted by name, each with `review_count` and `avg_rating`.

| Query | Example |
| --- | --- |
| `category` (optional) | `?category=compost`, `?category=compost,electronics`, or the parameter repeated |

Allowed categories are `compost`, `electronics`, `bulk_goods` and `recycling_center`. Any other value returns `400`.

```json
{ "data": [ { "id": 1, "name": "…", "category": "compost", "latitude": 37.7585, "longitude": -122.4142, "review_count": 3, "avg_rating": 4.7, "…": "…" } ],
  "meta": { "count": 1, "categories": ["compost"] } }
```

### `GET /api/locations/:id`

Returns one verified location plus `reviews` (newest first, with the reviewer's `username`). Responds `404` for unknown or unverified ids, and `400` for ids that are not positive integers.

### `POST /api/locations/suggest`

Creates a community submission. **`is_verified` is always stored as `FALSE`**, whatever the request says, so the spot stays hidden until a moderator approves it.

```json
{ "name": "Corner Repair Shop", "category": "electronics", "address": "100 Main St",
  "latitude": 37.76, "longitude": -122.42,
  "description": "optional", "website": "https://optional.example", "phone": "optional", "hours": "optional" }
```

- `201` returns the stored suggestion.
- `400` returns per-field `details`.
- `429` means the per-IP limit was hit (20 suggestions per 15 minutes).

Unknown fields are ignored.

Moderators approve a suggestion with:

```sql
UPDATE locations SET is_verified = TRUE WHERE id = ?;
```

### Other endpoints

- `GET /api/health` returns `200 {database: "up"}` or `503 {database: "down"}`.
- `GET /api/config` returns the Maps key and Map ID for the frontend.

## Error handling

- **Database unreachable** (connection refused or timed out, bad credentials, missing database, too many connections): the API answers `503` with `Retry-After: 30`. The cause is logged on the server, and the client gets a generic message. The server still starts when MySQL is down, and the pool reconnects automatically once MySQL is back. The UI shows a "Try again" button.
- **Schema missing** (`ER_NO_SUCH_TABLE` and similar): the API answers `500`, and the log tells you to run `npm run db:setup`.
- **Bad input:** `400` with field-level details, and `413` for bodies over 16 kB. Malformed JSON gets a clear message.
- **Map problems** (missing or rejected key, script blocked): the map pane shows what to fix, and the list, search, filters, detail view and suggestion form all keep working.

## Project structure

```
db/
  schema.sql                 users, locations, reviews (idempotent DDL)
  seed.sql                   demo data
scripts/setup-db.js          creates the DB, applies the schema and optionally seeds it
src/
  server.js                  startup, DB ping, graceful shutdown
  app.js                     Express app factory: security headers, routes, static files
  config.js                  reads and normalises .env
  constants.js               category list (matches the ENUM)
  db/pool.js                 mysql2/promise pool
  models/locationModel.js    all SQL (parameterised)
  validation/                query, param and body validation
  controllers/               request → model → response
  routes/                    URL → controller wiring
  middleware/errorHandler.js maps DB, parse and validation errors to HTTP responses
public/
  index.html, css/styles.css
  js/main.js                 app state and wiring between list, map and form
  js/map.js                  Google Map, category markers, InfoWindow, user dot, draft pin
  js/mapsLoader.js           loads the Maps JS API (loading=async + importLibrary)
  js/sidebar.js              chips, list, detail view
  js/suggestForm.js          suggestion form and error display
  js/api.js, geo.js, dom.js, categories.js, toast.js
test/api.test.js
```

## How the list and map stay in sync

- **Click a list card:** the map pans to the spot and opens its InfoWindow, and the sidebar shows full details and reviews.
- **Click a map marker:** the InfoWindow opens (name, address, **View Details**), and the matching card is highlighted and scrolled into view.
- **View Details in the InfoWindow:** opens the same detail panel in the sidebar.
- **Category chips:** server-side filtering (`?category=`). The search box filters the loaded results on the client, and markers follow both.
- **Find Near Me:** uses the browser Geolocation API to center the map on you, drop a "you are here" dot, and sort the list nearest-first with distances. Geolocation needs HTTPS or `localhost`.
- **Suggest a new spot:** clicking the map drops a draggable pin that fills in the latitude and longitude.

## Security notes

- All SQL is parameterised. The only interpolated identifier is `DB_NAME` in the setup script, and it is validated against `^[A-Za-z0-9_]+$`.
- Helmet sets security headers, including a Content-Security-Policy scoped to the origins the Google Maps documentation lists.
- The frontend builds DOM nodes with `textContent`, never `innerHTML`, for user-supplied data. Stored website URLs are only rendered as links if they are `http(s)`.
- `.env` is git-ignored. Only `.env.example` is meant to be committed.
