# Zentra

An original social platform ("Aurora Social" design system) built with React + Vite + Tailwind
on the frontend and Node.js + Express + MongoDB + Socket.IO on the backend.

## Status: Phase 1–11 complete and runnable (Foundation, Auth, User system, Social posts, Stories & Reels, Real-time chat, Voice/video calling, Communities & Events, Search/Explore/Notifications, Privacy/Safety/Moderation, AI Assist/Live Rooms/Recommendations)

### Post-Phase-9 QA pass
A full audit of the codebase against the master spec turned up three real, verified issues,
all now fixed:
- **Calling was silently broken end-to-end** despite being marked complete — see the note under
  "Voice/video calling" below for the full list of what was missing and what got wired up.
- **Calls were completely silent** — no ringback or ringtone on either side. Fixed with a
  synthesized Web Audio tone (see the note under "Voice/video calling").
- **Dark/light mode toggled state but never changed anything visually** — every theme color
  was a fixed hex value with nothing for the `.light` class to affect. Fixed by moving to CSS
  custom properties (see the note under "Settings").
- **The mobile "+" create button pointed at a `/create` route that doesn't exist**, silently
  bouncing to `/home` via the catch-all with no composer in view. It now navigates to `/home`
  (if needed) and scrolls the always-present composer into view.

One additional report — that accepting a friend request also creates a mutual follow — was
investigated but not reproduced: `acceptRequest` only touches the `friends` array, never
`followers`/`following`, and the client keeps `isFriend` and `isFollowing` completely separate
in both the Profile page and `FollowButton`. If this is still happening, it'd help to know
exactly which screen/button shows it, since the code path that would need to cause it doesn't
currently exist.

- **"Add friend" was genuinely broken, not just visually**: the button's "Request sent" state
  was local React state only — never read from the server — so it silently reset to
  "Add friend" on every page reload or revisit, and clicking it again threw an unhandled 409
  the UI never surfaced. Separately, the `FriendRequest` schema had a hard unique index on
  `(from, to)` with no status scoping, so once *any* request had ever existed between two
  people — even a long-rejected one — sending a new one failed with an unhandled 500 forever
  after. Fixed both: `getProfile` now derives real `friendRequestStatus`
  (`none`/`pending_sent`/`pending_received`/`friends`) from the database, the unique index is
  scoped to pending requests only (`partialFilterExpression: { status: 'pending' }`), and the
  new `AddFriendButton` component flips to "Request sent" the instant you click — optimistic,
  Facebook-style — with a hover state to cancel, plus inline Accept/Decline when someone has
  already sent *you* a request.

Everything else audited (auth, posts, stories/reels, chat REST + socket wiring, communities/
events, search, explore, notifications, upload/media validation, env config, and package
dependencies) was internally consistent with no changes needed.

What works right now:
- Full client/server project structure
- Aurora Social design tokens wired into Tailwind (dark mode default, light mode ready)
- **Animated navigation**: sidebar has a spring-based sliding active-pill indicator (via
  framer-motion `layoutId`), icon micro-interactions on hover/active, and an animated mobile
  bottom nav with a bouncy gradient create button
- Register / Login / Logout with JWT (httpOnly cookie) + bcrypt password hashing
- Protected routes on the frontend, `protect` middleware on the backend
- Rate limiting, Helmet, CORS, Mongo sanitization, centralized error handling
- **Real-time chat**: Socket.IO-backed messaging (auth'd off the same JWT cookie as the REST
  API) with 1:1 and group conversations, typing indicators, online/last-seen presence, sent →
  delivered → read receipts, image/video/voice messages (voice recorded in-browser via
  MediaRecorder, all media through the same GridFS upload path), replies, delete-for-everyone,
  and reactions. REST endpoints cover conversation/message history and management (create
  group, add/remove member, leave); the live send/typing/presence/read events run over sockets.
- Media storage via MongoDB GridFS (same Atlas cluster, no third-party account) — streamed
  through `/api/media/:id` with HTTP range support
- Profile page: avatar + cover upload, edit name/bio, privacy settings endpoint
- Follow / unfollow, and a full friend-request flow (send / accept / reject / remove)
- **Social posts**: create (text, photo, video, poll), a following-based feed with cursor
  pagination, like/unlike, comments with one level of nested replies, share count, save/unsave,
  and poll voting with animated result bars
- **Tag people** (explicit picker, separate from the caption) and **@mentions** typed directly
  into the caption with live autocomplete — both resolve through a shared `/api/users?q=` search
