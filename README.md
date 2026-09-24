# ⌨️ SpeedType — Gamified Typing Trainer

**SpeedType** is a game-style typing practice platform designed to make improving typing speed and accuracy more engaging. Users progress through levels, earn XP, unlock achievements, complete challenges, and track performance.

## ✨ Features

- ⚡ Real-time WPM, accuracy, errors, timer and progress tracking
- 🏆 10-rank progression from Beginner to Legend
- 🎮 Speed Run, Accuracy, Time Attack, Survival and Daily Challenge modes
- 📚 General, English, Programming, Science, Mathematics, Academic and Interview categories
- ⭐ XP, achievements, level-ups and weekly leaderboard
- 📊 Personal dashboard with performance history and charts
- 🔐 Authentication with Flask-Login and password hashing
- 🌙 Responsive dark/light interface with animations

## 🛠️ Tech Stack

**Backend:** Python, Flask, SQLAlchemy  
**Frontend:** HTML, CSS, JavaScript  
**Database:** SQLite  
**Authentication:** Flask-Login, Werkzeug

## 🏗️ Application Flow

```text
Choose Level + Mode + Category
            ↓
       Typing Challenge
            ↓
   WPM + Accuracy + Errors
            ↓
       XP + Achievements
            ↓
      Progress Dashboard
```

## 🚀 Getting Started

```bash
git clone https://github.com/Vileka06/SpeedType.git
cd SpeedType
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

Open `http://127.0.0.1:5000/` in your browser.

## 🎮 How to Play

1. Register or continue as a guest.
2. Select a level, category and game mode.
3. Type the displayed passage as accurately and quickly as possible.
4. Finish the challenge to receive WPM, accuracy, XP and achievement results.
5. Track progress and rankings from the dashboard.

## 🧮 Scoring

XP combines typing speed, accuracy, completion bonuses, Survival Mode bonuses and the Daily Challenge bonus. Higher XP unlocks new ranks and levels.

## 📁 Project Structure

```text
SpeedType/
├── app.py
├── config.py
├── models/
├── routes/
├── templates/
├── static/
├── database/
├── requirements.txt
└── README.md
```

## 💡 What This Project Demonstrates

- Real-time browser interaction with JavaScript
- Backend API design with Flask
- Authentication and protected routes
- Persistent user progress with SQLAlchemy
- Gamification and achievement systems
- Data visualization and performance tracking

## 📌 Future Improvements

- Multiplayer typing competitions
- Custom user-generated passages
- More competitive ranking modes
- Public player profiles and performance sharing

**Built with Python + Flask + JavaScript.**