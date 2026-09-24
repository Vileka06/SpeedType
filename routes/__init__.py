from flask import Blueprint

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")
main_bp = Blueprint("main", __name__)
api_bp = Blueprint("api", __name__, url_prefix="/api")

from . import auth, main, api  # noqa: E402  (registers routes)