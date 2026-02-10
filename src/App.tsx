import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Zap, Send, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, onSnapshot, doc, query, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';

import { Movie, Category, AppSettings } from './types';
import { INITIAL_MOVIES, CATEGORIES, BOT_USERNAME } from './constants';

import MovieTile from './components/MovieTile';
import Sidebar from './components/Sidebar';
import MovieDetails from './components/MovieDetails';
import Banner from './components/Banner';
import StoryCircle from './components/StoryCircle';
import TrendingRow from './components/TrendingRow';
import StoryViewer from './components/StoryViewer';
import BottomNav from './components/BottomNav';
import Explore from './components/Explore';
import Watchlist from './components/Watchlist';
import NoticeBar from './components/NoticeBar';
import SplashScreen from './components/SplashScreen';

type Tab = 'home' | 'search' | 'favorites';

const App: React.FC = () => {
  // Loading State
  const [isLoading, setIsLoading] = useState(true);

  // State
  const [movies, setMovies] = useState<Movie[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>({
      botUsername: BOT_USERNAME,
      channelLink: 'https://t.me/cineflixrequestcontent'
  });
  
  // Navigation & Scroll State
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  
  // Category State
  const [activeCategory, setActiveCategory] = useState<Category>('All');

  // Story State
  const [viewingStory, setViewingStory] = useState<Movie | null>(null);
  
  // Banner State
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // Initialize & Fetch Data
  useEffect(() => {
    // 1. Fetch Movies from Firestore (OPTIMIZED: Only load latest 50 to prevent crash)
    const q = query(collection(db, 'movies'), orderBy('createdAt', 'desc'), limit(50));
    
    const unsubscribeMovies = onSnapshot(q, (snapshot) => {
      const fetchedMovies = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Movie[];
      
      // If DB is empty, use initial data, otherwise use fetched
      setMovies(fetchedMovies.length > 0 ? fetchedMovies : INITIAL_MOVIES);
    }, (error) => {
      console.warn("Firestore access failed (using offline mode):", error);
      setMovies(INITIAL_MOVIES);
    });

    // 2. Fetch Settings from Firestore
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'config'), (doc) => {
        if (doc.exists()) {
            setAppSettings(doc.data() as AppSettings);
        }
    }, (error) => {
       console.warn("Settings fetch failed:", error);
    });

    // 3. Handle Splash Screen
    const timer = setTimeout(() => {
        setIsLoading(false);
    }, 2500);

    // 4. Load Favorites
    const savedFavs = localStorage.getItem('cine_favs');
    if (savedFavs) setFavorites(JSON.parse(savedFavs));

    // 5. Telegram Config
    // @ts-ignore
    if (window.Telegram?.WebApp) {
        // @ts-ignore
        window.Telegram.WebApp.expand();
        // @ts-ignore
        window.Telegram.WebApp.setHeaderColor('#000000');
        // @ts-ignore
        window.Telegram.WebApp.setBackgroundColor('#000000');
    }

    return () => {
      clearTimeout(timer);
      unsubscribeMovies();
      unsubscribeSettings();
    };
  }, []);

  // Scroll Handling for Bottom Nav
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Always show at top
      if (currentScrollY < 50) {
        setIsNavVisible(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      // Hide when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsNavVisible(false);
      } else if (currentScrollY < lastScrollY.current) {
        setIsNavVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Toggle Favorite
  const toggleFavorite = (movieId: string) => {
    const newFavs = favorites.includes(movieId)
      ? favorites.filter(id => id !== movieId)
      : [...favorites, movieId];
    
    setFavorites(newFavs);
    localStorage.setItem('cine_favs', JSON.stringify(newFavs));
  };

  // Filtered Movies
  const filteredMovies = useMemo(() => {
    let result = movies;
    
    // Filter by category
    if (activeCategory && activeCategory !== 'All') {
      if (activeCategory === 'Favorites') {
        result = result.filter(m => favorites.includes(m.id));
      } else {
        result = result.filter(m => m.category === activeCategory);
      }
    }
    
    return result;
  }, [movies, activeCategory, favorites]);

  // Top 10 Movies
  const top10Movies = useMemo(() => {
    return movies
      .filter(m => m.isTop10)
      .sort((a, b) => (a.top10Position || 99) - (b.top10Position || 99))
      .slice(0, 10);
  }, [movies]);

  // Featured Movies for Banner
  const featuredMovies = useMemo(() => {
    return movies
      .filter(m => m.isFeatured)
      .sort((a, b) => (a.featuredOrder || 99) - (b.featuredOrder || 99))
      .slice(0, 5);
  }, [movies]);

  // Story Movies
  const storyMovies = useMemo(() => {
    return movies
      .filter(m => m.storyEnabled && m.storyImage)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .slice(0, 10);
  }, [movies]);

  // Auto-rotate banner
  useEffect(() => {
    if (featuredMovies.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % featuredMovies.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [featuredMovies.length]);

  // Get categories with counts
  const categoriesWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    movies.forEach(m => {
      counts[m.category] = (counts[m.category] || 0) + 1;
    });
    
    return [
      { name: 'All', count: movies.length },
      { name: 'Favorites', count: favorites.length },
      ...CATEGORIES.filter(c => c !== 'All' && c !== 'Favorites')
        .map(c => ({ name: c, count: counts[c] || 0 }))
    ];
  }, [movies, favorites]);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <div className="min-h-screen bg-[#000] text-white font-sans overflow-x-hidden">
      {/* Notice Bar */}
      {appSettings.noticeEnabled && appSettings.noticeText && (
        <NoticeBar text={appSettings.noticeText} />
      )}

      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        channelLink={appSettings.channelLink}
      />

      {/* Home Tab */}
      {activeTab === 'home' && (
        <div className="pb-24">
          {/* Header with Logo */}
          <div className="sticky top-0 z-50 bg-gradient-to-b from-[#000] via-[#000]/95 to-transparent backdrop-blur-xl">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-2">
                <Zap className="text-[#FF0000]" size={28} />
                <h1 className="text-2xl font-black tracking-tight">
                  {appSettings.appName || 'CINEFLIX'}
                </h1>
              </div>
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all"
              >
                <Send size={18} className="text-white" />
              </button>
            </div>
          </div>

          <div className="px-4 space-y-6">
            {/* Banner */}
            {appSettings.enableBanners !== false && featuredMovies.length > 0 && (
              <Banner 
                movies={featuredMovies}
                currentIndex={currentBannerIndex}
                onMovieClick={setSelectedMovie}
              />
            )}

            {/* Stories */}
            {appSettings.enableStories !== false && storyMovies.length > 0 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                {storyMovies.map(movie => (
                  <StoryCircle
                    key={movie.id}
                    movie={movie}
                    onClick={() => setViewingStory(movie)}
                  />
                ))}
              </div>
            )}

            {/* Top 10 */}
            {appSettings.enableTop10 !== false && top10Movies.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={20} className="text-[#FF0000]" />
                  <h2 className="text-xl font-bold">Top 10 Trending</h2>
                </div>
                <TrendingRow movies={top10Movies} onMovieClick={setSelectedMovie} />
              </div>
            )}

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
              {categoriesWithCounts.map(cat => (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(cat.name)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0
                    ${activeCategory === cat.name 
                      ? 'bg-[#FF0000] text-white' 
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }
                  `}
                >
                  {cat.name} {cat.count > 0 && `(${cat.count})`}
                </button>
              ))}
            </div>

            {/* Movies Grid */}
            <div className="grid grid-cols-2 gap-3 pb-4">
              {filteredMovies.map(movie => (
                <MovieTile
                  key={movie.id}
                  movie={movie}
                  onClick={() => setSelectedMovie(movie)}
                  isFavorite={favorites.includes(movie.id)}
                  onToggleFavorite={() => toggleFavorite(movie.id)}
                />
              ))}
            </div>

            {filteredMovies.length === 0 && (
              <div className="text-center py-20 text-white/50">
                <p>No content found in this category</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search Tab */}
      {activeTab === 'search' && (
        <Explore 
          movies={movies}
          onMovieClick={setSelectedMovie}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
        />
      )}

      {/* Favorites Tab */}
      {activeTab === 'favorites' && (
        <Watchlist
          movies={movies.filter(m => favorites.includes(m.id))}
          onMovieClick={setSelectedMovie}
          onToggleFavorite={toggleFavorite}
        />
      )}

      {/* Bottom Navigation */}
      <BottomNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        isVisible={isNavVisible}
      />

      {/* Movie Details Modal */}
      <AnimatePresence>
        {selectedMovie && (
          <MovieDetails
            movie={selectedMovie}
            onClose={() => setSelectedMovie(null)}
            botUsername={appSettings.botUsername}
            channelLink={appSettings.channelLink}
          />
        )}
      </AnimatePresence>

      {/* Story Viewer */}
      <AnimatePresence>
        {viewingStory && (
          <StoryViewer
            movie={viewingStory}
            onClose={() => setViewingStory(null)}
            onMovieClick={() => {
              setViewingStory(null);
              setSelectedMovie(viewingStory);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
