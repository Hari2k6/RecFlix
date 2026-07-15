import sqlite3

def create_database():
    conn = sqlite3.connect('recflix.db')
    cursor = conn.cursor()

    print("Initializing RecFlix 3NF Database Schema...")
    cursor.execute("PRAGMA foreign_keys = ON;")

    # 1. CORE ENTITY TABLES
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Movies (
            movie_id INTEGER PRIMARY KEY, 
            title TEXT NOT NULL,
            release_year INTEGER,
            duration_minutes INTEGER,
            rating_score REAL,
            rating_count INTEGER,
            is_adult INTEGER DEFAULT 0
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS People (
            person_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        )
    ''')

    # 2. LOOKUP TABLES
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Genres (
            genre_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        )
    ''')

    # 3. JUNCTION TABLES
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Movie_Genres (
            movie_id INTEGER,
            genre_id INTEGER,
            PRIMARY KEY (movie_id, genre_id),
            FOREIGN KEY (movie_id) REFERENCES Movies(movie_id) ON DELETE CASCADE,
            FOREIGN KEY (genre_id) REFERENCES Genres(genre_id) ON DELETE CASCADE
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Movie_Directors (
            movie_id INTEGER,
            person_id INTEGER,
            PRIMARY KEY (movie_id, person_id),
            FOREIGN KEY (movie_id) REFERENCES Movies(movie_id) ON DELETE CASCADE,
            FOREIGN KEY (person_id) REFERENCES People(person_id) ON DELETE CASCADE
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Movie_Writers (
            movie_id INTEGER,
            person_id INTEGER,
            PRIMARY KEY (movie_id, person_id),
            FOREIGN KEY (movie_id) REFERENCES Movies(movie_id) ON DELETE CASCADE,
            FOREIGN KEY (person_id) REFERENCES People(person_id) ON DELETE CASCADE
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Movie_Stars (
            movie_id INTEGER,
            person_id INTEGER,
            PRIMARY KEY (movie_id, person_id),
            FOREIGN KEY (movie_id) REFERENCES Movies(movie_id) ON DELETE CASCADE,
            FOREIGN KEY (person_id) REFERENCES People(person_id) ON DELETE CASCADE
        )
    ''')

    # 4. USER REGISTRATION & RATINGS
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS User_Ratings (
            user_id INTEGER,
            movie_id INTEGER,
            personal_rating REAL CHECK(personal_rating >= 0 AND personal_rating <= 10),
            PRIMARY KEY (user_id, movie_id),
            FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
            FOREIGN KEY (movie_id) REFERENCES Movies(movie_id) ON DELETE CASCADE
        )
    ''')

    conn.commit()
    conn.close()
    print("Database schema successfully created!")

if __name__ == "__main__":
    create_database()