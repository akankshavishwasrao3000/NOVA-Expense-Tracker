from flask import Flask, jsonify, request, session, Response
from flask_cors import CORS
from datetime import datetime, timedelta
from io import BytesIO, StringIO
import csv
import os
import re
from werkzeug.security import generate_password_hash, check_password_hash
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

import ai_service
import config.config as config
from database import get_db as open_db

app = Flask(__name__)
app.secret_key = config.SECRET_KEY

app.config["SESSION_COOKIE_SAMESITE"] = "None"
app.config["SESSION_COOKIE_SECURE"] = True
app.config["SESSION_COOKIE_HTTPONLY"] = True

CORS(app, supports_credentials=True, origins=config.FRONTEND_ORIGINS)

user_budgets = {}

CATEGORY_KEYWORDS = {
    'Food': ('pizza', 'pani puri', 'vada pav', 'vada pow', 'burger', 'restaurant', 'dinner', 'lunch', 'breakfast', 'food', 'sandwich', 'coffee', 'tea'),
    'Fruits': ('fruit', 'apple', 'banana', 'mango', 'orange', 'watermelon'),
    'Vegetables': ('vegetables', 'tomato', 'potato', 'onion', 'ginger', 'brinjal', 'garlic'),
    'Transport': ('bus', 'train', 'metro', 'uber', 'ola', 'auto', 'petrol', 'fuel', 'taxi', 'transport'),
    'Shopping': ('shopping', 'mall', 'clothes', 'dress', 'shoes'),
    'Entertainment': ('movie', 'cinema', 'netflix', 'disney', 'jiohotstar', 'prime video', 'theater', 'game'),
    'Adventure': ('trekking', 'climbing', 'trip', 'travel'),
    'Health': ('medicine', 'hospital', 'doctor'),
    'Education': ('book', 'course', 'fees'),
    'Grocery': ('grocery', 'groceries'),
    'Rent': ('rent',),
    'Bill': ('electricity bill', 'light bill', 'water bill', 'tv recharge', 'mobile recharge', 'wifi recharge'),
    'Beverage': ('tea', 'lemon juice'),
}


def extract_amounts(message):
    """Return complete numeric amounts, including comma-grouped values."""
    numeric_values = re.findall(r'(?<![\d,])(?:\d{1,3}(?:,\d{2,3})+|\d+(?:\.\d+)?)(?![\d,])', message)
    amounts = [float(value.replace(',', '')) for value in numeric_values]
    if amounts:
        return amounts

    word_amounts = {
        'one thousand': 1000,
        'two thousand': 2000,
        'three thousand': 3000,
        'four thousand': 4000,
        'five thousand': 5000,
        'six thousand': 6000,
        'seven thousand': 7000,
        'eight thousand': 8000,
        'nine thousand': 9000,
        'ten thousand': 10000,
    }
    lower = message.lower()
    for phrase, amount in word_amounts.items():
        if phrase in lower:
            return [float(amount)]
    return []


def parse_expense_message(message):
    lower = message.lower()
    amounts = extract_amounts(lower)
    amount = amounts[0] if amounts else 0
    category = 'General'
    for name, keywords in CATEGORY_KEYWORDS.items():
        if any(keyword in lower for keyword in keywords):
            category = name
            break
    expense_date = datetime.now().date()
    if 'yesterday' in lower:
        expense_date -= timedelta(days=1)
    elif 'tomorrow' in lower:
        expense_date += timedelta(days=1)
    payment_mode = 'Cash'
    if 'upi' in lower:
        payment_mode = 'UPI'
    elif 'card' in lower:
        payment_mode = 'Card'
    elif 'net banking' in lower:
        payment_mode = 'Net Banking'
    return {
        'amount': amount,
        'category': category,
        'description': message,
        'date': expense_date,
        'payment_mode': payment_mode,
    }


def extract_expense_index(message, max_index=None):
    lower = message.lower()
    word_map = {
        'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5,
        'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10,
        'last': max_index,
    }
    for word, value in word_map.items():
        if word in lower:
            return value
    match = re.search(r'(?:update|delete)\s+(\d+)', lower)
    return int(match.group(1)) if match else None

def get_db():
    return open_db()


