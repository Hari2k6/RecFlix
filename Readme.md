# RecFlix – AI Movie Recommendation Platform

RecFlix is an AI-powered movie recommendation platform that provides personalized movie suggestions based on each user's viewing history and ratings. Instead of relying solely on genres, the recommendation engine builds a dynamic preference profile by analyzing multiple movie attributes such as genres, directors, writers, and cast members to understand a user's interests across different categories.

The application features a modern React frontend, a FastAPI backend, and an AI recommendation engine that ranks movies using vector similarity and personalized scoring.

---

# Features

*  Browse a large movie catalog
*  Rate movies to build your personal profile
*  AI-powered personalized recommendations
*  Search movies instantly
*  Considers multiple movie attributes:

  * Genres
  * Directors
  * Writers
  * Cast
*  Fast recommendation engine
*  Modern responsive React interface

---

# Project Architecture

```
                User Ratings
                     │
                     ▼
        User Preference Profiling
                     │
                     ▼
       Feature Vector Construction
                     │
                     ▼
      Cosine Similarity Calculation
                     │
                     ▼
      Movie Ranking & Recommendation
                     │
                     ▼
             React Frontend
```

---

# Recommendation Engine

The recommendation engine builds a weighted preference profile from:

* Genres
* Directors
* Writers
* Cast

Each positively rated movie strengthens the corresponding attributes, while negatively rated movies reduce their influence.

Finally, the engine computes **Cosine Similarity** between the user's preference vector and every movie in the database, ranking the most relevant recommendations.

---

# Tech Stack

## Frontend

* React
* Vite
* JavaScript
* CSS

## Backend

* FastAPI
* Python

## AI / Machine Learning

* PyTorch
* Pandas
* NumPy

---

## How to Setup Your Private TMDB API Key

To display movie posters on the screen, this application pulls imagery directly from The Movie Database (TMDB).

### 1. Get Your Free Key
1. Go to [The Movie Database (TMDB)](https://www.themoviedb.org/) and create a free account.
2. Click on your profile icon in the top right, go to **Settings**, and select **API** from the left sidebar.
3. Click **Create** to request a Developer API Key (fill out the quick application form).
4. Copy your **API Key (v3 auth)**.

### 2. Secure Your Key in the Code
Open `frontend/src/App.jsx` and find line 3 at the very top of the file:
```javascript
const TMDB_API_KEY = 'YOUR_TMDB_API_KEY_HERE';
Replace 'YOUR_TMDB_API_KEY_HERE' with your actual copied key.
---

---

# Project Structure

```
RecFlix/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── app.py
│   ├── recommendation_engine.py
│   ├── dataset/
│   └── requirements.txt
│
└── README.md
```

---

# Getting Started

## Prerequisites

Install:

* Python 3.10+
* Node.js
* npm

---

## Backend Setup

```bash
cd backend

pip install fastapi uvicorn torch pandas numpy

python app.py
```

The FastAPI server starts at:

```
http://127.0.0.1:8000
```

---

## Frontend Setup

Open another terminal:

```bash
cd frontend

npm install

npm run dev
```

Visit:

```
http://localhost:5173
```

---

#  Dataset

This project uses the **TMDB + IMDb Merged Movies Dataset**.

The dataset contains metadata including:

* Movie titles
* Genres
* Directors
* Writers
* Cast
* Ratings
* Release information

To keep the repository lightweight, the original dataset (~279 MB) is **not included**.

You can download it from:

https://www.kaggle.com/datasets/ggtejas/tmdb-imdb-merged-movies-dataset

---

# Future Improvements

* Collaborative Filtering
* Hybrid Recommendation System
* User Authentication
* Watchlist
* Movie Posters
* Trailer Integration
* Explainable Recommendations
* Recommendation Diversity
* Real-time Model Updates
* Cloud Deployment
