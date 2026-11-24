"""Fill SpendLens with realistic demo data for the current month.

Usage:
    python scripts/seed_demo.py

It writes to the database in SPENDLENS_DB (default: spendlens.db) and
replaces any existing data.
"""
import json
import os
import random
import sqlite3
from datetime import date, timedelta

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DB_PATH = os.environ.get('SPENDLENS_DB', os.path.join(ROOT, 'spendlens.db'))

EXPENSES = [
    ('Groceries', 'Food & Dining', 1450, 'UPI', 'Big Bazaar', '😌 Satisfied'),
    ('Coffee with friends', 'Food & Dining', 380, 'UPI', 'Cafe', '😊 Happy'),
    ('Cab to campus', 'Travel', 220, 'UPI', 'Bhubaneswar', '😐 Neutral'),
    ('Train tickets home', 'Travel', 1250, 'Debit Card', 'IRCTC', '😌 Satisfied'),
    ('Online course', 'Education', 1999, 'Credit Card', 'Online', '😊 Happy'),
    ('Textbooks', 'Education', 850, 'Cash', 'Campus store', '😐 Neutral'),
    ('Movie night', 'Entertainment', 600, 'UPI', 'PVR', '😊 Happy'),
    ('Music subscription', 'Entertainment', 119, 'Credit Card', 'Online', '😐 Neutral'),
    ('Sneakers', 'Shopping', 2800, 'Credit Card', 'Mall', '😕 Unsure'),
    ('Impulse gadget', 'Shopping', 1500, 'UPI', 'Online', '😞 Regret'),
    ('Dinner out', 'Food & Dining', 920, 'Debit Card', 'Restaurant', '😊 Happy'),
    ('Mobile recharge', 'Other', 299, 'UPI', 'Online', '😐 Neutral'),
    ('Team lunch', 'Food & Dining', 1600, 'Bank Transfer', 'Office', '😌 Satisfied'),
    ('Printing', 'Education', 150, 'Cash', 'Campus', '😐 Neutral'),
]


def main():
    random.seed(7)
    today = date.today()
    month_key = today.strftime('%Y-%m')

    with open(os.path.join(ROOT, 'schema.sql'), encoding='utf-8') as f:
        schema = f.read()

    db = sqlite3.connect(DB_PATH)
    db.executescript(schema)

    for i, (desc, cat, amount, method, location, mood) in enumerate(EXPENSES):
        day = today - timedelta(days=min(today.day - 1, i * 2 % 24))
        expense_type = 'organization' if desc == 'Team lunch' else 'personal'
        db.execute(
            'INSERT INTO expenses (date, "desc", cat, amount, type, paymentMethod, location, mood, billPhoto) '
            'VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)',
            (day.isoformat(), desc, cat, amount, expense_type, method, location, mood),
        )

    db.executemany(
        'INSERT INTO payments ("desc", amount, date, isRepeating, repeatDays) VALUES (?, ?, ?, ?, ?)',
        [
            ('Hostel rent', 8000, (today + timedelta(days=6)).isoformat(), 1, 30),
            ('Internet bill', 699, (today + timedelta(days=3)).isoformat(), 1, 30),
            ('Exam fee', 2500, (today + timedelta(days=12)).isoformat(), 0, 0),
        ],
    )

    settings = {
        'userName': 'Ananya',
        'incomes': json.dumps({month_key: 25000}),
        'budgets': json.dumps({month_key: {'total': 18000, 'categories': {
            'Food & Dining': 5000, 'Travel': 3000, 'Education': 4000,
            'Entertainment': 1500, 'Shopping': 3500, 'Other': 1000,
        }}}),
    }
    db.executemany('INSERT INTO settings (key, value) VALUES (?, ?)', settings.items())
    db.commit()
    db.close()
    print(f'Seeded demo data into {DB_PATH}')


if __name__ == '__main__':
    main()
