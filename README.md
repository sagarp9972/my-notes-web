# 📝 MyNotes — Smart Notes Web App

A fully working notes app: register/login/forgot password, a dashboard with
live stats, notes with 35 categories, color/icon folders, favorites, a
calendar with per-day tasks, trash, profile, and settings (dark mode,
language, notifications, export). No server or install needed — it runs
entirely in the browser using `localStorage` as its database.

## How to run it

1. Unzip the folder.
2. Double-click **`index.html`** (or open it in Chrome/Edge/Firefox) —
   or, for the smoothest experience, open the folder in VS Code and use the
   **Live Server** extension (right-click `index.html` → "Open with Live
   Server").
3. Click **Register Here**, create an account, then log in.

That's it — no Node, no server, no build step.

> Note: because it uses the browser's local storage, your data stays on
> that one browser/device only. Registering on a laptop and opening the site
> on a phone will **not** show the same account — each browser keeps its
> own separate data. There is currently no cross-device sync.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Login |
| `register.html` | Create account (name, email, mobile, password, DOB, gender, optional profile picture) |
| `forgot-password.html` | Verify identity (name + email + phone) and reset password |
| `dashboard.html` | The whole app: Dashboard, Today Work, My Notes, Folders, Favorites, Calendar, Trash, Profile, Settings |

## Structure

```
mynotes/
├── index.html              Login
├── register.html            Register
├── forgot-password.html     Forgot password
├── dashboard.html           Main app shell (all views live here)
├── css/
│   └── style.css            Design system (dark/light theme, components)
├── js/
│   ├── db.js                Data layer (localStorage "database" + i18n dictionary + image resize helper)
│   └── app.js                App logic (rendering, events, calendar, modals)
└── README.md
```

## "Database" tables (as localStorage collections)

Stored as JSON arrays under these keys:

- `mn_users` → id, name, email, phone, password, dob, gender, avatar, createdAt
- `mn_folders` → id, userId, folder_name, color, folder_icon, createdAt
- `mn_notes` → id, userId, folderId, title, content, category, categoryDetail, favorite, trashed, createdAt, updatedAt
- `mn_daynotes` → id, userId, date, text, icon, completed, createdAt (powers "Today Work" + Calendar)
- `mn_settings_<userId>` → darkMode, notifications, language

## Features included

- 🔐 Register / Login / Forgot Password (identity check + reset)
- 🏠 Dashboard with live counters: total notes, created today, today's work, favorites, categories
- 📝 Create / Edit / Delete notes (soft-delete → Trash), with 35 categories (AI, Work, Personal, Study, Ideas, Projects, College, Office, Business, Finance, Shopping, Travel, Health, Fitness, Meeting, Assignments, Diary, Goals, Wishlist, Events, Birthday, Important, Documents, Bills, Passwords, Home, Family, Friends, Sports, Technology, News, Learning, Career, Interview, Other) — each with an emoji shown right in the picker
- 🔎 Extra detail field for **Sports** (sport name), **AI** (tool/topic), and **Other** (custom category name), shown on the note card
- 📁 Folders — pick from 24 colors **and** 24 icons when creating one; open a folder to see just its notes
- ⭐ Mark/unmark favorites
- 🔍 Search notes by title or content
- 📅 Calendar — click any date to add/view that day's tasks, each with its own chosen icon; a dot marks days with saved notes; "Mark Complete" keeps the task (strikethrough) rather than deleting it, and only "✕" removes it
- 🕒 Today Work — same task list/icon/complete behavior, scoped to today; the notification bell only counts pending (not-yet-completed) tasks and clears once everything is done
- 🗑 Trash — restore or permanently delete
- 👤 Profile — picture (auto-resized on upload so it always saves and displays), name, email, phone, DOB, gender, change password
- ⚙ Settings — dark mode, notifications toggle, language selector (English / Kannada / Hindi — saves the preference; full UI translation isn't wired up yet), export notes to a print-ready PDF view
- 📱 Responsive layout with a collapsible sidebar on mobile

## Notes for a college submission

- Passwords are stored in plain text in `localStorage` for demo simplicity —
  for a real deployment you'd hash passwords server-side and use a real
  database (the table design above maps directly to SQL tables if you want
  to swap in MySQL/PostgreSQL + a backend later).
- All data is scoped per browser/device. To demo multiple users, register
  several accounts in the same browser — each user only ever sees their own
  notes. There's no built-in way to share one account across a laptop and a
  phone, since everything is stored locally rather than on a server.
