# Side A — Spotify music player with a Node.js backend

A local learning project using **Node.js + Express + ES modules (`.mjs`)**, with a plain HTML/CSS/JavaScript frontend. Search Spotify and play full songs in your browser through Spotify's Web Playback SDK.

## What you need

- Node.js **22 or newer** and npm.
- A Spotify Premium account for browser playback.
- A Spotify developer application with a **Client ID** and **Client Secret**.
- A browser with protected-content playback enabled, such as Chrome or Edge.

Spotify uses OAuth: the app credentials identify your project, and each listener signs in and grants permission. A client-credentials token alone cannot play a user's music. You do not need to paste credentials into a chat.

Spotify's development mode also requires Premium for the app owner and restricts access to approved test users. This starter is designed for local learning and personal use.

## 1. Create your Spotify app

1. Open the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and sign in.
2. Create an app, giving it a name and description.
3. Select **Web API** and **Web Playback SDK** if the dashboard asks which APIs you will use.
4. Register this exact redirect URI:

   ```text
   http://127.0.0.1:3000/auth/callback
   ```

5. Save the settings and copy your **Client ID** and **Client Secret**.
6. In the app's user access settings, allow the Spotify account(s) that will test it. Development mode has an allowlist; an unapproved account can receive a 403 even after sign-in.

Use `127.0.0.1` throughout the project. Spotify does not accept `localhost` as a redirect URI. The callback in the dashboard and `.env` must match exactly.

## 2. Install and configure

Extract the ZIP. Open a terminal in the `spotify-node-player` folder, which contains `package.json`.

```bash
npm install
```

Copy `.env.example` to `.env`.

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

**Windows Command Prompt:**

```bat
copy .env.example .env
```

**macOS / Linux:**

```bash
cp .env.example .env
```

Generate a session secret with this command (works in PowerShell, Command Prompt, and bash):

```bash
node --input-type=module -e "import { randomBytes } from 'node:crypto'; console.log(randomBytes(32).toString('hex'))"
```

Edit `.env` in VS Code or another text editor:

```dotenv
SPOTIFY_CLIENT_ID=your_actual_client_id
SPOTIFY_CLIENT_SECRET=your_actual_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/auth/callback
PORT=3000
SESSION_SECRET=paste_the_random_value_you_generated
```

Replace the placeholders with your actual values. Keep `.env` private; `.gitignore` excludes it from Git. The browser files in `public/` must never contain your Client Secret or refresh token.

## 3. Run and play music

```bash
npm start
```

Open **http://127.0.0.1:3000** in your browser.

1. Click **Connect with Spotify** and approve access.
2. Wait for the player to show **Ready**.
3. Click **Use this browser**. This moves Spotify playback to this browser and pauses the transferred playback until you choose a song.
4. Search for a song or artist.
5. Click the play button beside a result. The selected song and the later playable results become the playback queue.
6. Use pause/resume, previous/next, the seek slider, and volume.

The Spotify desktop app is not required: the SDK makes this browser a Spotify Connect device. Keep the page open while listening. Sign out removes this app's local session; it does not sign you out of spotify.com or revoke consent from your Spotify account.

For automatic server restarts while editing:

```bash
npm run dev
```

Refresh the browser after changing frontend files. Stop the server with `Ctrl+C`.

## How it works

1. **Sign-in:** Express sends the user to Spotify with the requested permissions and a random OAuth state value.
2. **Callback:** Spotify redirects to `/auth/callback`. Express checks the state and exchanges the authorization code for tokens using the Client Secret.
3. **Session:** Tokens stay in a server-side session. The browser receives an HTTP-only session cookie.
4. **Search:** The frontend calls `/api/search`; Express calls Spotify's `/search` endpoint.
5. **Playback:** The browser SDK creates a device. The frontend sends that device ID and track URIs to Express, which sends playback commands to Spotify.
6. **Audio:** Spotify streams protected audio directly to the browser SDK. Node handles authentication and commands; it does not download, store, or stream MP3 files.
7. **Refresh:** Express renews expiring access tokens. The SDK obtains a short-lived access token through `/api/token`; the Client Secret and refresh token remain on the server.

Play/pause/skip commands go through the Node backend. Seeking and volume use the SDK's local-player methods. The frontend reads local SDK state to update the progress bar.

## Files to study

| File | Purpose |
| --- | --- |
| `server.mjs` | Express server, OAuth flow, sessions, token refresh, and Spotify API routes |
| `public/index.html` | Login, search results, and player controls |
| `public/app.js` | Frontend requests, SDK events, and UI updates |
| `public/style.css` | Responsive layout and styling |
| `.env.example` | Environment variable template |
| `package.json` | Dependencies and commands |
| `package-lock.json` | Exact installed dependency versions |
| `test/server.test.mjs` | Backend tests with simulated Spotify responses |

