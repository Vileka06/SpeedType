from datetime import date, datetime, time, timedelta

from flask import current_app, render_template, request
from flask_login import current_user, login_required

from config import Config
from database.texts import CATEGORIES
from extensions import db
from models import Achievement, TypingTest, User, UserAchievement
from . import main_bp


@main_bp.route("/")
def index():
    total_players = User.query.count()
    total_tests = TypingTest.query.count()
    avg_wpm = db.session.query(db.func.avg(TypingTest.wpm)).scalar() or 0
    top_weekly = _weekly_leaderboard(5)

    return render_template(
        "index.html",
        total_players=total_players,
        total_tests=total_tests,
        avg_wpm=round(avg_wpm, 1),
        levels=Config.LEVEL_NAMES,
        top_weekly=top_weekly,
    )


@main_bp.route("/play")
def play():
    config = {
        "logged_in": current_user.is_authenticated,
        "maxLevel": Config.MAX_LEVEL,
        "levels": Config.LEVEL_NAMES,
        "categories": CATEGORIES,
        "modes": Config.GAME_MODES,
        "timeAttackSeconds": Config.TIME_ATTACK_SECONDS,
        "survivalLives": Config.SURVIVAL_LIVES,
        "dailyBonusXp": Config.DAILY_BONUS_XP,
    }
    if current_user.is_authenticated:
        config["user"] = {
            "username": current_user.username,
            "xp": current_user.xp,
            "level": current_user.level,
            "levelName": current_user.level_name,
            "unlockedLevel": current_user.level,
            "streak": current_user.streak,
        }
    return render_template("play.html", game_config=config, preset_mode=request.args.get("mode", ""))


@main_bp.route("/dashboard")
@login_required
def dashboard():
    user = current_user

    recent = (
        user.tests.order_by(TypingTest.created_at.desc()).limit(10).all()
    )

    chart_rows = (
        user.tests.order_by(TypingTest.created_at.asc()).limit(20).all()
    )
    chart_wpm = [round(t.wpm, 1) for t in chart_rows]
    chart_acc = [round(t.accuracy, 1) for t in chart_rows]

    weekly = _weekly_leaderboard(10)

    today = date.today()
    daily_done = (
        TypingTest.query.filter(
            TypingTest.user_id == user.id,
            TypingTest.mode == "Daily Challenge",
            db.func.date(TypingTest.created_at) == today.isoformat(),
        ).first()
        is not None
    )

    unlocked_ids = {
        ua.achievement_id
        for ua in UserAchievement.query.filter_by(user_id=user.id).all()
    }

    return render_template(
        "dashboard.html",
        user=user,
        recent=recent,
        chart_wpm=chart_wpm,
        chart_acc=chart_acc,
        weekly=weekly,
        daily_done=daily_done,
        daily_bonus=Config.DAILY_BONUS_XP,
        max_level=Config.MAX_LEVEL,
        achievements=Achievement.query.order_by(Achievement.id).all(),
        unlocked_ids=unlocked_ids,
    )


def _weekly_leaderboard(limit):
    since = datetime.combine(date.today() - timedelta(days=7), time.min)
    rows = (
        db.session.query(
            User.username,
            db.func.sum(TypingTest.xp_earned).label("xp"),
            User.streak,
        )
        .join(TypingTest, TypingTest.user_id == User.id)
        .filter(TypingTest.created_at >= since)
        .group_by(User.id)
        .order_by(db.func.sum(TypingTest.xp_earned).desc())
        .limit(limit)
        .all()
    )
    return rows