import os
import sys

import pytest

# Make the project root importable.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app as flask_app  # noqa: E402


@pytest.fixture
def client(tmp_path):
    """A test client backed by a fresh, temporary SQLite database."""
    flask_app.config.update(TESTING=True, DATABASE=str(tmp_path / 'test.db'))
    with flask_app.test_client() as client:
        yield client


@pytest.fixture
def expense_payload():
    return {
        'date': '2026-11-24',
        'desc': 'Lunch',
        'cat': 'Food',
        'amount': 250,
        'type': 'personal',
        'paymentMethod': 'UPI',
        'location': 'Bhubaneswar',
        'mood': 'happy',
        'billPhoto': False,
    }
