(function () {
  'use strict';

  var STORAGE_KEY = 'spendlens-demo-db-v1';

  function pad(n) { return String(n).padStart(2, '0'); }
  function isoDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDays(d, n) { var c = new Date(d); c.setDate(c.getDate() + n); return c; }

  // Same sample data as scripts/seed_demo.py, dated relative to today.
  function seed() {
    var today = new Date();
    var monthKey = today.getFullYear() + '-' + pad(today.getMonth() + 1);
    var rows = [
      ['Groceries', 'Food & Dining', 1450, 'UPI', 'Big Bazaar', '😌 Satisfied'],
      ['Coffee with friends', 'Food & Dining', 380, 'UPI', 'Cafe', '😊 Happy'],
      ['Cab to campus', 'Travel', 220, 'UPI', 'Bhubaneswar', '😐 Neutral'],
      ['Train tickets home', 'Travel', 1250, 'Debit Card', 'IRCTC', '😌 Satisfied'],
      ['Online course', 'Education', 1999, 'Credit Card', 'Online', '😊 Happy'],
      ['Textbooks', 'Education', 850, 'Cash', 'Campus store', '😐 Neutral'],
      ['Movie night', 'Entertainment', 600, 'UPI', 'PVR', '😊 Happy'],
      ['Music subscription', 'Entertainment', 119, 'Credit Card', 'Online', '😐 Neutral'],
      ['Sneakers', 'Shopping', 2800, 'Credit Card', 'Mall', '😕 Unsure'],
      ['Impulse gadget', 'Shopping', 1500, 'UPI', 'Online', '😞 Regret'],
      ['Dinner out', 'Food & Dining', 920, 'Debit Card', 'Restaurant', '😊 Happy'],
      ['Mobile recharge', 'Other', 299, 'UPI', 'Online', '😐 Neutral'],
      ['Team lunch', 'Food & Dining', 1600, 'Bank Transfer', 'Office', '😌 Satisfied'],
      ['Printing', 'Education', 150, 'Cash', 'Campus', '😐 Neutral']
    ];
    var expenses = rows.map(function (r, i) {
      var back = Math.min(today.getDate() - 1, (i * 2) % 24);
      return {
        id: i + 1, date: isoDate(addDays(today, -back)), desc: r[0], cat: r[1], amount: r[2],
        type: r[0] === 'Team lunch' ? 'organization' : 'personal',
        paymentMethod: r[3], location: r[4], mood: r[5], billPhoto: 0
      };
    });
    var budgets = {}; budgets[monthKey] = { total: 18000, categories: {
      'Food & Dining': 5000, 'Travel': 3000, 'Education': 4000,
      'Entertainment': 1500, 'Shopping': 3500, 'Other': 1000 } };
    var incomes = {}; incomes[monthKey] = 25000;
    return {
      nextExpenseId: expenses.length + 1,
      nextPaymentId: 4,
      settings: { userName: 'Ananya', budgets: budgets, incomes: incomes },
      expenses: expenses,
      payments: [
        { id: 1, desc: 'Hostel rent', amount: 8000, date: isoDate(addDays(today, 6)), isRepeating: 1, repeatDays: 30 },
        { id: 2, desc: 'Internet bill', amount: 699, date: isoDate(addDays(today, 3)), isRepeating: 1, repeatDays: 30 },
        { id: 3, desc: 'Exam fee', amount: 2500, date: isoDate(addDays(today, 12)), isRepeating: 0, repeatDays: 0 }
      ],
      photos: []
    };
  }

  var memoryDb = null;
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* storage unavailable: fall back to memory */ }
    if (!memoryDb) memoryDb = seed();
    return memoryDb;
  }
  function save(db) {
    memoryDb = db;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch (e) { /* memory only */ }
  }

  function json(body, status) {
    return Promise.resolve(new Response(JSON.stringify(body), {
      status: status || 200, headers: { 'Content-Type': 'application/json' }
    }));
  }
  function error(message, status) { return json({ error: message }, status || 400); }

  function require(data, fields) {
    var missing = fields.filter(function (f) { return data[f] === undefined || data[f] === null || data[f] === ''; });
    return missing.length ? 'Missing required field(s): ' + missing.join(', ') : null;
  }
  function amountError(value) {
    var n = Number(value);
    if (value === '' || isNaN(n)) return 'amount must be a number';
    if (n <= 0) return 'amount must be greater than 0';
    return null;
  }
  function cleanExpense(data, id) {
    return {
      id: id, date: data.date, desc: data.desc, cat: data.cat, amount: Number(data.amount),
      type: data.type || 'personal', paymentMethod: data.paymentMethod || '',
      location: data.location || '', mood: data.mood || '', billPhoto: data.billPhoto ? 1 : 0
    };
  }

  function handle(method, path, data) {
    var db = load();
    var m, problem;

    if (path === '/api/data' && method === 'GET') {
      return json({
        userName: db.settings.userName || 'User',
        budgets: db.settings.budgets || {},
        incomes: db.settings.incomes || {},
        allExpenses: db.expenses.slice().sort(function (a, b) { return b.id - a.id; }),
        upcomingPayments: db.payments.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }),
        allBillPhotos: db.photos.slice().sort(function (a, b) { return b.expenseId - a.expenseId; })
      });
    }

    if (path === '/api/settings' && method === 'POST') {
      if (!data.key || data.value === undefined || data.value === null) return error('Missing key or value');
      db.settings[data.key] = data.value; save(db);
      return json({ success: true, key: data.key, value: data.value });
    }

    if (path === '/api/expenses' && method === 'POST') {
      if ((problem = require(data, ['date', 'desc', 'cat', 'amount']) || amountError(data.amount))) return error(problem);
      var created = cleanExpense(data, db.nextExpenseId++);
      db.expenses.push(created); save(db);
      return json(created, 201);
    }

    if ((m = path.match(/^\/api\/expenses\/(\d+)$/))) {
      var eid = Number(m[1]);
      var idx = db.expenses.findIndex(function (e) { return e.id === eid; });
      if (method === 'PUT') {
        if ((problem = require(data, ['date', 'desc', 'cat', 'amount']) || amountError(data.amount))) return error(problem);
        if (idx < 0) return error('Expense not found', 404);
        db.expenses[idx] = cleanExpense(data, eid); save(db);
        return json(db.expenses[idx]);
      }
      if (method === 'DELETE') {
        db.expenses = db.expenses.filter(function (e) { return e.id !== eid; });
        db.photos = db.photos.filter(function (p) { return p.expenseId !== eid; });
        save(db);
        return json({ success: true });
      }
    }

    if (path === '/api/payments' && method === 'POST') {
      if ((problem = require(data, ['desc', 'amount', 'date']) || amountError(data.amount))) return error(problem);
      var payment = {
        id: db.nextPaymentId++, desc: data.desc, amount: Number(data.amount), date: data.date,
        isRepeating: data.isRepeating ? 1 : 0, repeatDays: Number(data.repeatDays || 0)
      };
      db.payments.push(payment); save(db);
      return json(payment, 201);
    }

    if ((m = path.match(/^\/api\/payments\/(\d+)$/))) {
      var pid = Number(m[1]);
      var p = db.payments.find(function (x) { return x.id === pid; });
      if (method === 'PUT') {
        if ((problem = require(data, ['date']))) return error(problem);
        if (!p) return error('Payment not found', 404);
        p.date = data.date; save(db);
        return json(p);
      }
      if (method === 'DELETE') {
        db.payments = db.payments.filter(function (x) { return x.id !== pid; }); save(db);
        return json({ success: true });
      }
    }

    if (path === '/api/photos' && method === 'POST') {
      if ((problem = require(data, ['expenseId', 'dataUrl']))) return error(problem);
      var expenseId = Number(data.expenseId);
      if (!db.expenses.some(function (e) { return e.id === expenseId; })) return error('Expense not found', 404);
      var photo = { expenseId: expenseId, dataUrl: data.dataUrl, date: data.date || null, description: data.description || null };
      db.photos = db.photos.filter(function (x) { return x.expenseId !== expenseId; });
      db.photos.push(photo); save(db);
      return json(photo, 201);
    }

    if ((m = path.match(/^\/api\/photos\/(\d+)$/)) && method === 'DELETE') {
      var peid = Number(m[1]);
      db.photos = db.photos.filter(function (x) { return x.expenseId !== peid; });
      db.expenses.forEach(function (e) { if (e.id === peid) e.billPhoto = 0; });
      save(db);
      return json({ success: true });
    }

    return error('Not found', 404);
  }

  var realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : input.url;
    var path = url.replace(/^https?:\/\/[^/]+/, '');
    var apiAt = path.indexOf('/api/');
    if (apiAt === -1) return realFetch(input, init);
    path = path.slice(apiAt).split('?')[0];
    var method = ((init && init.method) || 'GET').toUpperCase();
    var data = {};
    try { data = init && init.body ? JSON.parse(init.body) : {}; } catch (e) { return error('Request body must be a JSON object'); }
    return handle(method, path, data);
  };

  // Small banner so visitors know how the demo works, with a reset button.
  function addBanner() {
    var bar = document.createElement('div');
    bar.setAttribute('role', 'note');
    bar.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:9999;' +
      'background:#1f2937;color:#fff;font:500 13px/1.4 Poppins,system-ui,sans-serif;padding:8px 14px;' +
      'border-radius:999px;box-shadow:0 6px 20px rgba(0,0,0,.18);display:flex;gap:10px;align-items:center;' +
      'max-width:calc(100% - 32px);';
    bar.innerHTML = '<span>Live demo · your data stays in this browser</span>';
    var reset = document.createElement('button');
    reset.textContent = 'Reset';
    reset.style.cssText = 'background:#18BC9C;color:#fff;border:0;border-radius:999px;padding:4px 10px;cursor:pointer;font:inherit;';
    reset.onclick = function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
      memoryDb = null; location.reload();
    };
    var close = document.createElement('button');
    close.textContent = '×';
    close.setAttribute('aria-label', 'Dismiss');
    close.style.cssText = 'background:none;color:#9ca3af;border:0;cursor:pointer;font-size:16px;line-height:1;';
    close.onclick = function () { bar.remove(); };
    bar.appendChild(reset); bar.appendChild(close);
    document.body.appendChild(bar);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addBanner);
  else addBanner();
})();
