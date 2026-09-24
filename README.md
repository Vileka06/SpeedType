# ⚡ TypeQuest — Gamified Typing Speed Trainer for Students

TypeQuest turns typing practice into a game. Students improve **WPM, accuracy and typing
skills** by climbing a 10-rank ladder (Beginner → Legend) across 7 categories and 4 game
modes — with XP, achievements, daily challenges, streaks and a weekly leaderboard to keep
them coming back.

Built with **Python Flask, HTML/CSS/JavaScript, SQLite and SQLAlchemy** (with Flask-Login
for authentication).

---

## ✨ Features

| Area | Details |
| --- | --- |
| **Typing game** | Real-time per-character highlighting (correct / incorrect / cursor), live WPM · accuracy · errors · timer · progress bar, restart & finish, automatic completion |
| **Rank ladder** | 1 Beginner → 2 Easy → 3 Normal → 4 Medium → 5 Hard → 6 Advanced → 7 Expert → 8 Master → 9 Elite → 10 Legend. Higher levels use longer text, punctuation, numbers and technical content. Levels lock until the previous one is completed. |
| **Game modes** | 🏁 Speed Run · 🎯 Accuracy Mode · ⏱️ Time Attack (60s) · 💀 Survival Mode (5 lives) · 📅 Daily Challenge |
| **Categories** | General · English · Programming · Science · Mathematics · Academic · Interview |
| **Gamification** | XP scoring, level-up animations, 8 achievements, daily challenge (+50 XP bonus), daily streak, weekly leaderboard |
| **Achievements** | 🚀 First Test · 💨 50 WPM · ⚡ 75 WPM · 🌟 100 WPM · 🎯 Perfect Accuracy · 🔥 7-Day Streak · 📚 10 Tests · 👑 Level 10 |
| **Dashboard** | Level, XP, best/average WPM, accuracy, tests completed, streak, WPM & accuracy progress charts, recent tests, weekly leaderboard |
| **Authentication** | Register / login / logout, password hashing (Werkzeug), Flask-Login, protected dashboard |
| **Design** | Clean, modern, premium & responsive. Subtle gradients, glowing cards, smooth animations, dark/light mode, distraction-free typing screen |

---

## 📁 Project structure

```text
typequest/
├── app.py                  # App factory + entry point (python app.py)
├── config.py               # Configuration constants
├── requirements.txt
├── README.md
├── models/
│   └── __init__.py         # User, TypingTest, Achievement, UserAchievement
├── routes/
│   ├── __init__.py         # Blueprint definitions
│   ├── auth.py             # Register / login / logout
│   ├── main.py             # Home, play, dashboard
│   └── api.py              # /api/texts, /api/results
├── templates/
│   ├── base.html
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── play.html
│   └── dashboard.html
├── static/
│   ├── css/style.css
│   └── js/app.js
└── database/
    ├── seed.py             # Table creation + achievement seeding
    ├── texts.py            # Typing passage pools (7 categories × 10 levels)
    └── typequest.db        # SQLite database (created on first run)
```

---

## 🚀 Setup & run

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

Then open **http://127.0.0.1:5000** in your browser.

> On Windows, activate with `venv\Scripts\activate` instead.

### Optional environment variables

- `SECRET_KEY` — set a real secret in production.
- `DATABASE_URL` — override the SQLite path (e.g. `sqlite:////absolute/path.db`).

---

## 🎮 How to play

1. **Sign up / log in** so results are saved and XP is earned (guests can still play).
2. On the **Play** page pick a **level**, **mode** and **category**, then click the text or press any key.
3. Type the passage. Correct characters turn green, mistakes turn pink, and a blinking caret follows you.
   - `Tab` → restart with a new passage
   - `Esc` → finish early
   - `Backspace` → fix a typo (Survival mode refunds your life!)
4. Finish to see your **WPM, accuracy, errors and time**, plus XP gained and any achievements or level-ups.
5. Track your progress, streak and weekly rank on the **Dashboard**.

### Scoring

```
XP  = 10 (base)
    + WPM × 3
    + accuracy bonus   (+25 ≥ 98% · +12 ≥ 90% · +3 otherwise)
    + 20  if the passage was completed
    + 10  bonus for Survival Mode
    + 50  bonus for completing today's Daily Challenge (once per day)
```

Completing passages raises your total XP, which unlocks higher levels and new ranks.

---

## 🗄️ Database schema

```text
User(id, username, email, password_hash, xp, level, streak, last_active, created_at)
TypingTest(id, user_id, mode, category, level, wpm, accuracy, errors, duration,
           xp_earned, completed, created_at)
Achievement(id, name, description, icon)
UserAchievement(id, user_id, achievement_id, unlocked_at)   -- unique(user_id, achievement_id)
```

The database is created and achievements are seeded automatically on first run.

---

## 🧰 Tech notes

- **Typing engine** runs entirely on the client (`static/js/app.js`) for zero-lag feedback; WPM is
  computed from correct characters (`(correct/5) / minutes`), accuracy from `correct / typed`.
- Results are posted to `/api/results` only once per finished run (no reloads, no double saves).
- The server validates result payloads, computes XP/level/achievements, and is the source of truth.
- Dark/light theme is stored in `localStorage` and respects the OS preference by default.

## Licensing / disclaimer

Built as an original game-style identity (no Monkeytype assets or design copied). Fonts are the
system font stack so the app runs fully offline.