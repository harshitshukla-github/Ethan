const $ = (id) => document.getElementById(id);
let csrfToken = null;
let authenticated = false;
let player = null;
let deviceId = "";
let selectedBrowser = false;
let busy = false;
let currentState = null;
let tracks = [];
let searchVersion = 0;
let seeking = false;

function message(text, isError = false) {
  $("message").textContent = text;
  $("message").dataset.error = String(isError);
}

function setAuthenticated(value) {
  authenticated = value;
  $("login-panel").hidden = value;
  $("app-panel").hidden = !value;
  $("logout").hidden = !value;
  if (!value) {
    player?.disconnect();
    deviceId = "";
    selectedBrowser = false;
    $("user-name").textContent = "";
  }
}

async function api(path, method = "GET", body) {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(body !== undefined && { "Content-Type": "application/json" }),
      ...(csrfToken && { "X-CSRF-Token": csrfToken }),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(20000),
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    if (response.status === 401) setAuthenticated(false);
    throw new Error(data?.error || `Request failed (${response.status}).`);
  }
  return data;
}

function time(ms = 0) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function safeUrl(raw, spotifyOnly = false) {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" &&
      (!spotifyOnly || url.hostname === "open.spotify.com")
      ? url.href
      : "";
  } catch {
    return "";
  }
}

function updateControls() {
  const ready = Boolean(deviceId) && !busy;
  const active =
    ready &&
    selectedBrowser &&
    Boolean(currentState?.track_window?.current_track);
  const disallows = currentState?.disallows || {};
  $("connect-player").disabled = !ready;
  $("toggle").disabled =
    !active ||
    Boolean(currentState?.paused ? disallows.resuming : disallows.pausing);
  $("previous").disabled = !active || Boolean(disallows.skipping_prev);
  $("next").disabled = !active || Boolean(disallows.skipping_next);
  $("seek").disabled = !active || Boolean(disallows.seeking);
  $("volume").disabled = !ready;
  document.querySelectorAll(".track-play").forEach((button) => {
    button.disabled =
      !ready || !selectedBrowser || button.dataset.playable !== "true";
  });
}

async function action(work) {
  if (busy) return;
  busy = true;
  updateControls();
  try {
    await work();
  } catch (error) {
    message(error.message || "Something went wrong. Please try again.", true);
  } finally {
    busy = false;
    updateControls();
  }
}

function renderState(state) {
  currentState = state;
  const track = state?.track_window?.current_track;
  $("track-name").textContent = track?.name || "Make room for music.";
  $("track-artists").textContent =
    track?.artists?.map((artist) => artist.name).join(", ") ||
    "Choose a song from your search.";
  const image = safeUrl(track?.album?.images?.[0]?.url);
  $("cover").hidden = !image;
  $("cover-placeholder").hidden = Boolean(image);
  if (image && $("cover").src !== image) $("cover").src = image;
  const link = track?.uri?.match(/^spotify:track:([a-zA-Z0-9]{22})$/);
  $("track-link").hidden = !link;
  if (link) $("track-link").href = `https://open.spotify.com/track/${link[1]}`;
  $("toggle").textContent = state && !state.paused ? "Ⅱ" : "▶";
  $("toggle").setAttribute(
    "aria-label",
    state && !state.paused ? "Pause" : "Play",
  );
  if (!seeking) {
    $("seek").max = String(state?.duration || 1);
    $("seek").value = String(state?.position || 0);
    $("elapsed").textContent = time(state?.position);
  }
  $("duration").textContent = time(state?.duration);
  document
    .querySelectorAll(".track-row")
    .forEach((row) =>
      row.classList.toggle("is-playing", row.dataset.uri === track?.uri),
    );
  updateControls();
}

