from main import app, USERS_DB, login, signup, verify_password

print("=== Mock Database Status ===")
print("Users seeded:", len(USERS_DB))
for uid, u in USERS_DB.items():
    print("  User", uid, ":", u["name"], "(", u["email"], ")")

print()
print("=== Available Routes ===")
for route in app.routes:
    if hasattr(route, 'methods') and hasattr(route, 'path'):
        methods = ", ".join(str(m) for m in route.methods)
        print("  ", methods, route.path)

print()
print("=== Test: Login with demo credentials ===")
class LoginRequest:
    def __init__(self, email, password):
        self.email = email
        self.password = password

result = login(LoginRequest("demo@example.com", "password123"))
print("Login successful!")
print("  ID:", result["id"])
print("  Name:", result["name"])
print("  Email:", result["email"])

print()
print("=== Test: Verify password ===")
print("  Correct password:", verify_password("password123", "password123"))
print("  Wrong password:", verify_password("wrongpass", "password123"))

print()
print("=== All systems operational ===")