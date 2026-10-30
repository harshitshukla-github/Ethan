# Apogee — a space exploration atlas

A full-stack website about space exploration: a React frontend, an Express API, and
accounts stored in a SQLite file inside the project.

- **Solar System** — nine worlds drawn in pure CSS, each with facts and related missions
- **Missions** — 23 landmark missions with search, filters and timelines
- **Launches** — a live schedule of upcoming rocket launches with countdown clocks
- **Gallery** — search NASA's Image and Video Library
- **Accounts** — sign up, sign in, save favorite worlds and missions, manage your profile

## Tech stack

| Part     | Built with                                                              |
| -------- | ----------------------------------------------------------------------- |
| Frontend | React 19, React Router, Vite, Font Awesome, plain CSS                    |
| Backend  | Node.js 24, Express 5, better-sqlite3, Helmet, express-rate-limit        |
| Data     | SQLite file at `server/data/space.db` (created automatically)            |
| Live data| Launch Library 2 and NASA's Image and Video Library (no API keys needed) |

## Getting started

You need [Node.js](https://nodejs.org/) 24.

```bash
npm install
npm run dev
```

Then open <http://localhost:5173>. The API runs on <http://localhost:4000> and Vite proxies
`/api` requests to it, so the browser only ever talks to one address.

No configuration is required. The database file and its tables are created the first time the
server starts.

### Scripts

Run these from the project root.

| Command         | What it does                                                           |
| --------------- | ---------------------------------------------------------------------- |
| `npm run dev`   | Starts the API (port 4000) and the React dev server (port 5173)         |
| `npm run build` | Builds the React app into `client/dist`                                 |
| `npm start`     | Starts Express, which serves the API and the built React app            |
| `npm test`      | Runs the API tests against a throwaway in-memory database               |

To try the production setup locally, run `npm run build` and then `npm start`, and open
<http://localhost:4000>.

## Project structure

```
├── client/                  React app (Vite)
│   └── src/
│       ├── components/      Navbar, cards, planet renderer, form fields, route guards…
│       ├── context/         Auth, favorites and toast providers
│       ├── hooks/           useApi, useNow, usePageTitle
│       ├── lib/             API client, formatting, validation, site settings
│       ├── pages/           One file per page
│       └── styles/          Design tokens and stylesheets
├── server/                  Express API
│   ├── src/
│   │   ├── data/            Planet and mission content
│   │   ├── lib/             Passwords, sessions, validation, upstream cache
│   │   ├── middleware/      Auth, rate limits, error handling
│   │   ├── routes/          auth, favorites, content, launches, gallery
│   │   ├── app.js           Express app (also serves the built client)
│   │   ├── config.js        Environment settings
│   │   ├── db.js            SQLite connection and schema migrations
│   │   └── index.js         Entry point
│   ├── test/                API and cache tests
│   └── data/space.db        The database (git-ignored, created on first run)
├── railway.json             Railway build and deploy settings
└── package.json             npm workspaces root
```

To rename the site, change `SITE_NAME` in [client/src/lib/site.js](client/src/lib/site.js) and
the `<title>` in [client/index.html](client/index.html). Planet and mission content lives in
[server/src/data](server/src/data).

## How sign-in works

- **Passwords** are hashed with scrypt (Node's built-in `crypto`) and a per-user salt. The
  plain password is never stored.
- **Sessions** are random 256-bit tokens. The browser holds the token in an `HttpOnly`,
  `SameSite=Lax` cookie that JavaScript cannot read; the database stores only a SHA-256 hash
  of it. Signing out deletes the session on the server, and changing your password signs out
  every other device.
- **Rate limits** slow down password guessing and bulk sign-ups.
- **Schema**: `users`, `sessions`, `favorites` and `api_cache` tables, created by the
  migrations in [server/src/db.js](server/src/db.js). To change the schema, append a new entry
  to the `migrations` array there.

There is no "forgot password" flow, because that needs an email service. It would be the
natural next feature.

## API

All routes are under `/api` and exchange JSON. Errors look like
`{ "error": { "message": "...", "fields": { "email": "..." } } }`.

| Method & path                      | Purpose                                  | Sign-in |
| ---------------------------------- | ---------------------------------------- | :-----: |
| `POST /auth/register`              | Create an account and sign in             |         |
| `POST /auth/login`                 | Sign in                                   |         |
| `POST /auth/logout`                | Sign out                                  |         |
| `GET /auth/me`                     | Current user, or `null`                   |         |
| `PATCH /auth/me`                   | Change display name                       |    ✓    |
| `POST /auth/password`              | Change password                           |    ✓    |
| `DELETE /auth/me`                  | Delete the account                        |    ✓    |
| `GET /favorites`                   | List saved items                          |    ✓    |
| `PUT /favorites/:type/:id`         | Save a `planet` or `mission`              |    ✓    |
| `DELETE /favorites/:type/:id`      | Remove a saved item                       |    ✓    |
| `GET /planets`, `GET /planets/:id` | Worlds of the solar system                |         |
| `GET /missions`, `GET /missions/:id` | Mission catalog                         |         |
| `GET /launches`                    | Upcoming launches (cached for 20 minutes) |         |
| `GET /gallery?q=mars&page=1`       | NASA image search (cached for 12 hours)   |         |
| `GET /health`                      | Health check                              |         |

## Configuration

Everything has a working default. Optional settings are described in
[server/.env.example](server/.env.example):

| Variable      | Default                                   | Purpose                                 |
| ------------- | ----------------------------------------- | --------------------------------------- |
| `PORT`        | `4000`                                    | Port for `npm start`                    |
| `DATA_DIR`    | `server/data`, or the Railway volume      | Folder that holds `space.db`            |
| `TRUST_PROXY` | `1` in production                         | Number of reverse proxies in front      |


## Credits

- Launch schedule: [Launch Library 2](https://thespacedevs.com/llapi) by The Space Devs
- Images: [NASA Image and Video Library](https://images.nasa.gov/)
- Planetary data: [NASA Planetary Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/)
- Icons: [Font Awesome Free](https://fontawesome.com/)
