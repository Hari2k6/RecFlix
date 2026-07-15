import React, { useState, useEffect } from 'react';

const TMDB_API_KEY = 'YOUR_TMDB_API_KEY_HERE'; 
const BACKEND_URL = 'http://127.0.0.1:8000/api';

const EyeOpenIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeClosedIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

function App() {
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('user') || null);
  const [userAge, setUserAge] = useState(parseInt(localStorage.getItem('user_age')) || 0);
  const [activeTab, setActiveTab] = useState('home'); 
  const [profileSubTab, setProfileSubTab] = useState('ratings'); 
  const [authMode, setAuthMode] = useState('login'); 
  
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [ageInput, setAgeInput] = useState(''); 
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [settingsAgeInput, setSettingsAgeInput] = useState(localStorage.getItem('user_age') || '0'); 
  
  const [genres, setGenres] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [movies, setMovies] = useState([]); 
  const [dashboardRows, setDashboardRows] = useState([]); 
  const [posters, setPosters] = useState({});
  const [viewTitle, setViewTitle] = useState(''); 

  const [selectedMovieId, setSelectedMovieId] = useState(null);
  const [movieDetails, setMovieDetails] = useState(null);
  const [movieOverview, setMovieOverview] = useState('');
  const [userRatingForMovie, setUserRatingForMovie] = useState(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [starHoverValue, setStarHoverValue] = useState(0); 

  const [ratedMovies, setRatedMovies] = useState([]);
  const [watchlistMovies, setWatchlistMovies] = useState([]); 
  const [recommendedMovies, setRecommendedMovies] = useState([]); 
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState('ASC');

  useEffect(() => {
    fetch(`${BACKEND_URL}/genres`).then(res => res.ok ? res.json() : []).then(data => setGenres(data)).catch(() => {});
  }, []);

  const loadMainDashboard = () => {
    setViewTitle(''); 
    setMovies([]);
    const encodedUser = currentUser ? encodeURIComponent(currentUser) : '';

    fetch(`${BACKEND_URL}/movies/dashboard-rows?username=${encodedUser}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setDashboardRows(Array.isArray(data) ? data : []))
      .catch(() => setDashboardRows([]));
  };

  useEffect(() => {
    if (activeTab === 'home' && !viewTitle) {
      loadMainDashboard();
    }
  }, [activeTab, currentUser]);

  useEffect(() => {
    const list = [...movies, ...ratedMovies, ...watchlistMovies, ...recommendedMovies];
    if (Array.isArray(dashboardRows)) {
      dashboardRows.forEach(row => { if (row && Array.isArray(row.movies)) list.push(...row.movies); });
    }

    list.forEach(movie => {
      if (movie && movie.movie_id && !posters[movie.movie_id]) {
        fetch(`https://api.themoviedb.org/3/movie/${movie.movie_id}?api_key=${TMDB_API_KEY}`)
          .then(res => res.json())
          .then(data => {
            if (data.poster_path) {
              setPosters(prev => ({ ...prev, [movie.movie_id]: `https://image.tmdb.org/t/p/w300${data.poster_path}` }));
            }
          }).catch(() => {});
      }
    });
  }, [movies, dashboardRows, ratedMovies, watchlistMovies, recommendedMovies]);

  useEffect(() => {
    if (!selectedMovieId) return;
    fetch(`${BACKEND_URL}/movies/${selectedMovieId}`).then(res => res.json()).then(data => setMovieDetails(data));
    fetch(`https://api.themoviedb.org/3/movie/${selectedMovieId}?api_key=${TMDB_API_KEY}`).then(res => res.json()).then(data => setMovieOverview(data.overview));

    if (currentUser) {
      fetch(`${BACKEND_URL}/user-rating/${currentUser}/${selectedMovieId}`).then(res => res.json()).then(data => setUserRatingForMovie(data.personal_rating));
      fetch(`${BACKEND_URL}/watchlist-status/${currentUser}/${selectedMovieId}`).then(res => res.json()).then(data => setInWatchlist(data.in_watchlist));
    }
  }, [selectedMovieId, currentUser]);

  const loadProfileData = () => {
    if (!currentUser) return;
    if (profileSubTab === 'ratings') {
      fetch(`${BACKEND_URL}/profile/${currentUser}/ratings?sort_by=${sortBy}&order=${sortOrder}`).then(res => res.json()).then(data => setRatedMovies(data));
    } else if (profileSubTab === 'watchlist') {
      fetch(`${BACKEND_URL}/profile/${currentUser}/watchlist`).then(res => res.json()).then(data => setWatchlistMovies(data));
    } else if (profileSubTab === 'recommendations') {
      fetch(`${BACKEND_URL}/recommendations/${currentUser}`).then(res => res.json()).then(data => setRecommendedMovies(data));
    }
  };

  useEffect(() => { if (activeTab === 'profile') loadProfileData(); }, [activeTab, profileSubTab, currentUser, sortBy, sortOrder]);

  const handleStarMouseMove = (e, starIdx) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left < rect.width / 2) setStarHoverValue(starIdx - 0.5);
    else setStarHoverValue(starIdx);
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    const endpoint = authMode === 'login' ? 'login' : 'register';
    fetch(`${BACKEND_URL}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameInput, password: passwordInput, age: ageInput ? parseInt(ageInput) : 0 })
    })
    .then(res => res.json())
    .then(data => {
      if (authMode === 'login' && data.username) {
        localStorage.setItem('user', data.username); localStorage.setItem('user_age', data.age);
        setCurrentUser(data.username); setUserAge(data.age); setSettingsAgeInput(data.age.toString());
        setActiveTab('home'); setViewTitle('');
      } else { alert("Registration complete!"); setAuthMode('login'); }
      setUsernameInput(''); setPasswordInput(''); setAgeInput('');
    }).catch(() => alert("Auth failed."));
  };

  const handleLogout = () => {
    localStorage.clear(); setCurrentUser(null); setUserAge(0); setSettingsAgeInput('0'); setActiveTab('home'); setSelectedMovieId(null); setViewTitle('');
  };

  const submitMovieRating = (score) => {
    if (!currentUser) return;
    fetch(`${BACKEND_URL}/rate-movie`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser, movie_id: selectedMovieId, rating: score })
    }).then(() => { setUserRatingForMovie(score); setInWatchlist(false); });
  };

  const toggleWatchlistAction = () => {
    if (!currentUser) return;
    fetch(`${BACKEND_URL}/toggle-watchlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser, movie_id: selectedMovieId })
    }).then(res => res.json()).then(data => setInWatchlist(data.status === 'added'));
  };

  const handleRemoveRating = (e, movieId) => {
    e.stopPropagation();
    fetch(`${BACKEND_URL}/remove-rating/${currentUser}/${movieId}`, { method: 'DELETE' }).then(() => {
      if (activeTab === 'profile') loadProfileData();
      if (selectedMovieId === movieId) setUserRatingForMovie(null);
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    fetch(`${BACKEND_URL}/movies/search?q=${searchQuery}`).then(res => res.json()).then(data => {
      setMovies(data); setViewTitle(`Search Results for: "${searchQuery}"`); setActiveTab('home'); setSelectedMovieId(null);
    });
  };

  const handleGenreClick = (id, name) => {
    if (!id) return;
    fetch(`${BACKEND_URL}/movies/genre/${id}`).then(res => res.json()).then(data => {
      setMovies(data); setViewTitle(`${name} Core Selection`); setActiveTab('home'); setSelectedMovieId(null);
    });
  };

  const handleUpdateAge = (e) => {
    e.preventDefault();
    fetch(`${BACKEND_URL}/update-age`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser, age: parseInt(settingsAgeInput || '0') })
    })
    .then(res => {
      if (!res.ok) throw new Error();
      localStorage.setItem('user_age', settingsAgeInput);
      setUserAge(parseInt(settingsAgeInput));
      alert("Age updated successfully!");
    });
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    fetch(`${BACKEND_URL}/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser, old_password: oldPassword, new_password: newPassword })
    })
    .then(res => { if (!res.ok) throw new Error(); alert("Password updated!"); setOldPassword(''); setNewPassword(''); });
  };

  const handleDeleteAccount = () => {
    if (!window.confirm("Permanently delete account?")) return;
    fetch(`${BACKEND_URL}/delete-account/${currentUser}`, { method: 'DELETE' })
      .then(res => { if (!res.ok) throw new Error(); alert("Account deleted."); handleLogout(); });
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', color: '#0f172a', minHeight: '100vh', width: '100%', margin: 0, padding: 0 }}>
      
      <header style={{ width: '100%', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <h1 
          onClick={() => { setActiveTab('home'); setSelectedMovieId(null); setViewTitle(''); }} 
          style={{ cursor: 'pointer', margin: 0, fontSize: '28px', fontWeight: '900', background: 'linear-gradient(45deg, #ff007f, #7928ca, #00dfd8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px' }}
        >
          RecFlix
        </h1>

        {activeTab === 'home' && !selectedMovieId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '600px', margin: '0 40px' }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', flex: 1 }}>
              <input type="text" placeholder="Search fields, titles..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px 16px', border: '1px solid #cbd5e1', borderRight: 'none', borderRadius: '8px 0 0 8px', outline: 'none', fontSize: '14px' }} />
              <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '0 8px 8px 0', cursor: 'pointer', fontWeight: 'bold' }}>Find</button>
            </form>
            
            <select 
              onChange={e => {
                const selected = genres.find(g => g.genre_id === parseInt(e.target.value));
                if (selected) handleGenreClick(selected.genre_id, selected.name);
              }}
              defaultValue=""
              style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', outline: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: '#475569' }}
            >
              <option value="" disabled>Browse Genres</option>
              {genres.map(g => <option key={g.genre_id} value={g.genre_id}>{g.name}</option>)}
            </select>
          </div>
        )}

        <nav style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
          <button onClick={() => { setActiveTab('home'); setSelectedMovieId(null); setViewTitle(''); }} style={{ background: 'none', border: 'none', color: activeTab === 'home' && !viewTitle ? '#7928ca' : '#64748b', cursor: 'pointer', fontWeight: '700', fontSize: '15px' }}>Home</button>
          {currentUser ? (
            <>
              <button onClick={() => { setActiveTab('profile'); setProfileSubTab('ratings'); setSelectedMovieId(null); }} style={{ background: 'none', border: 'none', color: activeTab === 'profile' ? '#7928ca' : '#64748b', cursor: 'pointer', fontWeight: '700', fontSize: '15px' }}>Dashboard ({currentUser})</button>
              <button onClick={handleLogout} style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#64748b' }}>Logout</button>
            </>
          ) : <button onClick={() => { setActiveTab('auth'); setSelectedMovieId(null); }} style={{ padding: '8px 16px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Login Gate</button>}
        </nav>
      </header>

      <main style={{ padding: '30px 40px', width: '100%' }}>

        {activeTab === 'auth' && (
          <div style={{ maxWidth: '400px', margin: '60px auto', padding: '30px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            <h2>{authMode === 'login' ? 'Login Portal' : 'Register Profile'}</h2>
            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input type="text" placeholder="Username" required value={usernameInput} onChange={e => setUsernameInput(e.target.value)} style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              <input type="password" placeholder="Password" required value={passwordInput} onChange={e => setPasswordInput(e.target.value)} style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              {authMode === 'register' && <input type="number" placeholder="Age (Optional)" value={ageInput} onChange={e => setAgeInput(e.target.value)} style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />}
              <button type="submit" style={{ padding: '12px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Continue</button>
            </form>
            <p onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} style={{ color: '#7928ca', textAlign: 'center', cursor: 'pointer', marginTop: '15px' }}>Switch Panels</p>
          </div>
        )}

        {activeTab === 'profile' && currentUser && (
          <div style={{ width: '100%' }}>
            <h2>User Workspace: {currentUser}</h2>
            <div style={{ borderBottom: '2px solid #e2e8f0', marginBottom: '30px', display: 'flex', gap: '30px' }}>
              {['ratings', 'watchlist', 'recommendations', 'settings'].map(tab => (
                <button key={tab} onClick={() => setProfileSubTab(tab)} style={{ padding: '12px 5px', background: 'none', border: 'none', color: profileSubTab === tab ? '#7928ca' : '#64748b', borderBottom: profileSubTab === tab ? '3px solid #7928ca' : 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                  {tab === 'ratings' ? 'My Rated History' : tab === 'watchlist' ? 'My Watchlist' : tab === 'recommendations' ? 'AI Recommendations' : 'Settings / Safety'}
                </button>
              ))}
            </div>

            {profileSubTab === 'ratings' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '30px' }}>
                {ratedMovies.map(movie => (
                  <div key={movie.movie_id} onClick={() => { setSelectedMovieId(movie.movie_id); setActiveTab('home'); }} style={{ cursor: 'pointer', backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '10px' }}>
                    <img src={posters[movie.movie_id] || 'https://via.placeholder.com/190x270?text=No+Poster'} alt={movie.title} style={{ width: '100%', height: '270px', objectFit: 'cover', borderRadius: '6px' }} />
                    <h4 style={{ margin: '12px 0 6px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{movie.title}</h4>
                    <p style={{ color: '#7928ca', fontWeight: 'bold' }}>Your Mark: ★{(movie.personal_rating / 2).toFixed(1)}/5</p>
                    <button onClick={(e) => handleRemoveRating(e, movie.movie_id)} style={{ width: '100%', padding: '6px', backgroundColor: '#fff', color: '#ef4444', border: '1px solid #fee2e2', borderRadius: '6px', cursor: 'pointer' }}>Remove Log</button>
                  </div>
                ))}
              </div>
            )}

            {profileSubTab === 'watchlist' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '30px' }}>
                {watchlistMovies.map(movie => (
                  <div key={movie.movie_id} onClick={() => { setSelectedMovieId(movie.movie_id); setActiveTab('home'); }} style={{ cursor: 'pointer' }}>
                    <img src={posters[movie.movie_id] || 'https://via.placeholder.com/190x270?text=No+Poster'} alt={movie.title} style={{ width: '100%', height: '280px', objectFit: 'cover', borderRadius: '8px' }} />
                    <h4 style={{ margin: '10px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{movie.title}</h4>
                  </div>
                ))}
              </div>
            )}

            {profileSubTab === 'recommendations' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '30px' }}>
                {recommendedMovies.map(movie => (
                  <div key={movie.movie_id} onClick={() => { setSelectedMovieId(movie.movie_id); setActiveTab('home'); }} style={{ cursor: 'pointer' }}>
                    <img src={posters[movie.movie_id] || 'https://via.placeholder.com/190x270?text=No+Poster'} alt={movie.title} style={{ width: '100%', height: '280px', objectFit: 'cover', borderRadius: '8px' }} />
                    <h4 style={{ margin: '10px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{movie.title}</h4>
                  </div>
                ))}
              </div>
            )}

            {profileSubTab === 'settings' && (
              <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', maxWidth: '900px' }}>
                <div style={{ padding: '25px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', flex: 1 }}>
                  <h3>Update Account Age Verification</h3>
                  <form onSubmit={handleUpdateAge} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input type="number" required value={settingsAgeInput} onChange={e => setSettingsAgeInput(e.target.value)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                    <button type="submit" style={{ padding: '10px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px' }}>Save Age</button>
                  </form>
                </div>
                <div style={{ padding: '25px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', flex: 1 }}>
                  <h3>Modify Account Password</h3>
                  <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input type="password" placeholder="Current Password" required value={oldPassword} onChange={e => setOldPassword(e.target.value)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                    <input type="password" placeholder="New Password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                    <button type="submit" style={{ padding: '10px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '6px' }}>Update Password</button>
                  </form>
                </div>
                <div style={{ width: '100%', padding: '20px', backgroundColor: '#fff5f5', border: '1px solid #fee2e2', borderRadius: '8px' }}>
                  <button onClick={handleDeleteAccount} style={{ padding: '10px 20px', backgroundColor: '#cc0000', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>Delete Profile Permanently</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'home' && selectedMovieId && movieDetails && (
          <div style={{ width: '100%' }}>
            <button onClick={() => setSelectedMovieId(null)} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', marginBottom: '30px', fontWeight: 'bold' }}>← Back to Dashboard Hub</button>
            <div style={{ display: 'flex', gap: '50px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <img src={posters[selectedMovieId] || 'https://via.placeholder.com/320x450?text=No+Poster'} alt={movieDetails.title} style={{ width: '320px', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <h2 style={{ fontSize: '42px', fontWeight: '900', margin: 0 }}>{movieDetails.title}</h2>
                  {currentUser && (
                    <button onClick={toggleWatchlistAction} style={{ background: inWatchlist ? '#0f172a' : 'none', color: inWatchlist ? '#fff' : '#0f172a', border: '2px solid #0f172a', borderRadius: '50%', width: '46px', height: '46px', display: 'flex', alignItems: 'center', justifyCentering: 'center', cursor: 'pointer' }}>
                      {inWatchlist ? <EyeOpenIcon /> : <EyeClosedIcon />}
                    </button>
                  )}
                </div>
                <p style={{ color: '#64748b', margin: '10px 0 25px 0' }}>{movieDetails.release_year} • {movieDetails.duration_minutes} mins • Global Score: ★{movieDetails.rating_score}</p>
                
                <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: '25px', borderRadius: '12px', maxWidth: '450px', marginBottom: '30px' }}>
                  <h4 style={{ margin: '0 0 12px 0' }}>Assign Interactive Star Metric</h4>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }} onMouseLeave={() => setStarHoverValue(0)}>
                    {[1, 2, 3, 4, 5].map(starIdx => {
                      const score = starHoverValue || (userRatingForMovie ? userRatingForMovie / 2 : 0);
                      return (
                        <div key={starIdx} onMouseMove={e => handleStarMouseMove(e, starIdx)} onClick={() => submitMovieRating(starHoverValue * 2)} style={{ position: 'relative', fontSize: '38px', cursor: 'pointer', width: '40px', userSelect: 'none' }}>
                          <span style={{ color: '#e2e8f0' }}>★</span>
                          {score >= (starIdx - 0.5) && <span style={{ color: '#7928ca', position: 'absolute', top: 0, left: 0, width: score >= starIdx ? '100%' : '50%', overflow: 'hidden' }}>★</span>}
                        </div>
                      );
                    })}
                  </div>
                  {userRatingForMovie && <button onClick={e => handleRemoveRating(e, selectedMovieId)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Clear Rating Mark</button>}
                </div>
                <h3>Overview Synopsis</h3>
                <p style={{ lineHeight: '1.7', color: '#334155', fontSize: '16px' }}>{movieOverview || "No textual summary provided in current catalog entry."}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'home' && !selectedMovieId && (
          <div style={{ width: '100%' }}>
            
            {viewTitle ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                  <h2>{viewTitle}</h2>
                  <button onClick={() => setViewTitle('')} style={{ padding: '10px 20px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>← Back to Dashboard Hub</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '30px' }}>
                  {movies.map(movie => (
                    <div key={movie.movie_id} onClick={() => setSelectedMovieId(movie.movie_id)} style={{ cursor: 'pointer', backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', padding: '12px' }}>
                      <img src={posters[movie.movie_id] || 'https://via.placeholder.com/220x300?text=No+Poster'} alt={movie.title} style={{ width: '100%', height: '300px', objectFit: 'cover', borderRadius: '8px' }} />
                      <h4 style={{ margin: '12px 0 4px 0', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{movie.title}</h4>
                      <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{movie.release_year} • ★{movie.rating_score}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '50px', width: '100%' }}>
                
                {/* HORIZONTAL BROWSING ROWS PORTRAITS GALLERY */}
                {dashboardRows.length === 0 ? (
                  <p style={{textAlign: 'center', color: '#64748b', marginTop: '40px'}}>Syncing live movies from local catalog files...</p>
                ) : (
                  dashboardRows.map(row => (
                    <div key={row.genre_id} style={{width: '100%'}}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '18px' }}>
                        <h3 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#0f172a', letterSpacing: '-0.5px' }}>{row.genre_name} Highlights</h3>
                        <span style={{ fontSize: '14px', color: '#7928ca', fontWeight: '700', cursor: 'pointer' }} onClick={() => handleGenreClick(row.genre_id, row.genre_name)}>See All Entries →</span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '25px', overflowX: 'auto', paddingBottom: '15px', width: '100%', scrollbarWidth: 'none' }}>
                        {row.movies && row.movies.map(movie => (
                          <div 
                            key={movie.movie_id} 
                            onClick={() => setSelectedMovieId(movie.movie_id)}
                            style={{ width: '190px', flexShrink: 0, cursor: 'pointer' }}
                          >
                            <img src={posters[movie.movie_id] || 'https://via.placeholder.com/190x270?text=No+Poster'} alt={movie.title} style={{ width: '100%', height: '270px', objectFit: 'cover', borderRadius: '14px', border: '1px solid #e2e8f0' }} />
                            <h4 style={{ margin: '10px 0 2px 0', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#1e293b', fontWeight: '700' }}>{movie.title}</h4>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{movie.release_year} • ★{movie.rating_score}</p>
                          </div>
                        ))}

                        <div 
                          onClick={() => handleGenreClick(row.genre_id, row.genre_name)}
                          style={{ width: '150px', height: '270px', flexShrink: 0, border: '2px dashed #cbd5e1', borderRadius: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: '#fff' }}
                        >
                          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#7928ca' }}>View All</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;