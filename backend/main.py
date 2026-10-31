from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

# In-memory mock database - no real database needed
USERS_DB = {}

# Demo credentials - pre-seeded for immediate use
DEMO_EMAIL = "demo@example.com"
DEMO_PASSWORD = "password123"
DEMO_USER_ID = 1

# Pre-seed demo user (password stored as plain text for simple verification)
USERS_DB[DEMO_USER_ID] = {
    "id": DEMO_USER_ID,
    "name": "Demo User",
    "email": DEMO_EMAIL,
    "password": DEMO_PASSWORD,
}


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:4173",
        "http://localhost:4173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


# schemas
class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ChatRequest(BaseModel):
    user_id: int
    message: str


class ChatResponse(BaseModel):
    reply: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr

    class Config:
        from_attributes = True


@app.on_event("startup")
def setup_demo_data():
    """No database setup needed - demo data is pre-seeded in memory"""
    pass


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Simple password verification for mock database"""
    return plain_password == hashed_password


@app.post("/signup", response_model=UserResponse)
def signup(user: SignupRequest):
    """Register a new user (emails must be unique)"""
    # Check if user already exists
    for existing_user in USERS_DB.values():
        if existing_user["email"] == user.email:
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )

    # Create new user
    new_id = max(USERS_DB.keys(), default=0) + 1
    new_user = {
        "id": new_id,
        "name": user.name,
        "email": user.email,
        "password": user.password,
    }
    USERS_DB[new_id] = new_user
    return new_user


@app.post("/login", response_model=UserResponse)
def login(user: LoginRequest):
    """Login with email/password"""
    # Find user by email
    existing_user = None
    for uid, u in USERS_DB.items():
        if u["email"] == user.email:
            existing_user = u
            break

    if not existing_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not verify_password(user.password, existing_user["password"]):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    return existing_user


@app.get("/users", response_model=list[UserResponse])
def get_all_users():
    """Get all users"""
    return list(USERS_DB.values())


@app.get("/users/{user_id}", response_model=UserResponse)
def get_user_by_id(user_id: int):
    """Get user by ID"""
    if user_id not in USERS_DB:
        raise HTTPException(
            status_code=404,
            detail=f"User {user_id} not found"
        )
    return USERS_DB[user_id]


@app.post("/chat", response_model=ChatResponse)
def chat(body: ChatRequest):
    """Main AI chat - gets learning roadmap from AI layer"""
    user_id = body.user_id
    message = body.message

    # Find user
    existing_user = None
    for uid, u in USERS_DB.items():
        if uid == user_id:
            existing_user = u
            break

    if not existing_user:
        raise HTTPException(
            status_code=401,
            detail="Only registered users can chat"
        )

    # Import AI layer dynamically (same as original)
    import importlib.util
    from pathlib import Path

    _ai_path = Path(__file__).parent.parent / "ai-layer" / "main.py"
    _spec = importlib.util.spec_from_file_location("ai_layer", _ai_path)
    ai_layer = importlib.util.module_from_spec(_spec)
    _spec.loader.exec_module(ai_layer)

    try:
        reply = ai_layer.ask_ai(message, user_id)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"AI layer failed: {e}"
        )

    return ChatResponse(reply=reply)