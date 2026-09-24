import os
from datetime import datetime

from flask import Flask, jsonify, redirect, request, url_for

from config import Config
from extensions import db, login_manager


@login_manager.unauthorized_handler
def _unauthorized():
    if request.path.startswith("/api/"):
        return jsonify({"error": "login_required"}), 401
    return redirect(url_for("auth.login"))


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    os.makedirs(Config.DATABASE_DIR, exist_ok=True)

    db.init_app(app)
    login_manager.init_app(app)

    from routes import api_bp, auth_bp, main_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp)

    with app.app_context():
        from database.seed import init_db

        init_db()

    @app.context_processor
    def inject_globals():
        return {"now_year": datetime.utcnow().year}

    return app


app = create_app()


if __name__ == "__main__":
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "5000"))
    app.run(host=host, port=port, debug=os.environ.get("DEBUG", "1") == "1")