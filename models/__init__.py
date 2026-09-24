from datetime import datetime, date, timedelta

from flask import current_app
from flask_login import UserMixin
from werkzeug.security import check_password_hash, generate_password_hash

from extensions import db, login_manager


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(30), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    xp = db.Column(db.Integer, nullable=False, default=0)
    level = db.Column(db.Integer, nullable=False, default=1)
    streak = db.Column(db.Integer, nullable=False, default=0)
    last_active = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    tests = db.relationship("TypingTest", backref="user", lazy="dynamic")
    achievements = db.relationship("UserAchievement", backref="user", lazy="dynamic")

    # ------------------------------------------------------------------ auth
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    # ----------------------------------------------------------- progression
    @property
    def level_name(self):
        names = current_app.config["LEVEL_NAMES"]
        return names[min(max(self.level, 1), len(names)) - 1]

    @property
    def next_level_name(self):
        names = current_app.config["LEVEL_NAMES"]
        if self.level >= len(names):
            return "Max Rank"
        return names[self.level]

    @property
    def level_progress(self):
        """Percent progress (0-100) from current level towards the next."""
        thresholds = current_app.config["LEVEL_XP"]
        if self.level >= len(thresholds):
            return 100.0
        base = thresholds[self.level - 1]
        nxt = thresholds[self.level]
        if nxt <= base:
            return 100.0
        return min(100.0, max(0.0, (self.xp - base) / (nxt - base) * 100))

    @property
    def xp_to_next_level(self):
        thresholds = current_app.config["LEVEL_XP"]
        if self.level >= len(thresholds):
            return 0
        return max(0, thresholds[self.level] - self.xp)

    def recalc_level(self):
        level = 1
        for i, threshold in enumerate(current_app.config["LEVEL_XP"]):
            if self.xp >= threshold:
                level = i + 1
        return level

    def apply_xp(self, amount):
        self.xp += max(0, int(amount))
        new_level = self.recalc_level()
        leveled_up = new_level > self.level
        if leveled_up:
            self.level = new_level
        return leveled_up

    def update_streak(self, on_date=None):
        today = on_date or date.today()
        if self.last_active == today:
            return 0
        if self.last_active == today - timedelta(days=1):
            self.streak += 1
        else:
            self.streak = 1
        self.last_active = today
        return self.streak

    # ---------------------------------------------------------------- stats
    def best_wpm(self):
        return (
            db.session.query(db.func.max(TypingTest.wpm))
            .filter(TypingTest.user_id == self.id)
            .scalar()
            or 0
        )

    def avg_wpm(self):
        return (
            db.session.query(db.func.avg(TypingTest.wpm))
            .filter(TypingTest.user_id == self.id)
            .scalar()
            or 0
        )

    def avg_accuracy(self):
        return (
            db.session.query(db.func.avg(TypingTest.accuracy))
            .filter(TypingTest.user_id == self.id)
            .scalar()
            or 0
        )

    def test_count(self):
        return self.tests.count()

    def __repr__(self):
        return f"<User {self.username}>"


class TypingTest(db.Model):
    __tablename__ = "typing_tests"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    mode = db.Column(db.String(40), nullable=False, default="Speed Run")
    category = db.Column(db.String(40), nullable=False, default="General")
    level = db.Column(db.Integer, nullable=False, default=1)
    wpm = db.Column(db.Float, nullable=False, default=0)
    accuracy = db.Column(db.Float, nullable=False, default=0)
    errors = db.Column(db.Integer, nullable=False, default=0)
    duration = db.Column(db.Float, nullable=False, default=0)
    xp_earned = db.Column(db.Integer, nullable=False, default=0)
    completed = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self):
        return f"<TypingTest {self.id} {self.mode} {self.wpm}wpm>"


class Achievement(db.Model):
    __tablename__ = "achievements"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(40), unique=True, nullable=False)
    description = db.Column(db.String(160), nullable=False)
    icon = db.Column(db.String(8), nullable=False, default="🏆")

    def __repr__(self):
        return f"<Achievement {self.name}>"


class UserAchievement(db.Model):
    __tablename__ = "user_achievements"
    __table_args__ = (
        db.UniqueConstraint("user_id", "achievement_id", name="uq_user_achievement"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    achievement_id = db.Column(db.Integer, db.ForeignKey("achievements.id"), nullable=False, index=True)
    unlocked_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    achievement = db.relationship("Achievement", lazy=True)

    def __repr__(self):
        return f"<UserAchievement user={self.user_id} achievement={self.achievement_id}>"


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))