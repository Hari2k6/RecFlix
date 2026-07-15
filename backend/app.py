from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import sqlite3
import torch
import math

app = FastAPI(title="RecFlix Advanced ML API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE = "recflix.db"

# AUTOMATIC GPU CONFIGURATION
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"RecFlix Machine Learning Engine initiated using device: {device}")

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

# --- PYDANTIC SCHEMAS ---
class UserAuth(BaseModel):
    username: str
    password: str
    age: Optional[int] = 0

class PasswordChange(BaseModel):
    username: str
    old_password: str
    new_password: str

class AgeUpdate(BaseModel):
    username: str
    age: int

class RateRequest(BaseModel):
    username: str
    movie_id: int
    rating: float

class WatchlistRequest(BaseModel):
    username: str
    movie_id: int


# --- STANDARD CORE APP ROUTINGS ---

@app.get("/api/genres")
def get_genres():
    conn = get_db_connection()
    genres = conn.execute("SELECT * FROM Genres ORDER BY name ASC").fetchall()
    conn.close()
    return [dict(g) for g in genres]

@app.get("/api/movies/search")
def search_movies(q: str = Query(..., min_length=1)):
    conn = get_db_connection()
    movies = conn.execute("""
        SELECT movie_id, title, release_year, rating_score 
        FROM Movies WHERE title LIKE ? LIMIT 20
    """, (f"%{q}%",)).fetchall()
    conn.close()
    return [dict(m) for m in movies]

@app.get("/api/movies/genre/{genre_id}")
def get_movies_by_genre(genre_id: int):
    conn = get_db_connection()
    movies = conn.execute("""
        SELECT m.movie_id, m.title, m.release_year, m.rating_score 
        FROM Movies m JOIN Movie_Genres mg ON m.movie_id = mg.movie_id
        WHERE mg.genre_id = ? LIMIT 20
    """, (genre_id,)).fetchall()
    conn.close()
    return [dict(m) for m in movies]

@app.get("/api/movies/featured-hero")
def get_featured_hero(username: str = None):
    """Fetches global high-quality favorites for the top sliding hero asset, ignoring user vectors."""
    conn = get_db_connection()
    user_age = 0
    if username and username != "null" and username != "":
        user = conn.execute("SELECT age FROM Users WHERE username = ?", (username,)).fetchone()
        if user and user['age'] is not None:
            user_age = user['age']
    
    age_filter_sql = "AND is_adult = 0" if user_age < 18 else ""
    
    # Fast query leveraging our database indexes for global top reviewed items
    query = f"""
        SELECT movie_id, title, release_year, rating_score, duration_minutes 
        FROM Movies 
        WHERE 1=1 {age_filter_sql}
        ORDER BY rating_count DESC, rating_score DESC
        LIMIT 4
    """
    rows = conn.execute(query).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/movies/dashboard-rows")
