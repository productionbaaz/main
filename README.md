# Baaz Portal — React app (fully local, no backend)

Real React project (Vite). GitHub builds it automatically on every push.

## Architecture

Everything — logins, sheets, rows, attendance, bank details — lives in
this browser's localStorage. There is no server, no Apps Script, no
network call of any kind for app data. That's what makes every edit
instant, exactly like typing into a native app.

**The trade-off:** data is per-device/per-browser. An employee logging
in from their own computer has their own separate storage — they will
not see your client list, and you will not see their attendance,
unless you manually move data between devices (see below).

## Moving data between devices

Use each sheet's **Export CSV** / **Import CSV** buttons. Export from
one device, then import that same file on another device's copy of the
app to bring records across. There is no automatic sync.

## One-time setup on GitHub

1. Replace everything in your repo with the contents of this folder
   (all files and folders, including the hidden `.github` folder and
   `.gitignore`).
2. Settings → Pages → Source → "GitHub Actions".
3. Push/commit. Check the Actions tab for the build.

## URLs

- Employee login: `https://<you>.github.io/main/`
- Manager/CEO login: `https://<you>.github.io/main/manager.html`

Sign up once as Owner/Manager on the manager URL to get started, then
use Settings to create employee accounts and sheets.
