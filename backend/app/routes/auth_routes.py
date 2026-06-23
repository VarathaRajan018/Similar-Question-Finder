"""
auth_routes.py — POST /auth/signup and POST /auth/login
"""

from fastapi import APIRouter, HTTPException, status
from app.auth import hash_password, verify_password, create_access_token
from app.database import get_db
from app.models import SignupRequest, LoginRequest, AuthResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(body: SignupRequest):
    """
    Register a new user.
    - 409 if the email is already registered.
    - Password is bcrypt-hashed before storage.
    """
    db = get_db()
    existing = await db.users.find_one({"email": body.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    hashed = hash_password(body.password)
    user_doc = {
        "name": body.name,
        "email": body.email,
        "password_hash": hashed,
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    token = create_access_token(user_id, body.email)
    return AuthResponse(
        access_token=token,
        user_id=user_id,
        name=body.name,
        email=body.email,
    )


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    """
    Authenticate an existing user.
    - Returns the SAME error message whether the email does not exist or
      the password is wrong.  This prevents leaking which emails are
      registered (user enumeration attack prevention).
    """
    _generic_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password.",
    )

    db = get_db()
    user = await db.users.find_one({"email": body.email})
    if user is None:
        raise _generic_error

    if not verify_password(body.password, user["password_hash"]):
        raise _generic_error

    user_id = str(user["_id"])
    token = create_access_token(user_id, body.email)
    return AuthResponse(
        access_token=token,
        user_id=user_id,
        name=user["name"],
        email=body.email,
    )
