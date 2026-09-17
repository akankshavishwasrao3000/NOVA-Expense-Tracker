"""MySQL database connection helpers for the Flask API."""

import os


class Row(dict):
    """Dictionary row that also supports the positional access used by legacy code."""

    def __getitem__(self, key):
        if isinstance(key, int):
            return list(self.values())[key]
        return super().__getitem__(key)


class Database:
    def __init__(self, connection):
        self.connection = connection
        self.is_mysql = True

    def execute(self, query, params=()):
        query = query.replace("?", "%s")
        cursor = self.connection.cursor(dictionary=True)
        cursor.execute(query, tuple(params))
        return CursorResult(cursor, self.connection)

    def commit(self):
        self.connection.commit()

    def rollback(self):
        self.connection.rollback()

    def close(self):
        self.connection.close()


class CursorResult:
    def __init__(self, cursor, connection):
        self.cursor = cursor
        self.connection = connection

    def fetchone(self):
        row = self.cursor.fetchone()
        if row is None:
            return None
        return Row(row)

    def fetchall(self):
        rows = self.cursor.fetchall()
        return [Row(row) for row in rows]

    @property
    def lastrowid(self):
        return self.cursor.lastrowid


def get_db():
    required = ("MYSQL_HOST", "MYSQL_PORT", "MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD")
    missing = [name for name in required if os.getenv(name) is None]
    if missing:
        raise RuntimeError(f"Missing MySQL configuration: {', '.join(missing)}")

    try:
        import mysql.connector
    except ImportError as exc:
        raise RuntimeError("MySQL support requires mysql-connector-python") from exc

    connection = mysql.connector.connect(
        host=os.environ["MYSQL_HOST"],
        port=int(os.environ["MYSQL_PORT"]),
        database=os.environ["MYSQL_DATABASE"],
        user=os.environ["MYSQL_USER"],
        password=os.environ["MYSQL_PASSWORD"],
    )

    return Database(connection)


def check_database():
    """Run a minimal connectivity query and always close the connection."""
    database = get_db()
    try:
        database.execute("SELECT 1").fetchone()
        return database.is_mysql
    finally:
        database.close()
