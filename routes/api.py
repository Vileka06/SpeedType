from datetime import datetime, date

from flask import current_app, jsonify, request
from flask_login import current_user, login_required

from config import Config
from database.texts import CATEGORIES, pick_daily_text, pick_text
from extensions import db
from models import Achievement, TypingTest, UserAchievement
from . import api_bp


@api_bp.route("/texts")
def texts():
    mode = request.args.get("mode", "").strip()
    if mode == "Daily Challenge":
        text, category, level = pick_daily_text()
        return jsonify({"text": text, "level": level, "category": category, "mode": mode})

    try:
        level = min(max(int(request.args.get("level", 1)), 1), Config.MAX_LEVEL)
    except (TypeError, ValueError):
        level = 1

    category = request.args.get("category", "General").strip()
    if category not in CATEGORIES:
        category = "General"

    text = pick_text(category, level)
    return jsonify({"text": text, "level": level, "category": category, "mode": "regular"})


@api_bp.route("/results", methods=["POST"])
@login_required
def results():
    if not current_user.is_authenticated:
        return jsonify({"error": "login_required"}), 401

    data = request.get_json(silent=True) or {}

    mode = str(data.get("mode") or "Speed Run").strip()
    category = str(data.get("category") or "General").strip()
    level = _int_clamped(data.get("level"), 1, Config.MAX_LEVEL, 1)
    wpm = _float_clamped(data.get("wpm"), 0, 400, 0)
    accuracy = _float_clamped(data.get("accuracy"), 0, 100, 0)
    errors = _int_clamped(data.get("errors"), 0, 100000, 0)
    duration = _float_clamped(data.get("duration"), 1, 1800, 1)
    completed = bool(data.get("completed", False))
    text_length = _int_clamped(data.get("textLength"), 1, 10000, 1)

    if mode not in Config.GAME_MODES:
        mode = "Speed Run"
    if category not in CATEGORIES:
        category = "General"

    time_attack_end = (
        mode == "Time Attack"
        and duration >= Config.TIME_ATTACK_SECONDS - 0.5
    )

    xp, acc_bonus_text = _compute_xp(
        wpm, accuracy, completed, mode, time_attack_end=time_attack_end
    )

    user = current_user

    # Daily challenge bonus (once per day).
    daily_bonus = False
    if mode == "Daily Challenge":
        today = date.today()
        already_done = (
            TypingTest.query.filter(
                TypingTest.user_id == user.id,
                TypingTest.mode == "Daily Challenge",
                db.func.date(TypingTest.created_at) == today.isoformat(),
            ).first()
            is not None
        )
        if not already_done:
            xp += Config.DAILY_BONUS_XP
            daily_bonus = True

    test = TypingTest(
        user_id=user.id,
        mode=mode,
        category=category,
        level=level,
        wpm=wpm,
        accuracy=accuracy,
        errors=errors,
        duration=duration,
        xp_earned=xp,
        completed=completed,
    )
    db.session.add(test)

    user.update_streak()
    leveled_up = user.apply_xp(xp)

    unlocked = _check_achievements(user, wpm, accuracy)

    db.session.commit()

    return jsonify(
        {
            "success": True,
            "xpEarned": xp,
            "accuracyBonus": acc_bonus_text,
            "dailyBonus": daily_bonus,
            "totalXp": user.xp,
            "level": user.level,
            "levelName": user.level_name,
            "levelUp": leveled_up,
            "streak": user.streak,
            "achievements": [
                {"name": a.name, "description": a.description, "icon": a.icon}
                for a in unlocked
            ],
        }
    )


def _compute_xp(wpm, accuracy, completed, mode, time_attack_end=False):
    cfg = current_app.config
    wpm_xp = int(wpm * cfg["XP_PER_WPM"])
    if accuracy >= 98:
        acc_bonus = 25
    elif accuracy >= 90:
        acc_bonus = 12
    else:
        acc_bonus = 3

    xp = cfg["XP_BASE"] + wpm_xp + acc_bonus
    if completed:
        xp += cfg["XP_COMPLETION_BONUS"]
    if mode == "Survival Mode":
        xp += cfg["XP_SURVIVAL_BONUS"]
    if mode == "Time Attack" and not completed:
        xp += 5

    return xp, ("SUPERB" if accuracy >= 98 else "GOOD" if accuracy >= 90 else "FAIR")


def _check_achievements(user, wpm, accuracy):
    """Evaluate achievement conditions AFTER the current test was added."""
    unlocked = []

    def grant(name):
        ach = Achievement.query.filter_by(name=name).first()
        if not ach:
            return
        exists = UserAchievement.query.filter_by(
            user_id=user.id, achievement_id=ach.id
        ).first()
        if not exists:
            db.session.add(
                UserAchievement(user_id=user.id, achievement_id=ach.id,
                                unlocked_at=datetime.utcnow())
            )
            unlocked.append(ach)

    total_tests = TypingTest.query.filter_by(user_id=user.id).count()

    if total_tests >= 1:
        grant("First Test")
    if total_tests >= 10:
        grant("10 Tests")
    if wpm >= 50:
        grant("50 WPM")
    if wpm >= 75:
        grant("75 WPM")
    if wpm >= 100:
        grant("100 WPM")
    if accuracy >= 100.0:
        grant("Perfect Accuracy")
    if user.streak >= 7:
        grant("7-Day Streak")
    if user.level >= 10:
        grant("Level 10")

    return unlocked


def _int_clamped(value, lo, hi, default):
    try:
        return min(max(int(value), lo), hi)
    except (TypeError, ValueError):
        return default


def _float_clamped(value, lo, hi, default):
    try:
        return min(max(float(value), lo), hi)
    except (TypeError, ValueError):
        return default