def get_dashboard_rows(username: str = None):
    """Fetches popular movies grouped by genre with casing auto-matching and a global data fallback wrapper."""
    conn = get_db_connection()
    
    # Clean incoming session string values securely
    user_age = 0
    if username:
        username = username.strip().replace('"', '').replace("'", "")
        
    if username and username.lower() != "null" and username != "":
        user = conn.execute("SELECT age FROM Users WHERE username = ?", (username,)).fetchone()
        if user and user['age'] is not None:
            user_age = user['age']
            
    age_filter_sql = "AND m.is_adult = 0" if user_age < 18 else ""
    
    # Core genres list
    target_genres = ["Action", "Science Fiction", "Sci-Fi", "Comedy", "Drama", "Animation", "Romance"]
    dashboard_data = []

    for g_name in target_genres:
        # Resilient Casing Match: check for exact, uppercase, or lowercase matches
        genre_row = conn.execute(
            "SELECT genre_id, name FROM Genres WHERE LOWER(name) = LOWER(?)", 
            (g_name,)
        ).fetchone()
        
        if not genre_row:
            continue
        g_id = genre_row['genre_id']
        actual_name = genre_row['name']

        query = f"""
            SELECT m.movie_id, m.title, m.release_year, m.rating_score 
            FROM Movies m
            JOIN Movie_Genres mg ON m.movie_id = mg.movie_id
            WHERE mg.genre_id = ? {age_filter_sql}
            ORDER BY m.rating_count DESC, m.rating_score DESC
            LIMIT 5
        """
        movie_rows = conn.execute(query, (g_id,)).fetchall()
        if movie_rows:
            dashboard_data.append({
                "genre_id": g_id,
                "genre_name": actual_name,
                "movies": [dict(m) for m in movie_rows]
            })

    # =====================================================================
    # CRITICAL HOMEPAGE RESILIENCE PORTAL (The Ultimate Safety Net)
    # If dashboard_data is STILL empty because genres don't match or are empty,
    # break the loop and return the top 15 highest-rated global favorites.
    # =====================================================================
    if not dashboard_data:
        fallback_query = f"""
            SELECT movie_id, title, release_year, rating_score 
            FROM Movies m
            WHERE 1=1 {age_filter_sql}
            ORDER BY rating_count DESC, rating_score DESC
            LIMIT 15
        """
        global_movies = conn.execute(fallback_query).fetchall()
        if global_movies:
            dashboard_data.append({
                "genre_id": 0,
                "genre_name": "Trending Favorites",
                "movies": [dict(m) for m in global_movies]
            })

    conn.close()
    return dashboard_data

@app.get("/api/movies/{movie_id}")
def get_movie_details(movie_id: int):
    conn = get_db_connection()
    movie = conn.execute("SELECT * FROM Movies WHERE movie_id = ?", (movie_id,)).fetchone()
    if not movie:
        conn.close()
        return {"error": "Movie not found"}
    movie_dict = dict(movie)
    
    # 3NF Joins
    movie_dict['genres'] = [r['name'] for r in conn.execute("SELECT g.name FROM Genres g JOIN Movie_Genres mg ON g.genre_id = mg.genre_id WHERE mg.movie_id = ?", (movie_id,)).fetchall()]
    movie_dict['directors'] = [r['name'] for r in conn.execute("SELECT p.name FROM People p JOIN Movie_Directors md ON p.person_id = md.person_id WHERE md.movie_id = ?", (movie_id,)).fetchall()]
    movie_dict['writers'] = [r['name'] for r in conn.execute("SELECT p.name FROM People p JOIN Movie_Writers mw ON p.person_id = mw.person_id WHERE mw.movie_id = ?", (movie_id,)).fetchall()]
    movie_dict['stars'] = [r['name'] for r in conn.execute("SELECT p.name FROM People p JOIN Movie_Stars ms ON p.person_id = ms.person_id WHERE ms.movie_id = ?", (movie_id,)).fetchall()]
    conn.close()
    return movie_dict

# --- PROFILE & WATCHLIST MANAGEMENT ---

@app.post("/api/register")
def register_user(user: UserAuth):
    conn = get_db_connection()
    try:
        conn.execute("INSERT INTO Users (username, password_hash, age) VALUES (?, ?, ?)", (user.username, user.password, user.age if user.age else 0))
        conn.commit()
        return {"success": True}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="User exists.")
    finally: conn.close()

@app.post("/api/login")
def login_user(user: UserAuth):
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM Users WHERE username = ?", (user.username,)).fetchone()
    conn.close()
    if row and row['password_hash'] == user.password:
        return {"success": True, "username": row['username'], "age": row['age']}
    raise HTTPException(status_code=401, detail="Failed.")

@app.post("/api/update-age")
def update_age(data: AgeUpdate):
    conn = get_db_connection()
    conn.execute("UPDATE Users SET age = ? WHERE username = ?", (data.age, data.username))
    conn.commit()
    conn.close()
    return {"success": True}

@app.post("/api/change-password")
def change_password(data: PasswordChange):
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM Users WHERE username = ?", (data.username,)).fetchone()
    if not row or row['password_hash'] != data.old_password:
        conn.close()
        raise HTTPException(status_code=401, detail="Error.")
    conn.execute("UPDATE Users SET password_hash = ? WHERE username = ?", (data.new_password, data.username))
    conn.commit(); conn.close()
    return {"success": True}

