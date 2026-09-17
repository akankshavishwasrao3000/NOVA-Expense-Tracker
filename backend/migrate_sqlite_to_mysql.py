"""Copy the existing SQLite data into the configured MySQL database.

Usage:
    python migrate_sqlite_to_mysql.py

The SQLite file is read only and is never deleted or modified.
"""

import os
import sqlite3

import mysql.connector


SQLITE_PATH = os.getenv("SQLITE_PATH", "expense_tracker.db")


def main():
    source = sqlite3.connect(SQLITE_PATH)
    source.row_factory = sqlite3.Row
    target = mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "127.0.0.1"),
        port=int(os.getenv("MYSQL_PORT", "3306")),
        database=os.environ["MYSQL_DATABASE"],
        user=os.environ["MYSQL_USER"],
        password=os.environ["MYSQL_PASSWORD"],
    )
    cursor = target.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INT PRIMARY KEY,
            username VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password TEXT NOT NULL,
            profile_pic VARCHAR(255)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id INT PRIMARY KEY,
            user_id INT NOT NULL,
            date DATE NOT NULL,
            category VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            amount DECIMAL(12, 2) NOT NULL,
            payment_mode VARCHAR(100) NOT NULL,
            entry_type VARCHAR(100) NOT NULL,
            CONSTRAINT fk_expenses_user FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    users = source.execute("SELECT id, username, email, password, profile_pic FROM users").fetchall()
    cursor.executemany(
        """INSERT INTO users (id, username, email, password, profile_pic)
           VALUES (%s, %s, %s, %s, %s)
           ON DUPLICATE KEY UPDATE username=VALUES(username), email=VALUES(email),
             password=VALUES(password), profile_pic=VALUES(profile_pic)""",
        [tuple(row) for row in users],
    )
    expenses = source.execute(
        """SELECT id, user_id, date, category, description, amount, payment_mode, entry_type
           FROM expenses ORDER BY id"""
    ).fetchall()
    cursor.executemany(
        """INSERT INTO expenses (id, user_id, date, category, description, amount, payment_mode, entry_type)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
           ON DUPLICATE KEY UPDATE user_id=VALUES(user_id), date=VALUES(date),
             category=VALUES(category), description=VALUES(description), amount=VALUES(amount),
             payment_mode=VALUES(payment_mode), entry_type=VALUES(entry_type)""",
        [tuple(row) for row in expenses],
    )
    target.commit()
    print(f"Migrated {len(users)} users and {len(expenses)} expenses from {SQLITE_PATH}.")
    cursor.close()
    target.close()
    source.close()


if __name__ == "__main__":
    main()
