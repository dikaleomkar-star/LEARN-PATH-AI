
from passlib.context import CryptContext

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

def hash_password(password:str):
    return pwd_context.hash(password)


# hashing is one way -> you can never turn a hash back into the password
# so to "check" a password we hash the new input and compare the hashes
def verify_password(plain_password:str , hashed_password:str):
    return pwd_context.verify(plain_password , hashed_password)