- **Full-view media lightbox**: click any post image/video to open it full-screen (Esc or
  backdrop click to close)
- **Profile posts tab**: every post a user has made appears on their profile (respecting post
  visibility for other viewers), and the author can delete any of their own posts from either
  the feed or their profile
- **Stories**: photo/video/text stories with a real MongoDB TTL index so they auto-delete after
  24 hours (no cron job needed), grouped story bar with viewed/unviewed gradient rings, a
  fullscreen viewer with per-story progress bars and auto-advance, and view tracking
- **Reels**: any video post can be flagged "Make this a Reel" at creation, surfaced in a
  dedicated vertical, swipe-to-scroll `/reels` feed with autoplay-on-scroll (via
  IntersectionObserver) and the same like/comment/share/save actions as regular posts
- **Story enhancements**: text overlays on photo/video stories, story captions, a trending
  "sound library" (Song model + seed data) that lets any story type add a song — for video
  stories, the user can keep the original clip audio, replace it with the chosen song, or layer
  both — plus a confirm-and-delete option available any time within the 24-hour window
- **Fixed page-scrolling**: the app now lives inside one fixed-height shell with a single scroll
  container per column, instead of the page and inner panes both scrolling independently
- **Fixed: profiles weren't reachable from chat**: the 1:1 chat header (avatar + name) is now a
  real link to that person's profile; group chat headers show stacked member avatars that open
  a members list (each one linking out too); and incoming group messages now show the sender's
  avatar/name — clickable — instead of leaving every bubble unattributed. While auditing this,
  also fixed a few related rough edges: tagged-people and comment-author links now use
  client-side routing instead of full-page reloads, and the Reels follow button reflects the
  viewer's real follow state instead of always showing "Follow"
- **Voice/video calling**: real WebRTC peer connections (offer/answer/ICE exchanged over the
  same socket connection as chat), a ringing → accept/reject → connected → end lifecycle with
  call history persisted to Mongo, mute/camera/speaker controls, and a premium fullscreen call
  screen with a glassmorphism control panel and a draggable local-video preview. ICE servers
  come from **Twilio's Network Traversal Service** when configured — no server to run,
  credentials are short-lived and minted per call — falling back to public STUN (+ an optional
  self-hosted TURN var) if Twilio isn't set up; see "Setting up calling with Twilio" below.
  A missed call (the other side never answers before disconnecting) writes a `missedCall`
  notification, delivered the same way as likes/comments/follows.
  - **Post-QA fix**: this feature was fully coded but not actually wired end-to-end —
    `callRoutes` was never mounted on the server, the server had no `call:invite` /
    `call:accept` / `call:reject` / `call:end` socket handlers (so no `Call` document was
    ever created and no ringing/accept flow could happen), `CallProvider` was never wrapped
    around the app, `CallScreen`/`IncomingCallModal` were never rendered, and the call
    buttons in `ChatWindow` had no click handlers. All of that is now connected: tapping the
    phone/video icons in a 1:1 chat places a real call, and a call history icon in the
    Messages header opens `CallHistoryModal`.
  - **Also fixed: calls were completely silent.** Neither side heard a ringback or ringtone —
    `utils/ringtone.js` now synthesizes both with the Web Audio API (oscillator tones, no MP3
    asset to ship or go missing), wired to `CallContext`'s call state so it starts/stops
    automatically as a call rings out, rings in, connects, or ends.
- **Communities**: create/edit communities (public or private), join/leave, invite members,
  moderator roles, a per-community post feed, and a lazily-created community group chat.
- **Events**: create events (standalone or attached to a community), RSVP as Going/Interested,
  and participant counts.
- **Notifications (Phase 9)**: a `Notification` model plus a real-time `notify()` helper wired
  into likes, comments (including replies), follows, and friend requests/accepts. Notifications
  persist to Mongo and push instantly over the same Socket.IO connection as chat/calls — the
  navbar bell shows a live unread badge and a dropdown preview, and `/notifications` has the
  full paginated list with mark-all-read, per-item delete, and clear-all.
- **Search (Phase 9)**: `GET /api/search?q=` covers users, posts, hashtags (parsed from
  captions), communities, and events in one call, with a `type` filter for each category. The
  navbar search box shows a live debounced dropdown; `/search?q=` has the full tabbed results
  page.
- **Explore (Phase 9)**: `GET /api/explore` returns trending posts/reels (ranked by
  likes + comments + shares over the last 7 days), trending hashtags, people you may know, and
  suggested public communities — rendered on `/explore`.