function renderTracks() {
  $("results").replaceChildren();
  $("empty-state").hidden = tracks.length > 0;
  $("results-count").textContent =
    `${tracks.length} track${tracks.length === 1 ? "" : "s"}`;
  tracks.forEach((track, index) => {
    const row = document.createElement("li");
    row.className = "track-row";
    row.dataset.uri = track.uri;
    const imageUrl = safeUrl(track.image);
    const image = document.createElement(imageUrl ? "img" : "div");
    image.className = "track-art";
    if (imageUrl) {
      image.alt = `${track.album || track.name} artwork`;
      image.src = imageUrl;
      image.loading = "lazy";
    } else image.setAttribute("aria-hidden", "true");
    const info = document.createElement("div");
    info.className = "track-info";
    const url = safeUrl(track.url, true);
    const title = document.createElement(url ? "a" : "span");
    title.className = "track-title";
    title.textContent = track.name;
    if (url) {
      title.href = url;
      title.target = "_blank";
      title.rel = "noopener noreferrer";
    }
    const subtitle = document.createElement("span");
    subtitle.className = "track-subtitle";
    subtitle.textContent = `${track.artists}${track.playable ? "" : " · Unavailable"}`;
    info.append(title, subtitle);
    const duration = document.createElement("span");
    duration.className = "track-time";
    duration.textContent = time(track.duration);
    const play = document.createElement("button");
    play.className = "track-play";
    play.textContent = "▶";
    play.dataset.playable = String(track.playable);
    play.setAttribute("aria-label", `Play ${track.name} by ${track.artists}`);
    play.title = track.playable
      ? `Play ${track.name}`
      : "Unavailable for this account";
    play.addEventListener("click", () =>
      action(async () => {
        // Call this directly in the click event, before a network request.
        await player.activateElement();
        const uris = tracks
          .slice(index)
          .filter((item) => item.playable)
          .map((item) => item.uri);
        await api("/api/play", "PUT", { deviceId, uris });
        message(
          `Starting ${track.name}. The remaining search results follow in the queue.`,
        );
      }),
    );
    row.append(image, info, duration, play);
    $("results").append(row);
  });
  updateControls();
}

function loadSDK() {
  if (window.Spotify) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () =>
        reject(
          new Error(
            "Spotify player did not load. Check your connection or browser extensions, then reload.",
          ),
        ),
      20000,
    );
    window.onSpotifyWebPlaybackSDKReady = () => {
      clearTimeout(timeout);
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Could not load the Spotify player. Please reload."));
    };
    document.head.append(script);
  });
}

async function preparePlayer() {
  await loadSDK();
  if (!authenticated) return;
  player = new window.Spotify.Player({
    name: "Side A · Node Music Player",
    volume: 0.5,
    getOAuthToken: (callback) => {
      api("/api/token")
        .then((data) => callback(data.accessToken))
        .catch((error) => message(error.message, true));
    },
  });
  player.addListener("ready", ({ device_id }) => {
    deviceId = device_id;
    selectedBrowser = false;
    $("device-status").textContent = "Ready";
    $("connect-player").textContent = "Use this browser";
    message("Player ready. Choose “Use this browser”, then search for a song.");
    updateControls();
  });
  player.addListener("not_ready", () => {
    deviceId = "";
    selectedBrowser = false;
    renderState(null);
    $("device-status").textContent = "Offline";
    $("connect-player").textContent = "Waiting for connection…";
    message(
      "The player disconnected. Check your connection and reload if it does not reconnect.",
      true,
    );
  });
  player.addListener("player_state_changed", (state) => {
    if (state) selectedBrowser = true;
    renderState(state);
  });
  player.addListener("autoplay_failed", () =>
    message(
      "Your browser blocked playback. Click the song’s play button again.",
      true,
    ),
  );
  for (const event of [
    "initialization_error",
    "authentication_error",
    "account_error",
    "playback_error",
  ]) {
    player.addListener(event, (error) => {
      if (event !== "playback_error") {
        deviceId = "";
        selectedBrowser = false;
        $("device-status").textContent = "Unavailable";
        $("connect-player").textContent = "Reload to reconnect";
        updateControls();
      }
      message(
        event === "account_error"
          ? "Browser playback requires Spotify Premium for the signed-in account."
          : error.message,
        true,
      );
    });
  }
  if (!(await player.connect()))
    throw new Error(
      "The Spotify player could not connect. Reload to try again.",
    );
}

