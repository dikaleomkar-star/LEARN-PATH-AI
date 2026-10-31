from fastapi import FastAPI, HTTPException, Query, Path, Header, status
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="Beginner API Demo", version="1.0.0")


# ---------------------------------------------------------------------------
# 0. Fake "database" — just a Python list so we don't need a real DB yet.
# ---------------------------------------------------------------------------
users = [
    {"id": 1, "name": "Aman", "email": "aman@test.com", "age": 22},
    {"id": 2, "name": "Priya", "email": "priya@test.com", "age": 25},
]


# ---------------------------------------------------------------------------
# 1. Pydantic models = the "shape" of the data coming in / going out.
#    FastAPI uses these to validate the request body automatically.
# ---------------------------------------------------------------------------
class UserCreate(BaseModel):
    name: str
    email: str
    age: int


class UserUpdate(BaseModel):
    # Optional => the client can send only the fields it wants to change
    name: Optional[str] = None
    email: Optional[str] = None
    age: Optional[int] = None


# ---------------------------------------------------------------------------
# 2. GET — read data. No body. Safe to call again and again.
# ---------------------------------------------------------------------------
@app.get("/health")
def get_health():
    return "Check Mate Everything working Fine !!!"


@app.get("/users")
def get_all_users():
    return {"count": len(users), "data": users}


# ---------------------------------------------------------------------------
# 3. PATH PARAMETER — value is part of the URL: /users/1
#    `user_id: int` makes FastAPI convert & validate it for you.
# ---------------------------------------------------------------------------
@app.get("/users/{user_id}")
def get_user_by_id(user_id: int = Path(..., gt=0, description="ID of the user")):
    for user in users:
        if user["id"] == user_id:
            return user
    # raise => FastAPI sends a proper JSON error with the right status code
    raise HTTPException(status_code=404, detail=f"User {user_id} not found")


# ---------------------------------------------------------------------------
# 4. QUERY PARAMETERS — the bit after `?` : /search?name=aman&limit=5
#    Defaults make them optional.
# ---------------------------------------------------------------------------
@app.get("/search")
def search_users(
    name: Optional[str] = Query(None, description="Filter by name (partial match)"),
    min_age: int = Query(0, ge=0, description="Minimum age"),
    limit: int = Query(10, ge=1, le=100, description="Max results to return"),
):
    result = users
    if name:
        result = [u for u in result if name.lower() in u["name"].lower()]
    result = [u for u in result if u["age"] >= min_age]
    return {"count": len(result[:limit]), "data": result[:limit]}


# ---------------------------------------------------------------------------
# 5. POST — create something new. Data comes in the REQUEST BODY as JSON.
#    status_code=201 is the standard "Created" response.
# ---------------------------------------------------------------------------
@app.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate):
    new_id = max([u["id"] for u in users], default=0) + 1
    new_user = {"id": new_id, **payload.model_dump()}
    users.append(new_user)
    return {"message": "User created", "data": new_user}


# ---------------------------------------------------------------------------
# 6. PUT — full replace. Client must send ALL fields.
# ---------------------------------------------------------------------------
@app.put("/users/{user_id}")
def replace_user(user_id: int, payload: UserCreate):
    for index, user in enumerate(users):
        if user["id"] == user_id:
            users[index] = {"id": user_id, **payload.model_dump()}
            return {"message": "User replaced", "data": users[index]}
    raise HTTPException(status_code=404, detail=f"User {user_id} not found")


# ---------------------------------------------------------------------------
# 7. PATCH — partial update. Only the fields that were actually sent.
# ---------------------------------------------------------------------------
@app.patch("/users/{user_id}")
def update_user(user_id: int, payload: UserUpdate):
    for user in users:
        if user["id"] == user_id:
            # exclude_unset => ignore fields the client didn't send
            user.update(payload.model_dump(exclude_unset=True))
            return {"message": "User updated", "data": user}
    raise HTTPException(status_code=404, detail=f"User {user_id} not found")


# ---------------------------------------------------------------------------
# 8. DELETE — remove something.
# ---------------------------------------------------------------------------
@app.delete("/users/{user_id}")
def delete_user(user_id: int):
    for index, user in enumerate(users):
        if user["id"] == user_id:
            removed = users.pop(index)
            return {"message": "User deleted", "data": removed}
    raise HTTPException(status_code=404, detail=f"User {user_id} not found")


# ---------------------------------------------------------------------------
# 9. HEADERS — read values the client sends in HTTP headers.
#    Hyphens become underscores: "x-api-key" -> x_api_key
# ---------------------------------------------------------------------------
@app.get("/secure-data")
def get_secure_data(x_api_key: Optional[str] = Header(None)):
    if x_api_key != "secret123":
        raise HTTPException(status_code=401, detail="Invalid or missing x-api-key")
    return {"message": "You are authorized!", "data": "Top secret info"}


# ---------------------------------------------------------------------------
# 10. ASYNC endpoint — use `async def` when you await slow I/O
#     (DB calls, external APIs). For plain code, normal `def` is fine.
# ---------------------------------------------------------------------------
@app.get("/async-demo")
async def async_demo():
    import asyncio

    await asyncio.sleep(1)  # pretend we called a slow API
    return {"message": "Finished after waiting 1 second without blocking"}


# ---------------------------------------------------------------------------
# Run it:   uvicorn main:app --reload
# Docs at:  http://127.0.0.1:8000/docs   (interactive, try every route here)
# ---------------------------------------------------------------------------
