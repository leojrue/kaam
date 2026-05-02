import random


ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_share_code(length: int = 6) -> str:
    return "".join(random.choice(ALPHABET) for _ in range(length))