@app.delete("/api/delete-account/{username}")
def delete_account(username: str):
    conn = get_db_connection()
    conn.execute("DELETE FROM Users WHERE username = ?", (username,))
    conn.commit(); conn.close()
    return {"success": True}

@app.post("/api/rate-movie")
def rate_movie(data: RateRequest):
    conn = get_db_connection()
    user = conn.execute("SELECT user_id FROM Users WHERE username = ?", (data.username,)).fetchone()
    if user:
        conn.execute("INSERT OR REPLACE INTO User_Ratings (user_id, movie_id, personal_rating) VALUES (?, ?, ?)", (user['user_id'], data.movie_id, data.rating))
        conn.execute("DELETE FROM User_Watchlist WHERE user_id = ? AND movie_id = ?", (user['user_id'], data.movie_id))
        conn.commit()
    conn.close()
    return {"success": True}

@app.get("/api/user-rating/{username}/{movie_id}")
def get_user_rating(username: str, movie_id: int):
    conn = get_db_connection()
    row = conn.execute("SELECT ur.personal_rating FROM User_Ratings ur JOIN Users u ON ur.user_id = u.user_id WHERE u.username = ? AND ur.movie_id = ?", (username, movie_id)).fetchone()
    conn.close()
    return {"personal_rating": row['personal_rating'] if row else None}

@app.post("/api/toggle-watchlist")
def toggle_watchlist(data: WatchlistRequest):
    conn = get_db_connection()
    user = conn.execute("SELECT user_id FROM Users WHERE username = ?", (data.username,)).fetchone()
    if user:
        exists = conn.execute("SELECT 1 FROM User_Watchlist WHERE user_id = ? AND movie_id = ?", (user['user_id'], data.movie_id)).fetchone()
        if exists:
            conn.execute("DELETE FROM User_Watchlist WHERE user_id = ? AND movie_id = ?", (user['user_id'], data.movie_id))
            status = "removed"
        else:
            conn.execute("INSERT INTO User_Watchlist (user_id, movie_id) VALUES (?, ?)", (user['user_id'], data.movie_id))
            status = "added"
        conn.commit()
    conn.close()
    return {"success": True, "status": status}

@app.get("/api/watchlist-status/{username}/{movie_id}")
def get_watchlist_status(username: str, movie_id: int):
    conn = get_db_connection()
    row = conn.execute("SELECT 1 FROM User_Watchlist uw JOIN Users u ON uw.user_id = u.user_id WHERE u.username = ? AND uw.movie_id = ?", (username, movie_id)).fetchone()
    conn.close()
    return {"in_watchlist": True if row else False}