def init_db():
    with app.app_context():
        db = None
        try:
            db = get_db()
            db.execute(
                '''CREATE TABLE IF NOT EXISTS users (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    username VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    profile_pic VARCHAR(255)
                )'''
            )
            db.execute(
                '''CREATE TABLE IF NOT EXISTS expenses (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    user_id INT NOT NULL,
                    date DATE NOT NULL,
                    category VARCHAR(255) NOT NULL,
                    description TEXT NOT NULL,
                    amount DECIMAL(12, 2) NOT NULL,
                    payment_mode VARCHAR(100) NOT NULL,
                    entry_type VARCHAR(100) NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )'''
            )
            db.commit()
        except Exception:
            app.logger.exception('Database initialization failed')
        finally:
            if db:
                db.close()


init_db()


def api_user():
    if 'user_id' not in session:
        return jsonify({'error': 'Authentication required'}), 401
    return None


def expense_to_dict(expense):
    return {
        'id': expense['id'],
        'user_id': expense['user_id'],
        'date': expense['date'].isoformat() if hasattr(expense['date'], 'isoformat') else str(expense['date']),
        'category': expense['category'],
        'description': expense['description'],
        'amount': float(expense['amount']),
        'payment_mode': expense['payment_mode'],
        'entry_type': expense['entry_type'],
    }


def get_user_expenses(user_id, start_date=None, end_date=None):
    db = get_db()
    query = 'SELECT * FROM expenses WHERE user_id = ?'
    params = [user_id]
    if start_date and end_date:
        query += ' AND date BETWEEN ? AND ?'
        params.extend([start_date, end_date])
    query += ' ORDER BY date DESC'
    rows = db.execute(query, params).fetchall()
    db.close()
    return rows


@app.route('/api/auth/session')
def api_session():
    if 'user_id' not in session:
        return jsonify({'authenticated': False})
    return jsonify({
        'authenticated': True,
        'user': {'id': session['user_id'], 'username': session['username']}
    })


@app.route('/api/health')
def api_health():
    return jsonify({'status': 'ok', 'service': 'flask'})


@app.route('/api/health/db')
def api_database_health():
    try:
        from database import check_database
        check_database()
        return jsonify({'status': 'ok', 'database': 'mysql'})
    except RuntimeError as error:
        app.logger.exception('Database health check failed')
        return jsonify({'status': 'error', 'error': str(error)}), 503
    except Exception:
        app.logger.exception('Database health check failed')
        return jsonify({'status': 'error', 'error': 'Database unavailable'}), 503


@app.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.get_json(silent=True) or {}
    email = str(data.get('email', '')).strip()
    password = str(data.get('password', ''))
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    db = get_db()
    user = db.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    db.close()
    if not user or not check_password_hash(user['password'], password):
        return jsonify({'error': 'Invalid credentials'}), 401

    session['user_id'] = user['id']
    session['username'] = user['username']
    return jsonify({'authenticated': True, 'user': {'id': user['id'], 'username': user['username']}})


@app.route('/api/auth/signup', methods=['POST'])
def api_signup():
    data = request.get_json(silent=True) or {}
    username = str(data.get('username', '')).strip()
    email = str(data.get('email', '')).strip()
    password = str(data.get('password', ''))
    if not username or not email or not password:
        return jsonify({'error': 'Username, email, and password are required'}), 400

    db = get_db()
    try:
        db.execute(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            (username, email, generate_password_hash(password))
        )
        db.commit()
    except Exception:
        return jsonify({'error': 'Email already exists'}), 409
    finally:
        db.close()
    return jsonify({'success': True}), 201


