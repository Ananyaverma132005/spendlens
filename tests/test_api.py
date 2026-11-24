"""Tests for the SpendLens REST API."""


def test_index_page_loads(client):
    response = client.get('/')
    assert response.status_code == 200
    assert b'Spendlens' in response.data


def test_service_worker_served_from_root(client):
    response = client.get('/service-worker.js')
    assert response.status_code == 200
    assert response.mimetype == 'application/javascript'


def test_initial_data_is_empty(client):
    data = client.get('/api/data').get_json()
    assert data['allExpenses'] == []
    assert data['upcomingPayments'] == []
    assert data['budgets'] == {}
    assert data['userName'] == 'User'


# --- Expenses ---

def test_create_expense(client, expense_payload):
    response = client.post('/api/expenses', json=expense_payload)
    assert response.status_code == 201
    created = response.get_json()
    assert created['id'] == 1
    assert created['desc'] == 'Lunch'
    assert created['amount'] == 250.0
    assert created['billPhoto'] == 0


def test_create_expense_fills_optional_fields(client):
    response = client.post('/api/expenses', json={
        'date': '2026-11-24', 'desc': 'Bus', 'cat': 'Travel', 'amount': 40,
    })
    assert response.status_code == 201
    assert response.get_json()['type'] == 'personal'


def test_create_expense_missing_fields(client):
    response = client.post('/api/expenses', json={'desc': 'No amount'})
    assert response.status_code == 400
    assert 'amount' in response.get_json()['error']


def test_create_expense_rejects_invalid_amount(client, expense_payload):
    for bad in (-5, 0, 'abc'):
        response = client.post('/api/expenses', json={**expense_payload, 'amount': bad})
        assert response.status_code == 400


def test_create_expense_rejects_non_json(client):
    response = client.post('/api/expenses', data='not json', content_type='text/plain')
    assert response.status_code == 400


def test_update_expense(client, expense_payload):
    client.post('/api/expenses', json=expense_payload)
    response = client.put('/api/expenses/1', json={**expense_payload, 'amount': 300})
    assert response.status_code == 200
    assert response.get_json()['amount'] == 300.0


def test_update_missing_expense_returns_404(client, expense_payload):
    response = client.put('/api/expenses/999', json=expense_payload)
    assert response.status_code == 404


def test_delete_expense_also_deletes_photo(client, expense_payload):
    client.post('/api/expenses', json=expense_payload)
    client.post('/api/photos', json={'expenseId': 1, 'dataUrl': 'data:image/png;base64,AAAA'})

    assert client.delete('/api/expenses/1').status_code == 200

    data = client.get('/api/data').get_json()
    assert data['allExpenses'] == []
    assert data['allBillPhotos'] == []


# --- Settings ---

def test_save_budget_setting_round_trips_as_json(client):
    budgets = {'2026-11': {'amount': 15000}}
    response = client.post('/api/settings', json={'key': 'budgets', 'value': budgets})
    assert response.status_code == 200
    assert client.get('/api/data').get_json()['budgets'] == budgets


def test_save_setting_requires_key(client):
    response = client.post('/api/settings', json={'value': 'x'})
    assert response.status_code == 400


# --- Payments ---

def test_payment_lifecycle(client):
    created = client.post('/api/payments', json={
        'desc': 'Rent', 'amount': 8000, 'date': '2026-12-01', 'isRepeating': True, 'repeatDays': 30,
    })
    assert created.status_code == 201
    assert created.get_json()['isRepeating'] == 1

    updated = client.put('/api/payments/1', json={'date': '2026-12-31'})
    assert updated.get_json()['date'] == '2026-12-31'

    assert client.delete('/api/payments/1').status_code == 200
    assert client.get('/api/data').get_json()['upcomingPayments'] == []


def test_payment_requires_amount(client):
    response = client.post('/api/payments', json={'desc': 'Rent', 'date': '2026-12-01'})
    assert response.status_code == 400


# --- Photos ---

def test_photo_for_unknown_expense_returns_404(client):
    response = client.post('/api/photos', json={'expenseId': 42, 'dataUrl': 'data:,'})
    assert response.status_code == 404


def test_delete_photo_clears_flag(client, expense_payload):
    client.post('/api/expenses', json={**expense_payload, 'billPhoto': True})
    client.post('/api/photos', json={'expenseId': 1, 'dataUrl': 'data:,'})

    assert client.delete('/api/photos/1').status_code == 200

    expense = client.get('/api/data').get_json()['allExpenses'][0]
    assert expense['billPhoto'] == 0
