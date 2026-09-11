# 📝 MyNotes — Native Android App (Kotlin)

**Updated build** — includes a fix for a resource-linking error
(`attribute ... not found` for Material/Navigation attributes like
`endIconMode`, `strokeColor`, `navGraph`, `menu`, etc.) that some setups hit
even after a full clean rebuild. Two changes were made to `app/build.gradle`
and `gradle.properties`:
1. A `resolutionStrategy { force ... }` block pins Material, AppCompat, and
   Navigation to the exact versions the layouts need, so nothing else in the
   dependency graph can silently pull in an older conflicting version.
2. `android.nonTransitiveRClass` was set to `false` — this is a known fix for
   attribute-resolution errors that cross library boundaries (e.g. Material's
   attributes referenced inside a Navigation/AppCompat view).

**If you've been troubleshooting this project already: delete your old
project folder entirely and unzip this one fresh** rather than reusing the
old folder — that avoids any leftover per-project cache/state contributing
to the same error again.

This is a **fully native** rebuild of MyNotes — no WebView, no HTML/CSS/JS
anywhere. Every screen is a real Android layout (Kotlin + XML), and all data
is stored locally on the device using **Room** (SQLite), matching the
Users / Folders / Notes / Day-Notes tables from the original design.

## How to open it

1. **Delete any previous `MyNotesNative` folder you were using.**
2. Unzip `MyNotesNative.zip` to a fresh location.
3. Open **Android Studio** → `File > Open...` → select the **`MyNotesNative`** folder (the one directly containing `build.gradle`, `settings.gradle`, and `app`).
4. Let Gradle sync. If it asks to create/fix the Gradle wrapper, click OK — that's expected (see note below).
5. Press **▶ Run** with an emulator or a connected phone.
6. The app opens to the Login screen.

> **Gradle wrapper note:** I couldn't include the wrapper's binary jar file
> from this environment, so Android Studio will generate it automatically
> the first time you open the project (it may prompt you once — that's normal).

## What's inside

- **Kotlin + View Binding** throughout (no `findViewById`).
- **Room** database (`AppDatabase.kt`) with 4 tables: `users`, `folders`, `notes`, `day_notes` — the same schema from the original design, just as real Android entities/DAOs instead of localStorage.
- **Jetpack Navigation Component** with a single `MainActivity` hosting a `DrawerLayout` (the sidebar) + a nav graph swapping fragments for Dashboard, Today Work, My Notes, Folders, Favorites, Calendar, Trash, Profile, Settings.
- **SharedPreferences**-based session (`SessionManager.kt`) for login state and per-user settings (dark mode, notifications, language).
- Photos are resized and saved into the app's private storage (`filesDir/avatars/`) — never stored as huge unprocessed images.

## Project layout

```
MyNotesNative/
├── app/src/main/java/com/mynotes/app/
│   ├── data/                     Room: AppDatabase, entities, DAOs
│   ├── session/SessionManager.kt Login session + per-user settings
│   ├── util/                     Categories, colors/icons, date helpers, image resizing
│   ├── auth/                     LoginActivity, RegisterActivity, ForgotPasswordActivity
│   ├── MainActivity.kt            Drawer + toolbar + nav host
│   └── ui/
│       ├── dashboard/            Stats, quick actions, recent notes
│       ├── today/                 Today Work (+ shared task adapter used by Calendar)
│       ├── notes/                 My Notes, the note create/edit dialog, shared NoteAdapter
│       ├── folders/                Folder list, folder detail, create-folder dialog
│       ├── favorites/              Favorites list
│       ├── calendar/                Month grid + day panel
│       ├── trash/                    Trashed notes, restore/delete permanently
│       ├── profile/                  Avatar, personal details, change password
│       └── settings/                 Dark mode, notifications, language, export
├── app/src/main/res/
│   ├── layout/                    Every screen's XML layout
│   ├── navigation/nav_graph.xml   Screen graph
│   ├── menu/drawer_menu.xml       Sidebar items
│   ├── mipmap-*/                  Your 📝 app icon at every density
│   └── values / values-night/     Light + dark color palettes
└── build.gradle, settings.gradle, gradle.properties
```

## Honest notes on scope (so nothing surprises you)

A couple of things were simplified compared to the original web version, in
the interest of shipping a working, buildable native project rather than an
enormous one:

- **Export**: instead of a print-to-PDF trick (a browser-only feature),
  Settings → Export shares all your notes as plain text through Android's
  share sheet (Gmail, Drive, Notes apps, etc. can all receive it).
- **Language switching**: the Settings screen lets you pick English / Kannada
  / Hindi and it's saved per user, but the on-screen text throughout the app
  is currently hardcoded in English rather than pulled from translated string
  resources. Wiring up full translations would mean moving every label into
  `strings.xml`/`values-kn/strings.xml`/`values-hi/strings.xml` — a
  mechanical but sizeable task I've left as a clearly-flagged next step
  rather than quietly pretending it's done.
- **Import**: not included natively (the web version's JSON import doesn't
  have a direct native equivalent); happy to add a "restore from exported
  text/JSON" flow if you want it.

## Changing the package name / app name

- App name: `app/src/main/res/values/strings.xml` → `app_name`.
- Package ID: `applicationId` and `namespace` in `app/build.gradle`, or use
  Android Studio's `Refactor > Rename` on the `com.mynotes.app` package.

## Building a shareable APK

`Build > Build App Bundle(s) / APK(s) > Build APK(s)`, then find it under
`app/build/outputs/apk/debug/app-debug.apk` to install on another phone
directly (enable "install unknown apps" there first).