Suggested study order: start with `/api/search`, follow its use in `public/app.js`, then read `/auth/login` and `/auth/callback`, and finally the player routes and SDK setup.

## Backend endpoints

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/health` | Local server health |
| GET | `/auth/login` | Start Spotify sign-in |
| GET | `/auth/callback` | Complete the OAuth flow |
| GET | `/api/session` | Check sign-in and obtain the CSRF token |
| GET | `/api/me` | Get a display name |
| GET | `/api/token` | Supply a short-lived token to the browser SDK |
| GET | `/api/search?q=...` | Return up to 10 tracks |
| PUT | `/api/transfer` | Choose the SDK playback device |
| PUT | `/api/play` | Play supplied track URIs or resume |
| PUT | `/api/pause` | Pause playback |
| POST | `/api/next` | Skip to the next track |
| POST | `/api/previous` | Go to the previous track |
| POST | `/api/logout` | Destroy the local session |

Mutation requests require the session cookie and `X-CSRF-Token` from `/api/session`. The frontend handles these automatically. Device commands accept a JSON `deviceId`; `/api/play` also accepts an optional `uris` array of 1–10 Spotify track URIs. Omit `uris` to resume. Successful player commands return **204 No Content**, which has no JSON body.

The OAuth scopes are `streaming`, `user-read-email`, `user-read-private`, and `user-modify-playback-state`. They cover SDK compatibility, the profile request, and playback commands. The app only displays the user's display name, and it does not rely on the `product` or `email` profile fields, which are absent in development-mode responses under the February 2026 changes.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| Server asks you to set an environment variable | Copy `.env.example` to `.env`, fill in real credentials and a random session secret, and restart. |
| Invalid redirect URI | Register `http://127.0.0.1:3000/auth/callback` exactly, with the same port and path as `.env`. |
| Login state is invalid | Open the app at `127.0.0.1`, allow cookies, and start sign-in again. A callback URL cannot be reused. |
| 403 / Spotify denied access | Check the app owner's Premium subscription, the listening user's Premium subscription, the app user allowlist, and consent scopes. |
| Player initialization fails | Use a supported browser and enable protected content. Check whether an extension blocks Spotify's SDK. |
| No active device / 404 | Wait for Ready, click Use this browser, then play the song again. |
| Browser blocks playback | Click the song's play button again. The app calls `activateElement()` from the click event. |
| Song is unavailable | Try a different track; availability depends on the account and Spotify's catalog restrictions. |
| Session expired | Sign in again. Normal token expiry is refreshed automatically; revoked authorization requires a new sign-in. |
| 429 / rate or quota limit | Follow the displayed retry delay when one is supplied. Do not repeatedly click search. |
| Port already in use | Stop the other process, or change `PORT`, `SPOTIFY_REDIRECT_URI`, and the registered dashboard callback together. |

## Validation and scope

Run the included checks:

```bash
npm test
```

The 12 backend tests cover login and OAuth state validation, session isolation, CSRF checks, search validation, playback requests and 204 responses, refresh, bounded 401 retries, rate-limit handling, logout, and configuration. They use simulated Spotify responses and need no Spotify credentials.

Browser checks used a simulated SDK to exercise login, connection, search, playback controls, volume, responsive layout, and logout. **Live Spotify OAuth and audible playback were not tested** because no real credentials or Premium session were supplied. After setup, verify them with your own account.

This is a local starter: Express's default in-memory session store loses sessions on restart and is not suitable for production hosting. The server binds to `127.0.0.1` and validates a local callback. Public hosting would need HTTPS, a persistent session store, deliberate proxy/cookie configuration, and revised origin/callback validation.

## Official references

Implementation checked against Spotify documentation on 16 October 2026:

- [Authorization code flow](https://developer.spotify.com/documentation/web-api/tutorials/code-flow)
- [Redirect URI requirements](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri)
- [Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk)
- [SDK methods and events](https://developer.spotify.com/documentation/web-playback-sdk/reference)
- [Start/resume playback](https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback)
- [Authorization scopes](https://developer.spotify.com/documentation/web-api/concepts/scopes)
- [Development mode and user access](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)
- [February 2026 API changes](https://developer.spotify.com/documentation/web-api/references/changes/february-2026)
- [July 2026 API changes](https://developer.spotify.com/documentation/web-api/references/changes/july-2026)

The search route uses `limit=10` for development-mode compatibility. The project uses official playback rather than the deprecated/unreliable `preview_url` field. It is an independent learning project and is not affiliated with Spotify.
