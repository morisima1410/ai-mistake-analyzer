"""
Database module for AI Mistake Analyzer.
Initializes SQLite database and tables for users, user-specific mistakes, and contact messages.
"""

import os
import sqlite3

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "..", "mistakes.db"))


def get_db_connection() -> sqlite3.Connection:
    """Return a connection with row factory configured."""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    """Create all required tables: users, mistakes, contact_messages, sessions."""
    os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)
    conn = get_db_connection()
    cursor = conn.cursor()

    # Users Table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
    )

    # Mistakes Table (User-specific)
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS mistakes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            question TEXT NOT NULL,
            student_answer TEXT NOT NULL,
            subject TEXT NOT NULL,
            is_correct BOOLEAN NOT NULL,
            mistake_type TEXT NOT NULL,
            confidence REAL NOT NULL,
            correct_answer TEXT NOT NULL,
            why_wrong TEXT NOT NULL,
            explanation TEXT NOT NULL,
            learning_tip TEXT NOT NULL,
            practice_question TEXT NOT NULL,
            difficulty TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
        """
    )

    # Contact Messages Table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS contact_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
    )

    # Sessions Table for secure server-side session tracking
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
        """
    )

    conn.commit()
    conn.close()


def get_db():
    """Dependency for route endpoints."""
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()