- **Settings**: theme switcher (persisted both to `localStorage` and the user's account),
  per-category privacy controls (posts/messages/calls/stories), a private-account toggle,
  a blocked-accounts list with unblock, and account deactivation.
  - **Post-QA fix**: dark/light mode toggled state correctly but nothing on screen actually
    changed. Root cause: every `aurora-*` color was a fixed hex value in `tailwind.config.js`,
    so adding a `.light` class had no CSS rule to trigger — there was nothing to switch
    *to*. Fixed by moving every theme color to a CSS custom property (`index.css`, keyed off
    `:root.light`) that Tailwind's utilities now reference via `rgb(var(--x) / <alpha-value>)`.
    Every component that already used `bg-aurora-bg`, `text-aurora-text-muted`, etc. repaints
    correctly with no per-component changes needed.

Everything else in the master spec (AI features, live rooms) is **not yet built** — it will be
added phase by phase, matching the order in the brief, so nothing is faked or stubbed to "look
done."

### Friend requests — rebuilt to a specific spec
The full lifecycle now matches an exact spec rather than a rough approximation of one:
- Sending a request flips the "Add friend" button to "Request sent" **instantly** (optimistic —
  doesn't wait on the network), with a hover state to cancel it.
- The recipient gets a notification with inline Accept/Decline.
- **Accepting also makes the two people mutual followers** — both gain each other in their
  `followers` *and* `following` lists, not just `friends`.
- **Unfriending undoes that** — both people are removed from each other's followers/following,
  not just the friends list.
- A new request can always be sent again after an unfriend (or a past rejection) — the only
  thing that permanently blocks a request is one side blocking the other.
- Added a real friends list (`GET /api/users/:username/friends`, a `FriendsListModal`, a
  clickable "Friends" count on the profile) with unfriend available from both the list and the
  profile's Friends button.
- **A crash from an incomplete refactor, caught via a live console error**: when the
  server-derived friend-request state replaced the old local-only state, one stray call to
  the old state's setter (`setFriendRequestSent`) got left behind in a `useEffect` — since
  that state no longer existed, this threw on every single profile page load and crashed the
  whole component tree (a blank page, in practice). Removed the leftover call, then swept the
  rest of the client for the same pattern (a setter called with no matching `useState`
  declaration) to check nothing else from that refactor was missed — nothing else was.
- **Hardened against a double-submit race**: `disabled={busy}` only takes effect after React
  re-renders, which isn't synchronous — a fast double-click could fire `AddFriendButton`'s
  handler twice before the button visually disabled, with the second call correctly (if
  confusingly) rejected as a duplicate. Added a `useRef` guard that blocks re-entry
  synchronously, independent of render timing.
- **Friends are automatically added to chat**: accepting a request now also creates the direct
  conversation between the two people (`ensureDirectConversation`, shared with the "New
  message" flow), so a new friend shows up in both people's Messages list immediately — no
  manual search needed. If conversation creation somehow fails, it's logged rather than
  blocking the friend acceptance itself.
- **Two real bugs fixed along the way**: the "Request sent" state used to be local React state
  only, so it silently forgot a pending request on every reload; and the `FriendRequest`
  schema's unique index wasn't scoped to `pending` status, so *any* prior request between two
  people — even a long-resolved one — made a new request throw an unhandled 500 forever after.
- **A third bug in the same area, found after the fix above shipped**: re-sending a request
  after unfriending someone still failed with a 409, even though the code correctly scoped the
  unique index to `pending` status. The reason took a specific repro to find: **Mongoose's
  `autoIndex` only creates indexes that don't exist yet — it never retroactively fixes an index
  that already exists under the old, stricter definition.** Any database that had already run
  this app before that schema fix kept enforcing the *old* rule (unique across every status,
  not just pending) forever, with no error or warning at startup. Fixed properly this time: the
  server now calls `Model.syncIndexes()` for every model on startup, which reconciles the live
  database against the current schema — dropping indexes that no longer match and creating
  ones that are missing — so this exact class of bug (an index definition changing after the
  app has already run once) can't silently reappear the next time a schema changes.

### Phase 10 — Privacy, Safety & Moderation
Sections 39 (privacy) and 40 (safety) of the master spec. The privacy half was largely
already in place from earlier phases; the safety half did not exist at all.

**Privacy — closing gaps in what was already there**
- **`isPrivate` was stored but never actually enforced anywhere.** A private account's posts
  were fully readable by anyone who visited the profile. `getUserPosts` now gates on it
  server-side (followers and friends only), and returns an `isContentLocked` flag so the UI
  can explain *why* a profile looks empty instead of just showing nothing. The profile
  endpoint still returns identity (name, avatar, bio, counts) so a private account stays
  findable and followable — only its content is restricted.
- Blocked users are now excluded from each other's content in both directions, not just one.
- **Mute**, which the spec calls for separately from blocking: one-directional and silent.
  The muted person is never notified, keeps full access, and can still follow and message —
  their posts just stop appearing in the muter's feed. That silence is the entire point of
  muting existing alongside blocking, so it's deliberately *not* surfaced to them anywhere.
- **Close friends** list added — the `closeFriends` story-privacy option already existed as an
  enum value with no underlying list to check against, so selecting it did nothing.

**Safety & moderation — built from scratch**
- A single `Report` model covers all six reportable types (user, post, comment, message,
  community, event) via `targetType` + `target`, rather than a separate collection per type —
  which keeps the moderation queue one sorted list instead of a merge across collections. A
  partial unique index stops one person spamming duplicates of the same report, while still
  allowing a fresh report later if an earlier one was already resolved.
- `ReportModal` is reusable across every content type and is wired into posts. Worth noting
  what this fixed: `PostCard`'s options menu previously rendered **only** for owners and
  moderators, so ordinary users had no way to report anything at all — the feature was
  unreachable rather than merely missing.
- Moderator dashboard at `/moderation` (queue, status tabs, target previews so reports can be
  judged without clicking through blind, and real resolution actions: dismiss / delete content
  / suspend author). Gated by a new `role` field (`user` / `moderator` / `admin`) that
  deliberately defaults to `user` — promoting the first moderator is an intentional
  operational step, not something the app grants automatically.
- Suspension is enforced on post/comment/story creation **and** separately inside the socket
  message handler, since that path bypasses Express middleware entirely and would otherwise
  have let a suspended account keep messaging. Suspended users can still log in and read — so
  they can see *that* they're suspended rather than experiencing a silently broken app — and
  expired suspensions clear themselves on the next request instead of needing a scheduled job.
- Account deletion (distinct from the existing deactivation) anonymizes the account and pulls
  the user out of everyone else's follower/friend/block/mute lists, rather than hard-deleting
  the row — otherwise every conversation, comment thread and report referencing them would
  collapse into broken references.

### Phase 11 — AI, Live Rooms, Collaborative Posts & Recommendations
Section 38 (AI, explicitly optional), section 36 (live rooms), section 35 (collaborative
posts — turned out to already be modeled and posted correctly from an earlier phase, just
missing a way to actually pick co-authors in the UI), and the "advanced recommendations"
called for across sections 9/45/48.

**AI Assist — optional by design, not faked**
- `server/services/aiService.js` is the entire seam between the app and any AI provider.
  With `AI_PROVIDER` unset (the default), every AI endpoint returns a clear 503 "not
  configured" response instead of a fake result or a silent failure — section 51's rule
  against pretending unimplemented features work applies here too. Set
  `AI_PROVIDER=anthropic` plus `ANTHROPIC_API_KEY` to turn it on (paid, per-token), or
  `AI_PROVIDER=groq` plus a free `GROQ_API_KEY` (console.groq.com/keys, no card required)
  for a no-cost option; adding a further provider later only touches this one file.
- Three endpoints under `/api/ai`, all suspension-gated and on their own tight rate limiter
  (AI calls are comparatively expensive): caption suggestions from a rough description,
  rewriting an existing caption, and translation. Wired into `PostComposer` as an "✨ AI
  Assist" panel that checks `/api/ai/status` once and shows a plain explanation instead of
  buttons if nothing is configured.
- **AI Chat** (`/ai-chat`) — a general "ask anything" page, separate from the narrow
  caption/rewrite/translate tools above. One persisted conversation per user
  (`AiConversation` model); no cap on stored history or on how much gets replayed to the
  model per turn — the full conversation is sent every time. That means cost/latency grow
  with length, and a long enough conversation will eventually hit the provider's own
  context-window limit (not something this app controls) — the "Clear" button in the UI is
  the reset valve if that happens. Reachable from a sparkle icon in the top navbar (works
  on both desktop and mobile — the mobile bottom nav is a fixed 5 items per section 54, so
  it deliberately wasn't added there) and from the desktop sidebar. Not suspension-gated,
  since it's a private conversation with the AI rather than content other users ever see.

**Live Rooms — architecture that can grow, not a full broadcast stack on day one**
- New `LiveRoom` model + `/api/live-rooms` routes (start, list active, end) plus
  `liveroom:*` Socket.IO events for joining, leaving, signaling, live comments, and heart
  reactions. Deliberately **one-to-many, not a full mesh**: the host is the only peer
  publishing media, and each viewer gets a direct receive-only connection to the host. That
  keeps signaling simple and works well for a small-to-medium audience; a real large-scale
  broadcast would need an SFU media server, which is out of scope for this first pass but
  doesn't require touching the data model to add later.
- If the host disconnects, the room is closed server-side automatically (both from the
  explicit `/end` call and from the socket `disconnect` handler) rather than leaving a
  "live" room with nobody broadcasting.
- New `/live` (browse + go live) and `/live/:roomId` (broadcast/viewer screen) pages, with
  glassmorphism overlay controls matching the calling UI's visual language.

**Collaborative posts — UI gap closed**
- The `Post` model, `postController`, and API already supported `coAuthorUsernames` from an
  earlier phase; there was just no way to add a co-author from the compose box. Reused
  `TagPeoplePicker` (now takes a `label`/`icon` prop) as a second picker for this instead of
  writing a near-duplicate component.

**Recommendations — heuristic, not ML**
- `getExplore` previously suggested people by recency alone. "People You May Know" now
  ranks candidates by mutual-connection count (how many people you already follow also
  follow them), falling back to recency only when you don't follow anyone yet for mutuals
  to be meaningful against.
- A new `recommendedPosts` section ranks posts by affinity to hashtags you've recently
  liked, rather than pure global trending — returns empty (not a random fallback) when
  there isn't enough like history to infer anything from yet, so the UI can distinguish "no
  data" from "nothing matched."

### Scaling & production-readiness pass
A few things here only matter once real traffic shows up, which is exactly when they're easy
to miss until something breaks:
- **The rate limit was genuinely too low for this app.** 300 requests/15min sounded generous
  but a single session's normal use (initial load pulls the feed, stories, notifications, plus
  a request per debounced keystroke in search/mention/tag inputs) could exhaust it within
  minutes — before counting more than one person sharing an IP. Raised to a configurable
  `RATE_LIMIT_MAX` (default 2000); auth endpoints keep their own separate, stricter limiter.
- **`trust proxy` wasn't set.** Any real deployment (Render, Railway, Heroku, Nginx,
  Cloudflare, a load balancer) sits at least one hop in front of the app. Without this, every
  request's IP resolves to the proxy's own address — meaning the rate limiter above would put
  *all* traffic from *everyone* into one shared bucket, and secure-cookie/HTTPS detection can
  misbehave too. Now configurable via `TRUST_PROXY` (defaults to 1 hop).
- **CORS only supported one origin.** Now reads a comma-separated `CLIENT_URLS` (falls back to
  the original `CLIENT_URL`) so a production domain, a staging domain, and local dev can all be
  allowed without code changes.
- Added gzip compression, a configurable MongoDB connection pool size (`MONGO_MAX_POOL_SIZE`),
  a fail-fast connection timeout, graceful shutdown on `SIGTERM`/`SIGINT` (finishes in-flight
  requests and closes the DB connection cleanly instead of dropping them on deploy/restart),
  and a short in-memory cache on Explore's trending aggregations so that expensive computation
  doesn't re-run on every single page load under load.
- **Added an optional Redis adapter for Socket.IO**, off by default. This one only matters if
  you ever run more than one server instance/replica: Socket.IO's default in-memory broadcast
  only reaches users connected to the *same* process that triggered an event, so real-time
  features would silently miss some users across instances without it. Set `REDIS_URL` to
  enable it; leave it blank and nothing changes for a single-instance deployment.
- **Likely root cause of "pages not opening correctly" after deploying**: both `api.js` and
  `socket.js` used relative URLs (`/api`, `/`), which only work when the frontend and backend
  share an origin. If they're deployed separately (frontend on Vercel/Netlify, backend on
  Render/Railway/EC2 — a very common split), every API call and the socket connection would
  silently target the frontend's own domain and fail, which looks exactly like "nothing loads."
  Added `VITE_API_URL`/`VITE_SOCKET_URL` build-time overrides (see `client/.env.example`) for
  exactly this case; same-origin deployments and local dev are unaffected since both still
  default to a relative path.
- None of this replaces running more than one CPU core under real load — Node is
  single-threaded per process. For actual scale, run this behind PM2 in cluster mode or as
  multiple container replicas behind a load balancer, and set `REDIS_URL` once you do (see
  above) so chat/notifications/calls keep working correctly across instances.

### Why GridFS instead of a separate media service
The original spec suggested Cloudinary-style object storage. Per your instruction, media now
stays inside MongoDB Atlas using GridFS, which chunks files >255KB automatically and streams
them back out — so there's no extra account, API key, or service to configure. The trade-off
to know about: GridFS reads/writes go through your MongoDB cluster's I/O and storage quota,
so if this app ever needs to serve heavy video traffic at scale, a CDN-backed object store
would offload that load. Fine to revisit later if usage grows.

## Running it locally

You'll need Node.js 18+ and a MongoDB connection (MongoDB Atlas free tier works fine).

### 1. Backend
```bash
cd server
cp .env.example .env
# edit .env: set MONGO_URI to your Atlas connection string, and JWT_SECRET to a random string
npm install
npm run dev
```
The API runs on `http://localhost:5000`. Check `http://localhost:5000/api/health`.

### 2. Frontend
```bash
cd client
npm install
npm run dev
```
The app runs on `http://localhost:5173` and proxies `/api` and `/socket.io` to the backend.
(Deploying frontend and backend to different domains? Copy `client/.env.example` to `.env`
and set `VITE_API_URL`/`VITE_SOCKET_URL` first — see "Scaling & production-readiness" above.)

### 3. Try it
Open `http://localhost:5173`, register an account, and you'll land on the home feed.

### 4. Making yourself a moderator
The moderation dashboard at `/moderation` is gated on the `role` field, which defaults to
`user` for everyone — there's intentionally no in-app way to grant it, since an app that can
hand out its own moderator powers isn't much of a control. Promote an account directly in the
database (via `mongosh` or the Atlas UI):

```js
db.users.updateOne({ username: "your_username" }, { $set: { role: "moderator" } })
```

Use `"admin"` instead for an account that should also be able to change other users' roles.
Log out and back in afterwards so the new role is picked up.

## Roadmap (matches the master spec's phases)

- [x] Phase 1 — Foundation
- [x] Phase 2 — Authentication
- [x] Phase 3 — User system (profile, avatar/cover via GridFS, follow, friend requests)
- [x] Phase 4 — Social posts (create, feed, like, comment, share, save, polls)
- [x] Phase 5 — Stories & Reels
- [x] Phase 6 — Real-time chat (Socket.IO)
- [x] Phase 7 — Voice/video calling (WebRTC)
- [x] Phase 8 — Communities, polls, events
- [x] Phase 9 — Search, Explore, trending, notifications
- [x] Phase 10 — Privacy, blocking, reporting, moderation
- [x] Phase 11 — AI features, live rooms, collaborative posts, recommendations

## Notes on things that need real infrastructure

A few pieces in the master spec can't be simulated locally and need real accounts/services when
you get to them:
- **Media storage**: handled by GridFS on your existing MongoDB Atlas cluster — no separate account needed. A free M0 cluster works through most phases; if video/voice traffic grows a lot later, that's the point to reconsider a CDN-backed object store.
- **WebRTC calling** (Phase 7): works out of the box on public STUN, but for reliable calls
  across real-world networks (strict NATs, corporate firewalls) you want a TURN server too —
  see "Setting up calling with Twilio" right below.

## Setting up calling with Twilio

The app is wired to use [Twilio's Network Traversal Service](https://www.twilio.com/docs/stun-turn)
(NTS) for call relaying — no TURN server to run or maintain yourself. Setup:

1. Grab your **Account SID** and **Auth Token** from the [Twilio Console](https://console.twilio.com)
   dashboard (a free trial account works for testing).
2. Paste them into `server/.env`:
   ```
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   ```
3. Restart the server. That's it — `GET /api/calls/ice-servers` now mints a short-lived
   (24-hour by default, tune with `TWILIO_NTS_TTL_SECONDS`) STUN/TURN credential per call
   instead of falling back to STUN-only. Your actual Twilio credentials stay server-side; only
   the short-lived username/password pair Twilio issues is ever sent to a browser.

Note Twilio NTS is billed per use (it's a paid add-on even on some trial accounts depending on
balance) — check current pricing on their site before relying on it in production.

If those two vars are left blank (or the Twilio request fails for any reason — e.g. an
exhausted trial balance), calling still works using public STUN — it'll just be less reliable
on networks that need a full TURN relay, which the fallback doesn't silently hide: check the
server logs if calls seem to connect inconsistently once you're testing across real networks
rather than localhost.
