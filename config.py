import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    """TypeQuest application configuration. Override via environment variables."""

    SECRET_KEY = os.environ.get("SECRET_KEY", "typequest-dev-secret-change-me")

    # --- database ---
    DATABASE_DIR = os.path.join(BASE_DIR, "database")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        "sqlite:///" + os.path.join(DATABASE_DIR, "typequest.db"),
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # --- progression / levels ---
    MAX_LEVEL = 10
    LEVEL_NAMES = [
        "Beginner", "Easy", "Normal", "Medium", "Hard",
        "Advanced", "Expert", "Master", "Elite", "Legend",
    ]
    # Cumulative XP required to REACH each level (index 0 -> level 1).
    LEVEL_XP = [0, 100, 250, 450, 700, 1000, 1400, 1850, 2350, 2900]

    # --- game ---
    GAME_MODES = [
        "Speed Run", "Accuracy Mode", "Time Attack", "Survival Mode", "Daily Challenge",
    ]
    CATEGORIES = [
        "General", "English", "Programming", "Science", "Mathematics", "Academic", "Interview",
    ]
    TIME_ATTACK_SECONDS = 60
    SURVIVAL_LIVES = 5
    DAILY_BONUS_XP = 50

    # --- scoring ---
    XP_BASE = 10
    XP_PER_WPM = 3
    XP_COMPLETION_BONUS = 20
    XP_SURVIVAL_BONUS = 10