@app.route('/api/auth/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({'success': True})


@app.route('/api/dashboard')
def api_dashboard():
    unauthorized = api_user()
    if unauthorized:
        return unauthorized
    expenses = [expense_to_dict(expense) for expense in get_user_expenses(session['user_id'])]
    current_month = datetime.now().strftime('%Y-%m')
    return jsonify({
        'user': {'id': session['user_id'], 'username': session['username']},
        'expenses': expenses,
        'total_expenses': sum(expense['amount'] for expense in expenses),
        'monthly_expenses': sum(expense['amount'] for expense in expenses if expense['date'].startswith(current_month)),
        'total_transactions': len(expenses),
    })


@app.route('/api/expenses', methods=['GET', 'POST'])
def api_expenses():
    unauthorized = api_user()
    if unauthorized:
        return unauthorized

    if request.method == 'GET':
        expenses = get_user_expenses(session['user_id'])
        return jsonify({'expenses': [expense_to_dict(expense) for expense in expenses]})

    data = request.get_json(silent=True) or {}
    required = ('date', 'category', 'description', 'amount', 'payment_mode')
    if any(not data.get(field) for field in required):
        return jsonify({'error': 'All expense fields are required'}), 400
    try:
        amount = float(data['amount'])
        if amount <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({'error': 'Amount must be greater than zero'}), 400

    db = get_db()
    cursor = db.execute(
        '''INSERT INTO expenses (user_id, date, category, description, amount, payment_mode, entry_type)
           VALUES (?, ?, ?, ?, ?, ?, ?)''',
        (session['user_id'], data['date'], str(data['category']).strip(), str(data['description']).strip(), amount,
         data['payment_mode'], data.get('entry_type', 'Manual'))
    )
    db.commit()
    expense_id = cursor.lastrowid
    db.close()
    return jsonify({'success': True, 'id': expense_id}), 201


@app.route('/api/expenses/<int:expense_id>', methods=['PUT', 'DELETE'])
def api_expense_detail(expense_id):
    unauthorized = api_user()
    if unauthorized:
        return unauthorized

    db = get_db()
    if request.method == 'DELETE':
        db.execute('DELETE FROM expenses WHERE id=? AND user_id=?', (expense_id, session['user_id']))
        db.commit()
        db.close()
        return jsonify({'success': True})

    data = request.get_json(silent=True) or {}
    try:
        amount = float(data['amount'])
        if amount <= 0:
            raise ValueError
    except (KeyError, TypeError, ValueError):
        db.close()
        return jsonify({'error': 'Amount must be greater than zero'}), 400

    db.execute(
        '''UPDATE expenses SET date=?, category=?, description=?, amount=?, payment_mode=?
           WHERE id=? AND user_id=?''',
        (data.get('date'), data.get('category'), data.get('description'), amount,
         data.get('payment_mode'), expense_id, session['user_id'])
    )
    db.commit()
    db.close()
    return jsonify({'success': True})


@app.route('/api/analytics/<period>')
def api_analytics(period):
    unauthorized = api_user()
    if unauthorized:
        return unauthorized

    user_id = session['user_id']
    now = datetime.now()
    if period == 'weekly':
        expenses = get_user_expenses(user_id, (now - timedelta(days=7)).strftime('%Y-%m-%d'), now.strftime('%Y-%m-%d'))
        mapper = lambda expense: expense['date'].isoformat() if hasattr(expense['date'], 'isoformat') else str(expense['date'])
    elif period == 'monthly':
        start = now.replace(day=1).strftime('%Y-%m-%d')
        next_month = now.replace(day=28) + timedelta(days=4)
        end = (next_month - timedelta(days=next_month.day)).strftime('%Y-%m-%d')
        expenses = get_user_expenses(user_id, start, end)
        mapper = lambda expense: str(((expense['date'].day if hasattr(expense['date'], 'day') else datetime.strptime(str(expense['date']), '%Y-%m-%d').day) - 1) // 7 + 1)
    elif period == 'yearly':
        expenses = get_user_expenses(user_id, f'{now.year}-01-01', f'{now.year}-12-31')
        mapper = lambda expense: (expense['date'].isoformat() if hasattr(expense['date'], 'isoformat') else str(expense['date']))[:7]
    else:
        return jsonify({'error': 'Unknown analytics period'}), 404

    timeline = {}
    categories = {}
    for expense in expenses:
        key = mapper(expense)
        amount = float(expense['amount'])
        timeline[key] = round(timeline.get(key, 0) + amount, 2)
        categories[expense['category']] = round(categories.get(expense['category'], 0) + amount, 2)
    return jsonify({'timeline': timeline, 'categories': categories})


@app.route('/api/calendar')
def api_calendar():
    unauthorized = api_user()
    if unauthorized:
        return unauthorized
    db = get_db()
    rows = db.execute('SELECT date, SUM(amount) AS total FROM expenses WHERE user_id=? GROUP BY date ORDER BY date DESC', (session['user_id'],)).fetchall()
    db.close()
    return jsonify([
        {
            'date': row['date'].isoformat() if hasattr(row['date'], 'isoformat') else str(row['date']),
            'amount': round(float(row['total']), 2),
        }
        for row in rows
    ])


@app.route('/api/calendar/<date_str>')
def api_calendar_day(date_str):
    unauthorized = api_user()
    if unauthorized:
        return unauthorized
    db = get_db()
    rows = db.execute('SELECT description, amount FROM expenses WHERE user_id=? AND date=? ORDER BY description ASC', (session['user_id'], date_str)).fetchall()
    db.close()
    return jsonify([{'description': row['description'], 'amount': float(row['amount'])} for row in rows])


@app.route('/api/chatbot', methods=['POST'])
def api_chatbot():
    unauthorized = api_user()
    if unauthorized:
        return unauthorized
    data = request.get_json(silent=True) or {}
    message = str(data.get('message', '')).strip()
    if not message:
        return jsonify({'error': 'A message is required'}), 400

    lower = message.lower()
    user_id = session['user_id']
    if lower.strip() in {'hi', 'hello', 'hey', 'help', 'start', 'guide'}:
        return jsonify({'response': f'<strong>Hello {session.get("username", "User")}!</strong><br><br>Try:<br>• I spent 200 on pizza today using UPI<br>• Show today expenses<br>• Update 1 to 500<br>• Delete 2<br>• Summary<br>• Set budget 5000'})

    if 'delete budget' in lower or 'remove budget' in lower:
        user_budgets.pop(user_id, None)
        return jsonify({'response': 'Budget deleted successfully.'})

    if 'show budget' in lower or 'my budget' in lower:
        return jsonify({'response': f'Your current monthly budget is ₹{user_budgets[user_id]:.2f}.' if user_id in user_budgets else 'No budget set yet.'})

    if 'budget' in lower:
        amount_match = re.search(r'(\d+(?:\.\d+)?)', lower)
        if not amount_match:
            return jsonify({'response': 'Please specify your budget amount.'})
        budget = float(amount_match.group(1))
        old_budget = user_budgets.get(user_id)
        user_budgets[user_id] = budget
        response = f'Monthly budget updated to ₹{budget:.2f}.'
        if old_budget is not None:
            response = f'Budget updated from ₹{old_budget:.2f} to ₹{budget:.2f}.'
        return jsonify({'response': response})

    db = get_db()
    if 'summary' in lower:
        today = datetime.now().date()
        month = datetime.now().strftime('%Y-%m')
        today_total = db.execute('SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id=? AND date=?', (user_id, today)).fetchone()['total']
        month_total = db.execute('SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id=? AND date LIKE ?', (user_id, f'{month}%')).fetchone()['total']
        top = db.execute('SELECT category, SUM(amount) AS total FROM expenses WHERE user_id=? GROUP BY category ORDER BY total DESC LIMIT 1', (user_id,)).fetchone()
        response = f"Today's spending: ₹{float(today_total):.2f}<br>This month's spending: ₹{float(month_total):.2f}<br>Top category: {top['category'] if top else 'None'}"
        if user_id in user_budgets:
            response += f'<br>Remaining budget: ₹{user_budgets[user_id] - float(month_total):.2f}'
        db.close()
        return jsonify({'response': response})

    if 'how much' in lower and 'today' in lower:
        total = db.execute('SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id=? AND date=?', (user_id, datetime.now().date())).fetchone()['total']
        db.close()
        return jsonify({'response': f'You spent ₹{float(total):.2f} today.'})

    if 'how much' in lower and 'month' in lower:
        total = db.execute('SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id=? AND date LIKE ?', (user_id, f'{datetime.now():%Y-%m}%')).fetchone()['total']
        db.close()
        return jsonify({'response': f'You spent ₹{float(total):.2f} this month.'})

    if 'which category' in lower:
        top = db.execute('SELECT category, SUM(amount) AS total FROM expenses WHERE user_id=? GROUP BY category ORDER BY total DESC LIMIT 1', (user_id,)).fetchone()
        db.close()
        return jsonify({'response': f"Your highest spending category is {top['category']} with ₹{float(top['total']):.2f}." if top else 'No expenses found.'})

    if 'show' in lower:
        today = datetime.now().date()
        date_filter = today
        time_label = 'today'
        is_monthly = False
        if 'yesterday' in lower:
            date_filter = today - timedelta(days=1)
            time_label = 'yesterday'
        elif 'month' in lower:
            is_monthly = True
            time_label = 'this month'
        selected_category = next((name for name, keywords in CATEGORY_KEYWORDS.items() if any(keyword in lower for keyword in keywords)), None)
        query = 'SELECT id, date, description, amount, category FROM expenses WHERE user_id=?'
        params = [user_id]
        if is_monthly:
            query += ' AND date LIKE ?'
            params.append(f'{datetime.now():%Y-%m}%')
        else:
            query += ' AND date=?'
            params.append(date_filter)
        if selected_category:
            query += ' AND category=?'
            params.append(selected_category)
        query += ' ORDER BY date DESC, id DESC'
        records = db.execute(query, params).fetchall()
        if not records:
            db.close()
            return jsonify({'response': f'No {selected_category or ""} records found for {time_label}.'})
        expense_map = {str(index): row['id'] for index, row in enumerate(records, 1)}
        session[f'expense_map_{user_id}'] = expense_map
        lines = '<br><br>'.join(f"{index}. {row['category']} - ₹{float(row['amount']):.2f} ({row['description']})" for index, row in enumerate(records, 1))
        db.close()
        return jsonify({'response': f'Here are your {time_label} {selected_category or ""}expenses:<br><br>{lines}'})

    if 'update' in lower or 'delete' in lower:
        expense_map = session.get(f'expense_map_{user_id}', {})
        index = extract_expense_index(lower, len(expense_map))
        if not expense_map:
            db.close()
            return jsonify({'response': "First use 'show' to see records."})
        if not index or str(index) not in expense_map:
            db.close()
            return jsonify({'response': 'Use a command such as update 1 to 500 or delete 1.'})
        expense_id = expense_map[str(index)]
        if 'delete' in lower:
            db.execute('DELETE FROM expenses WHERE id=? AND user_id=?', (expense_id, user_id))
            db.commit()
            db.close()
            return jsonify({'response': f'Record {index} deleted.', 'changed': True})
        amounts = extract_amounts(lower)
        if len(amounts) < 2:
            db.close()
            return jsonify({'response': 'Please specify the new amount, such as update 1 to 500.'})
        amount = float(amounts[-1])
        db.execute('UPDATE expenses SET amount=? WHERE id=? AND user_id=?', (amount, expense_id, user_id))
        db.commit()
        db.close()
        return jsonify({'response': f'Record {index} updated to ₹{amount:.2f}.', 'changed': True})

    expense_data = parse_expense_message(message)
    if expense_data['date'] > datetime.now().date():
        db.close()
        return jsonify({'response': "You can't add tomorrow's expense yet. Add it tomorrow."})
    if expense_data['amount'] > 0:
        db.execute(
            '''INSERT INTO expenses (user_id, date, category, description, amount, payment_mode, entry_type)
               VALUES (?, ?, ?, ?, ?, ?, ?)''',
            (user_id, expense_data['date'], expense_data['category'], expense_data['description'], expense_data['amount'], expense_data['payment_mode'], 'Chatbot')
        )
        db.commit()
        db.close()
        return jsonify({'response': f"Expense of ₹{expense_data['amount']:.2f} added successfully in {expense_data['category']} category.", 'changed': True})
    db.close()
    return jsonify({'response': 'Could not understand your message. Try: I spent 200 on pizza today using UPI.'})


@app.route('/api/profile')
def api_profile():
    unauthorized = api_user()
    if unauthorized:
        return unauthorized
    db = get_db()
    user = db.execute('SELECT id, username, email, profile_pic FROM users WHERE id=?', (session['user_id'],)).fetchone()
    db.close()
    return jsonify({'user': dict(user) if user else None})


@app.route('/api/profile/picture', methods=['POST'])
def api_profile_picture():
    unauthorized = api_user()
    if unauthorized:
        return unauthorized
    file = request.files.get('profile_pic')
    if not file or not file.filename:
        return jsonify({'error': 'A profile image is required'}), 400
    os.makedirs('static/profile_pics', exist_ok=True)
    filename = f'user_{session["user_id"]}.png'
    file.save(os.path.join('static/profile_pics', filename))
    db = get_db()
    db.execute('UPDATE users SET profile_pic=? WHERE id=?', (filename, session['user_id']))
    db.commit()
    db.close()
    return jsonify({'success': True, 'profile_pic': filename})


@app.route('/api/ai/<analysis_type>', methods=['GET', 'POST'])
def api_ai_analysis(analysis_type):
    unauthorized = api_user()
    if unauthorized:
        return unauthorized
    valid_types = {'financial', 'budget', 'savings', 'spending'}
    if analysis_type not in valid_types:
        return jsonify({'error': 'Unknown analysis type'}), 404
    insights = ai_service.generate_ai_insights(session['user_id'])
    if request.method == 'POST':
        return jsonify({'success': True, 'response': ai_service.get_ai_analysis(insights, analysis_type)})
    return jsonify({'insights': insights})


@app.route('/export-csv')
def export_csv():
    unauthorized = api_user()
    if unauthorized:
        return unauthorized
    expenses = get_user_expenses(session['user_id'])
    output = StringIO(newline='')
    writer = csv.writer(output)
    writer.writerow(['Date', 'Category', 'Description', 'Amount', 'Payment Mode'])
    for exp in expenses:
        writer.writerow([f" {exp['date']}", exp['category'], exp['description'], f"{float(exp['amount']):.2f}", exp['payment_mode']])
    return Response(output.getvalue(), mimetype='text/csv', headers={'Content-Disposition': 'attachment; filename=expense_report.csv'})


@app.route('/export-pdf')
def export_pdf():
    unauthorized = api_user()
    if unauthorized:
        return unauthorized
    expenses = get_user_expenses(session['user_id'])
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    elements = []
    styles = getSampleStyleSheet()
    title_style = styles['Heading1']
    title_style.alignment = 1
    normal_style = styles['Normal']
    normal_style.fontSize = 11
    elements.append(Paragraph('Expense Report', title_style))
    elements.append(Spacer(1, 0.25 * inch))
    elements.append(Paragraph(f"<b>Username:</b> {session.get('username', 'User')}", normal_style))
    elements.append(Paragraph(f"<b>Report Date:</b> {datetime.now().strftime('%Y-%m-%d')}", normal_style))
    elements.append(Spacer(1, 0.15 * inch))
    total_expenses = sum(float(exp['amount']) for exp in expenses)
    current_month = datetime.now().strftime('%Y-%m')
    monthly_expenses = sum(
        float(exp['amount'])
        for exp in expenses
        if (exp['date'].isoformat() if hasattr(exp['date'], 'isoformat') else str(exp['date'])).startswith(current_month)
    )
    elements.append(Paragraph(f"<b>Total Expenses:</b> {total_expenses:.2f}", normal_style))
    elements.append(Paragraph(f"<b>Monthly Expense:</b> {monthly_expenses:.2f}", normal_style))
    elements.append(Spacer(1, 0.3 * inch))
    data = [['Date', 'Category', 'Description', 'Amount', 'Payment Mode']]
    for exp in expenses:
        data.append([str(exp['date']), str(exp['category']), str(exp['description']), f"{float(exp['amount']):.2f}", str(exp['payment_mode'])])
    table = Table(data, colWidths=[1.1 * inch, 1.2 * inch, 2.2 * inch, 1 * inch, 1.3 * inch], hAlign='CENTER')
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (3, 0), (3, -1), 'RIGHT'),
        ('LINEABOVE', (0, 0), (-1, 0), 1.5, colors.black),
        ('LINEBELOW', (0, 0), (-1, 0), 1.5, colors.black),
        ('LINEBELOW', (0, 1), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(table)
    doc.build(elements)
    buffer.seek(0)
    return Response(buffer.getvalue(), mimetype='application/pdf', headers={'Content-Disposition': 'attachment;filename=expense_report.pdf'})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', '5000')), debug=os.getenv('FLASK_DEBUG', '').lower() == 'true')
