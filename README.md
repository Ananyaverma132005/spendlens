<div align="center">

<img src="static/images/logo.png" alt="SpendLens logo" width="96" />

# SpendLens

**A full-stack expense tracker you can install as an app (PWA), with budgets, income tracking, spending charts and bill photos.**

![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?style=flat&logo=flask&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat&logo=sqlite&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=flat&logo=chartdotjs&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=flat&logo=pwa&logoColor=white)

</div>

---

## Overview

SpendLens helps you see where your money goes each month. You log expenses, set a monthly income and budget, and the dashboard shows what you've spent, your daily average and what's left, with charts of trends and categories. It's a Progressive Web App, so you can install it on a phone or desktop and use it like a native app.

## Features

- **Dashboard.** Monthly income, total spent, daily average and remaining balance at a glance.
- **Charts.** A spending-trend line and a category breakdown, built with Chart.js.
- **Budgets and income.** Set a cap and an expected income for each month. A banner tracks your budget.
- **Full expense management.** Add, edit and delete expenses with a category, payment method, location and mood, and filter them by type.
- **Upcoming payments.** Schedule one-off or repeating bills so they're not missed.
- **Bills and receipts.** Attach a photo of the bill to any expense.
- **Installable PWA.** Includes a web app manifest and a service worker.
- **REST API.** A Flask backend with JSON endpoints, backed by SQLite.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python, Flask (REST API) |
| Database | SQLite |
| Frontend | HTML5, CSS3, vanilla JavaScript, Chart.js, Font Awesome |
| PWA | Web App Manifest, Service Worker |

## Architecture

```
Browser (HTML/CSS/JS + Chart.js)
        │  fetch() JSON
        ▼
Flask REST API (app.py)  ──►  SQLite (spendlens.db, created from schema.sql)
```

### API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/data` | Load expenses, payments, photos and settings |
| POST | `/api/settings` | Save income, budgets and user settings |
| POST / PUT / DELETE | `/api/expenses[/<id>]` | Create, update or delete an expense |
| POST / PUT / DELETE | `/api/payments[/<id>]` | Manage upcoming payments |
| POST / DELETE | `/api/photos[/<expense_id>]` | Attach or remove a bill photo |

## Getting started

**Prerequisites:** Python 3.10+

```bash
git clone https://github.com/Ananyaverma132005/spendlens.git
cd spendlens

python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
python app.py
```

Open **http://127.0.0.1:5000**. The SQLite database is created automatically the first time you run the app.

To reset the database, run `flask --app app init-db`.

## Project structure

```
spendlens/
├── app.py                  # Flask app and REST API
├── schema.sql              # Database schema
├── requirements.txt
├── vercel.json             # Vercel deployment config
├── templates/
│   └── index.html          # Single-page UI
└── static/
    ├── css/style.css
    ├── js/script.js        # Front-end logic and charts
    ├── js/service-worker.js
    ├── json/manifest.json  # PWA manifest
    └── images/logo.png
```

## Deployment note

SpendLens stores data in a local SQLite file, so it works best run locally or on a host with persistent disk storage. On serverless platforms such as Vercel, the file system is temporary, so data won't survive between requests. A hosted Postgres database would be the next step for a production deployment.

## Author

**Ananya Verma** · [GitHub](https://github.com/Ananyaverma132005) · [LinkedIn](https://linkedin.com/in/ananya-verma)
