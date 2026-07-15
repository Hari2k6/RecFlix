import pandas as pd
import sqlite3
import math

def seed_database():
    print("Loading CSV file... (This might take a moment if the file is massive)")
    # Reading chunks or loading directly. If memory is tight, read in chunks.
    df = pd.read_csv('movies.csv', low_memory=False)
    
    conn = sqlite3.connect('recflix.db')
    cursor = conn.cursor()
    cursor.execute("PRAGMA foreign_keys = ON;")

    print("Processing and distributing data into 3NF structures...")

    # Dictionaries to keep track of dynamic database primary keys to prevent duplicate queries
    genre_cache = {}
    people_cache = {}

    def get_or_create_genre(genre_name):
        name = genre_name.strip()
        if name in genre_cache:
            return genre_cache[name]
        try:
            cursor.execute("INSERT OR IGNORE INTO Genres (name) VALUES (?)", (name,))
            cursor.execute("SELECT genre_id FROM Genres WHERE name = ?", (name,))
            g_id = cursor.fetchone()[0]
            genre_cache[name] = g_id
            return g_id
        except:
            return None

    def get_or_create_person(person_name):
        name = person_name.strip()
        if name in people_cache:
            return people_cache[name]
        try:
            cursor.execute("INSERT OR IGNORE INTO People (name) VALUES (?)", (name,))
            cursor.execute("SELECT person_id FROM People WHERE name = ?", (name,))
            p_id = cursor.fetchone()[0]
            people_cache[name] = p_id
            return p_id
        except:
            return None

    # Limit to top 20,000 popular movies to keep your local machine snappy and clean
    df = df.sort_values(by='popularity', ascending=False).head(20000)

    count = 0
    for idx, row in df.iterrows():
        # Handle empty/NaN values safely
        m_id = int(row['id'])
        title = str(row['title'])
        
        # Parse release year from YYYY-MM-DD
        release_year = None
        if isinstance(row['release_date'], str):
            release_year = int(row['release_date'].split('-')[0])
            
        runtime = int(row['runtime']) if not math.isnan(row['runtime']) else None
        rating = float(row['vote_average']) if not math.isnan(row['vote_average']) else 0.0
        votes = int(row['vote_count']) if not math.isnan(row['vote_count']) else 0
        is_adult = 1 if str(row['adult']).lower() == 'true' else 0

        # 1. Insert Core Movie Entry
        cursor.execute('''
            INSERT OR IGNORE INTO Movies (movie_id, title, release_year, duration_minutes, rating_score, rating_count, is_adult)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (m_id, title, release_year, runtime, rating, votes, is_adult))

        # 2. Parse and map string list Relationships (Genres)
        if isinstance(row['genres'], str):
            for g in row['genres'].split(','):
                g_id = get_or_create_genre(g)
                if g_id:
                    cursor.execute("INSERT OR IGNORE INTO Movie_Genres (movie_id, genre_id) VALUES (?, ?)", (m_id, g_id))

        # 3. Parse and map Directors
        if isinstance(row['directors'], str):
            for d in row['directors'].split(','):
                p_id = get_or_create_person(d)
                if p_id:
                    cursor.execute("INSERT OR IGNORE INTO Movie_Directors (movie_id, person_id) VALUES (?, ?)", (m_id, p_id))

        # 4. Parse and map Writers
        if isinstance(row['writers'], str):
            for w in row['writers'].split(','):
                p_id = get_or_create_person(w)
                if p_id:
                    cursor.execute("INSERT OR IGNORE INTO Movie_Writers (movie_id, person_id) VALUES (?, ?)", (m_id, p_id))

        # 5. Parse and map Cast (Stars)
        if isinstance(row['cast'], str):
            for s in row['cast'].split(','):
                p_id = get_or_create_person(s)
                if p_id:
                    cursor.execute("INSERT OR IGNORE INTO Movie_Stars (movie_id, person_id) VALUES (?, ?)", (m_id, p_id))

        count += 1
        if count % 2000 == 0:
            print(f"Loaded {count} movies successfully...")

    conn.commit()
    conn.close()
    print("Database seeding completed! 3NF normalization active.")

if __name__ == "__main__":
    seed_database()