@app.get("/api/profile/{username}/ratings")
def get_user_rated_movies(username: str, sort_by: str = "title", order: str = "ASC"):
    conn = get_db_connection()
    valid_sorts = {"title": "m.title", "year": "m.release_year", "personal_rating": "ur.personal_rating"}
    sort_column = valid_sorts.get(sort_by, "m.title")
    direction = "DESC" if order.upper() == "DESC" else "ASC"
    rows = conn.execute(f"SELECT m.movie_id, m.title, m.release_year, m.rating_score, ur.personal_rating FROM Movies m JOIN User_Ratings ur ON m.movie_id = ur.movie_id JOIN Users u ON ur.user_id = u.user_id WHERE u.username = ? ORDER BY {sort_column} {direction}", (username,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/profile/{username}/watchlist")
def get_user_watchlist(username: str):
    conn = get_db_connection()
    rows = conn.execute("SELECT m.movie_id, m.title, m.release_year, m.rating_score FROM Movies m JOIN User_Watchlist uw ON m.movie_id = uw.movie_id JOIN Users u ON uw.user_id = u.user_id WHERE u.username = ? ORDER BY m.title ASC", (username,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.delete("/api/remove-rating/{username}/{movie_id}")
def remove_rating(username: str, movie_id: int):
    conn = get_db_connection()
    user = conn.execute("SELECT user_id FROM Users WHERE username = ?", (username,)).fetchone()
    if user:
        conn.execute("DELETE FROM User_Ratings WHERE user_id = ? AND movie_id = ?", (user['user_id'], movie_id))
        conn.commit()
    conn.close()
    return {"success": True}


# =====================================================================
# --- FOOLPROOF DEPLOYED ADVANCED MATRIX PYTORCH ML SYSTEM ENGINE ---
# =====================================================================

@app.get("/api/recommendations/{username}")
def get_movie_recommendations(username: str):
    conn = get_db_connection()
    
    # 1. Fetch user metadata
    user = conn.execute("SELECT user_id, age FROM Users WHERE username = ?", (username,)).fetchone()
    if not user:
        conn.close()
        return []
    user_id, user_age = user['user_id'], user['age']
    age_filter_sql = "AND is_adult = 0" if user_age < 18 else ""

    # 2. Get rated history rows (Fetch ratings normalized around a center split axis)
    user_ratings = conn.execute("SELECT movie_id, personal_rating FROM User_Ratings WHERE user_id = ?", (user_id,)).fetchall()
    conn.close() # Safely close SQLite base to free execution pools
    
    rated_movie_ids = [r['movie_id'] for r in user_ratings]
    
    # COLD START FALLBACK: Globally highly rated fallbacks
    if not user_ratings:
        conn = get_db_connection()
        movies = conn.execute(f"SELECT movie_id, title, release_year, rating_score FROM Movies WHERE 1=1 {age_filter_sql} ORDER BY rating_count DESC, rating_score DESC LIMIT 15").fetchall()
        conn.close()
        return [dict(m) for m in movies]

    # Convert ratings array maps to dictionary weights, shifting centering parameters (-5.0 anchors negative scale)
    # This penalizes attributes belonging to movies you specifically gave bad ratings (like Lego Movie 2)
    rating_map = {r['movie_id']: (float(r['personal_rating']) - 5.0) for r in user_ratings}

    # 3. BUILD DYNAMIC GLOBAL FEATURE VOCABULARY DICTIONARIES
    conn = get_db_connection()
    all_genres = [r['genre_id'] for r in conn.execute("SELECT genre_id FROM Genres").fetchall()]
    all_people = [r['person_id'] for r in conn.execute("SELECT person_id FROM People").fetchall()]
    
    # Vocabulary allocation
    genre_index = {g_id: i for i, g_id in enumerate(all_genres)}
    people_index = {p_id: i + len(all_genres) for i, p_id in enumerate(all_people)}
    vocab_size = len(genre_index) + len(people_index)

    # 4. LOAD ENTIRE TARGET MATCH CANDIDATE DATASETS INTO RAM CACHE
    candidates = conn.execute(f"SELECT movie_id, title, release_year, rating_score FROM Movies WHERE 1=1 {age_filter_sql}").fetchall()
    
    candidate_list = [dict(c) for c in candidates]
    candidate_ids = [c['movie_id'] for c in candidate_list]
    
    # 5. HIGH SPEED SPARSE TENSOR GENERATION DIRECTLY ON GPU VIA PYTORCH
    # Row dimension corresponds to all movies, column dimension corresponds to the feature space size
    feature_matrix = torch.zeros((len(candidate_ids), vocab_size), device=device)
    
    # Build mapping directories for rapid positional indexing lookups
    movie_to_matrix_row = {m_id: i for i, m_id in enumerate(candidate_ids)}

    # Map database indices to continuous dense tensor positions
    movie_genres = conn.execute("SELECT movie_id, genre_id FROM Movie_Genres").fetchall()
    for mg in movie_genres:
        if mg['movie_id'] in movie_to_matrix_row:
            row = movie_to_matrix_row[mg['movie_id']]
            col = genre_index[mg['genre_id']]
            feature_matrix[row, col] = 2.0  # Boosted weights for explicit structural genre matching

    # Map talent matrices (Directors, Stars, Writers grouped into the talent feature block)
    directors = conn.execute("SELECT movie_id, person_id FROM Movie_Directors").fetchall()
    for md in directors:
        if md['movie_id'] in movie_to_matrix_row:
            feature_matrix[movie_to_matrix_row[md['movie_id']], people_index[md['person_id']]] = 3.0 # Highly descriptive

    stars = conn.execute("SELECT movie_id, person_id FROM Movie_Stars").fetchall()
    for ms in stars:
        if ms['movie_id'] in movie_to_matrix_row:
            feature_matrix[movie_to_matrix_row[ms['movie_id']], people_index[ms['person_id']]] = 1.0

    conn.close()

    # 6. VECTORIZED USER TASTE PROFILE SYNTHESIS
    user_profile = torch.zeros((1, vocab_size), device=device)
    
    for m_id, shifted_rating in rating_map.items():
        if m_id in movie_to_matrix_row:
            row_idx = movie_to_matrix_row[m_id]
            # Accumulate vector alignment fields scaled linearly according to user's relative rating score weight
            user_profile += feature_matrix[row_idx, :] * shifted_rating

    # 7. VECTORIZED COSINE SIMILARITY EXECUTION
    # Formula: Similarity = (A • B) / (||A|| * ||B||)
    dot_products = torch.mm(feature_matrix, user_profile.t()).squeeze(1)
    
    feature_norms = torch.norm(feature_matrix, p=2, dim=1)
    user_norm = torch.norm(user_profile, p=2)
    
    # Handle zero division safety bounds
    if user_norm == 0:
        user_norm = 1.0
    feature_norms[feature_norms == 0] = 1.0
    
    cosine_scores = dot_products / (feature_norms * user_norm)
    cosine_scores_cpu = cosine_scores.to("cpu").numpy()

    # 8. EXTRACT AND ORGANIZE RANKINGS
    output_recommendations = []
    for i, movie in enumerate(candidate_list):
        m_id = movie['movie_id']
        # Filter out movies that the user has already explicitly rated
        if m_id in rated_movie_ids:
            continue
            
        score = float(cosine_scores_cpu[i])
        if score > 0:  # Valid aligned orientation match threshold
            movie['match_score'] = score
            output_recommendations.append(movie)

    # GLOBAL FAVORITES FALLBACK PORTAL
    if not output_recommendations:
        conn = get_db_connection()
        movies = conn.execute(f"SELECT movie_id, title, release_year, rating_score FROM Movies WHERE movie_id NOT IN ({','.join('?' for _ in rated_movie_ids)}) {age_filter_sql} ORDER BY rating_count DESC LIMIT 15", rated_movie_ids).fetchall()
        conn.close()
        return [dict(m) for m in movies]

    # Sort results using the vector scores calculated on the GPU
    output_recommendations.sort(key=lambda x: x['match_score'], reverse=True)
    return output_recommendations[:15]

if __name__ == "__main__":
    import uvicorn
    
    # DIAGNOSTIC VERIFICATION LOOP
    print("\n🔍 --- RUNNING RECFLIX DATABASE INTEGRITY CHECK ---")
    try:
        test_conn = sqlite3.connect(DATABASE)
        # Check if the Movies table even exists
        table_check = test_conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='Movies';"
        ).fetchone()
        
        if not table_check:
            print("❌ ERROR: The 'Movies' table does not exist in the targeted database file!")
            print(f"   Target path was: {DATABASE}")
            print("   Please check if your terminal is running inside the correct folder.")
        else:
            # Count the records inside the database
            movie_count = test_conn.execute("SELECT COUNT(*) FROM Movies;").fetchone()[0]
            genre_count = test_conn.execute("SELECT COUNT(*) FROM Genres;").fetchone()[0]
            print(f"✅ SUCCESS: Connected to database file cleanly.")
            print(f"📊 Movies Found in Table: {movie_count}")
            print(f"📊 Genres Found in Table: {genre_count}")
            
        test_conn.close()
    except Exception as e:
        print(f"❌ DATABASE CHECK CRASHED WITH ERROR: {e}")
    print("---------------------------------------------------\n")

    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)