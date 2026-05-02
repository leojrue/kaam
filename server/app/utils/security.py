import hashlib
import hmac
import os


HASH_NAME = "sha256"
ITERATIONS = 120_000
SALT_BYTES = 16


def hash_password(password: str) -> str:
    salt = os.urandom(SALT_BYTES).hex()
    digest = hashlib.pbkdf2_hmac(HASH_NAME, password.encode("utf-8"), bytes.fromhex(salt), ITERATIONS).hex()
    return f"pbkdf2_{HASH_NAME}${ITERATIONS}${salt}${digest}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
      algorithm, iterations_text, salt, expected_digest = stored_hash.split("$", 3)
      hash_name = algorithm.replace("pbkdf2_", "")
      iterations = int(iterations_text)
      actual_digest = hashlib.pbkdf2_hmac(
          hash_name,
          password.encode("utf-8"),
          bytes.fromhex(salt),
          iterations
      ).hex()
      return hmac.compare_digest(actual_digest, expected_digest)
    except (ValueError, TypeError):
      return False