$("connect-player").addEventListener("click", () =>
  action(async () => {
    await player.activateElement();
    await api("/api/transfer", "PUT", { deviceId });
    selectedBrowser = true;
    $("connect-player").textContent = "Reconnect this browser";
    $("device-status").textContent = "This browser";
    message(
      "This browser is selected. Search for a song and press its play button.",
    );
  }),
);

$("search-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = $("query").value.trim();
  if (!query) return;
  const version = ++searchVersion;
  $("search-button").disabled = true;
  $("search-button").textContent = "Searching…";
  $("results").setAttribute("aria-busy", "true");
  try {
    const data = await api(`/api/search?q=${encodeURIComponent(query)}`);
    if (version !== searchVersion) return;
    tracks = data.tracks;
    $("results-title").textContent = `Results for “${query}”`;
    $("empty-state").textContent =
      "No songs found. Try another title or artist.";
    renderTracks();
    message(
      selectedBrowser
        ? "Press play beside a song to start listening."
        : "Choose “Use this browser” to enable playback.",
    );
  } catch (error) {
    message(error.message, true);
  } finally {
    if (version === searchVersion) {
      $("search-button").disabled = false;
      $("search-button").textContent = "Search";
      $("results").removeAttribute("aria-busy");
    }
  }
});

$("toggle").addEventListener("click", () =>
  action(async () => {
    await player.activateElement();
    await api(currentState?.paused ? "/api/play" : "/api/pause", "PUT", {
      deviceId,
    });
  }),
);
for (const route of ["previous", "next"]) {
  $(route).addEventListener("click", () =>
    action(() => api(`/api/${route}`, "POST", { deviceId })),
  );
}
$("volume").addEventListener("change", () =>
  action(() => player.setVolume(Number($("volume").value) / 100)),
);
$("seek").addEventListener("input", () => {
  seeking = true;
  $("elapsed").textContent = time(Number($("seek").value));
});
$("seek").addEventListener("change", () => {
  const position = Number($("seek").value);
  seeking = false;
  action(() => player.seek(position));
});
$("seek").addEventListener("blur", () => {
  seeking = false;
});
$("logout").addEventListener("click", () =>
  action(async () => {
    await api("/api/logout", "POST", {});
    player?.disconnect();
    window.location.assign("/");
  }),
);

// Read the SDK's local state; do not poll the Spotify Web API every second.
let readingState = false;
setInterval(async () => {
  if (!player || !deviceId || !authenticated || readingState || document.hidden)
    return;
  readingState = true;
  try {
    renderState(await player.getCurrentState());
  } catch {
    /* SDK connection events display connection errors. */
  } finally {
    readingState = false;
  }
}, 1000);
window.addEventListener("pagehide", () => player?.disconnect());

async function boot() {
  const error = new URLSearchParams(window.location.search).get("error");
  const errors = {
    invalid_state:
      "Login expired or the address changed. Open 127.0.0.1 and connect again.",
    access_denied:
      "Spotify sign-in was cancelled. Connect again when you are ready.",
    oauth_failed:
      "Login failed. Check the Client ID, Client Secret, and exact redirect URI in .env and Spotify settings.",
  };
  if (error) {
    message(errors[error] || "Please connect with Spotify again.", true);
    history.replaceState({}, "", "/");
  }
  try {
    const session = await api("/api/session");
    csrfToken = session.csrfToken;
    setAuthenticated(session.authenticated);
    if (!session.authenticated) return;
    const profile = await api("/api/me");
    $("user-name").textContent = profile.displayName;
    message("Preparing your browser player…");
    await preparePlayer();
  } catch (error) {
    message(error.message, true);
  }
}
boot();
