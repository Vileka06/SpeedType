"""Database bootstrap: create tables and seed static data (achievements)."""

from extensions import db
from models import Achievement

ACHIEVEMENTS = [
    {"name": "First Test", "description": "Complete your first typing test", "icon": "🚀"},
    {"name": "50 WPM", "description": "Reach 50 WPM in any single test", "icon": "💨"},
    {"name": "75 WPM", "description": "Reach 75 WPM in any single test", "icon": "⚡"},
    {"name": "100 WPM", "description": "Reach 100 WPM in any single test", "icon": "🌟"},
    {"name": "Perfect Accuracy", "description": "Score 100% accuracy on a test", "icon": "🎯"},
    {"name": "7-Day Streak", "description": "Type on 7 consecutive days", "icon": "🔥"},
    {"name": "10 Tests", "description": "Complete 10 typing tests", "icon": "📚"},
    {"name": "Level 10", "description": "Reach the Legend rank", "icon": "👑"},
]


def init_db():
    """Create tables and seed achievements (idempotent)."""
    db.create_all()
    _seed_achievements()


def _seed_achievements():
    if Achievement.query.count() > 0:
        return
    for data in ACHIEVEMENTS:
        db.session.add(Achievement(**data))
    db.session.commit()