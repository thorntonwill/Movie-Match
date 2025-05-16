import { useState, useEffect, useRef } from "react";
import {
  Clock,
  Search,
  Film,
  User,
  Award,
  X,
  Check,
  Play,
  Flag,
  Star,
  Shuffle,
} from "lucide-react";

// Define interfaces for data structures
interface Player {
  id: number;
  name: string;
  score: number;
  color: string;
  challengesLeft: number;
  character: string;
}

interface MovieResult {
  id: number;
  title: string;
  poster_path: string;
  release_date?: string;
  known_for_department?: string;
  popularity?: number;
}

interface PersonResult {
  id: number;
  name: string;
  profile_path: string;
  known_for_department?: string;
  popularity?: number;
}

interface MovieDetails extends MovieResult {
  actors: string[];
}

interface PersonDetails extends PersonResult {
  movies: string[];
}

interface ValidationResult {
  valid: boolean;
  message: string;
}

type SearchResult = MovieResult | PersonResult;
type ItemDetails = MovieDetails | PersonDetails;
type GameMode = "actor_to_movies" | "movie_to_actors" | null;
type GameState = "landing" | "setup" | "playing" | "challenge" | "roundEnd" | "gameOver";

// Cache interfaces
interface ItemsDataCache {
  [key: string]: ItemDetails;
}

// Custom timeout type for browser environment
type TimeoutRef = ReturnType<typeof setTimeout> | null;

// Character options for players
const CHARACTERS = [
  "🎭", "🎬", "🎞️", "🎥", "🍿", "🎪", "🎟️", "🎫", "🎤", "🎼"
];

// Top movies and actors for the "random" feature
const TOP_MOVIES = [
  // Original Movies
  { id: 238, title: "The Godfather" },
  { id: 389, title: "12 Angry Men" },
  { id: 155, title: "The Dark Knight" },
  { id: 429, title: "The Good, the Bad and the Ugly" },
  { id: 240, title: "The Godfather Part II" },
  { id: 424, title: "Schindler's List" },
  { id: 680, title: "Pulp Fiction" },
  { id: 13, title: "Forrest Gump" },
  { id: 122, title: "The Lord of the Rings: The Return of the King" },
  { id: 769, title: "GoodFellas" },
  { id: 550, title: "Fight Club" },
  { id: 311, title: "Once Upon a Time in America" },
  { id: 27205, title: "Inception" },
  { id: 157336, title: "Interstellar" },
  { id: 120, title: "The Lord of the Rings: The Fellowship of the Ring" },
  { id: 121, title: "The Lord of the Rings: The Two Towers" },
  { id: 76338, title: "Thor: The Dark World" },
  { id: 637, title: "Life Is Beautiful" },
  { id: 19404, title: "Dilwale Dulhania Le Jayenge" },
  { id: 278, title: "The Shawshank Redemption" },
  { id: 24428, title: "The Avengers" },
  { id: 557, title: "Spider-Man" },
  { id: 315635, title: "Spider-Man: Homecoming" },
  { id: 603, title: "The Matrix" },
  { id: 49026, title: "The Dark Knight Rises" },
  { id: 1726, title: "Iron Man" },
  { id: 44833, title: "Superbad" },
  { id: 105, title: "Back to the Future" },
  { id: 98, title: "Gladiator" },
  { id: 597, title: "Titanic" },
  { id: 671, title: "Harry Potter and the Philosopher's Stone" },
  { id: 1891, title: "The Empire Strikes Back" },
  { id: 438631, title: "Dune" },
  { id: 254, title: "King Kong" },
  { id: 335984, title: "Blade Runner 2049" },
  { id: 89, title: "Indiana Jones and the Last Crusade" },
  { id: 807, title: "Se7en" },
  { id: 629, title: "The Usual Suspects" },
  { id: 423, title: "The Pianist" },
  { id: 77338, title: "The Intouchables" },
  { id: 346698, title: "Barbie" },
  { id: 346364, title: "Oppenheimer" },
  { id: 497, title: "The Green Mile" },
];

const TOP_ACTORS = [
  // Original Actors
  { id: 3, name: "Tom Hanks" },
  { id: 31, name: "Tom Cruise" },
  { id: 192, name: "Morgan Freeman" },
  { id: 1136406, name: "Zendaya" },
  { id: 18918, name: "Leonardo DiCaprio" },
  { id: 3894, name: "Christian Bale" },
  { id: 287, name: "Brad Pitt" },
  { id: 16828, name: "Chris Evans" },
  { id: 73457, name: "Chris Hemsworth" },
  { id: 74568, name: "Chris Pratt" },
  { id: 17647, name: "Scarlett Johansson" },
  { id: 1283, name: "Helena Bonham Carter" },
  { id: 8691, name: "Robert De Niro" },
  { id: 52, name: "Carrie Fisher" },
  { id: 1, name: "George Lucas" },
  { id: 4, name: "Harrison Ford" },
  { id: 5, name: "Robert Downey Jr." },
  { id: 6, name: "Samuel L. Jackson" },
  { id: 13, name: "Keanu Reeves" },
  { id: 57, name: "Al Pacino" },
  { id: 62, name: "Bruce Willis" },
  { id: 65, name: "Arnold Schwarzenegger" },
  { id: 71, name: "Denzel Washington" },
  { id: 85, name: "Johnny Depp" },
  { id: 109, name: "Jack Nicholson" },
  { id: 113, name: "Sandra Bullock" },
  { id: 115, name: "Will Smith" },
  { id: 117, name: "Jim Carrey" },
  { id: 131, name: "Halle Berry" },
  { id: 136, name: "Anthony Hopkins" },
  { id: 139, name: "Julia Roberts" },
  { id: 154, name: "Mel Gibson" },
  { id: 190, name: "Audrey Hepburn" },
  { id: 193, name: "Meryl Streep" },
  { id: 204, name: "Kate Winslet" },
  { id: 216, name: "Jackie Chan" },
  { id: 224, name: "Dustin Hoffman" },
  { id: 288, name: "Ben Affleck" },
  { id: 335, name: "Jennifer Aniston" },
  { id: 341, name: "Daniel Day-Lewis" },
  { id: 349, name: "Jennifer Lawrence" },
  { id: 380, name: "Robert Redford" },
  { id: 491, name: "Cate Blanchett" },
  { id: 500, name: "Tom Hardy" },
  { id: 1245, name: "Angelina Jolie" },
  { id: 1327, name: "Matt Damon" },
  { id: 1333, name: "Emma Stone" },
  { id: 1336, name: "Viggo Mortensen" },
  { id: 1574, name: "Ryan Gosling" },
  { id: 1625, name: "Michelle Yeoh" },
  { id: 1637, name: "Sylvester Stallone" },
  { id: 1892, name: "Viola Davis" },
  { id: 1920, name: "Dwayne Johnson" },
  { id: 2037, name: "Natalie Portman" },
  { id: 2176, name: "Charlize Theron" },
  { id: 2231, name: "Nicole Kidman" },
  { id: 2524, name: "Idris Elba" },
  { id: 2888, name: "Hugh Jackman" },
  { id: 3223, name: "Joaquin Phoenix" },
];

// CSS for animations
const styleSheet = `
  @keyframes sparkle {
    0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
    10% { opacity: 1; }
    50% { transform: translate(var(--tx), var(--ty)) rotate(var(--r)); }
    100% { transform: translate(calc(var(--tx) * 2), calc(var(--ty) * 2)) rotate(calc(var(--r) * 2)); opacity: 0; }
  }
  
  @keyframes curtain-open-left {
    from { transform: translateX(0); }
    to { transform: translateX(-100%); }
  }
  
  @keyframes curtain-open-right {
    from { transform: translateX(0); }
    to { transform: translateX(100%); }
  }
  
  .curtain-left {
    transition: transform 1.5s ease-in-out;
  }
  
  .curtain-right {
    transition: transform 1.5s ease-in-out;
  }
  
  .curtain-open-left {
    transform: translateX(-100%);
  }
  
  .curtain-open-right {
    transform: translateX(100%);
  }
  
  .timer-bar {
    transition: width 1s linear;
  }
  
  .sparkle {
    --tx: 0px;
    --ty: 0px;
    --r: 0deg;
    position: absolute;
    animation: sparkle 1.5s forwards;
  }
  
  .sparkle-container-success,
  .sparkle-container-failure {
    pointer-events: none;
  }
  
  .sparkle-success {
    color: #FFD700;
  }
  
  .sparkle-failure {
    color: #FF4136;
  }
  
  .cinema-title {
    text-shadow: 0 0 2px #FFD700, 0 0 4px #FFD700;
  }
`;

const MovieMatch = () => {
  // Constants
  const TMDB_API_KEY = "70581b465aebaba2ea66f7cd14976460";
  const TMDB_BASE_URL = "https://api.themoviedb.org/3";
  const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
  const MAX_WRONG_ANSWERS = 2;

  // Game states
  const [gameState, setGameState] = useState<GameState>("landing");
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<ItemDetails | null>(null);
  const [countdown, setCountdown] = useState<number>(30);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>("");
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [namedItems, setNamedItems] = useState<string[]>([]);
  const [showDidYouMean, setShowDidYouMean] = useState<boolean>(false);
  const [didYouMeanSuggestion, setDidYouMeanSuggestion] = useState<string | null>(null);
  const [itemsDataCache, setItemsDataCache] = useState<ItemsDataCache>({});
  
  // Animation states
  const [showEffect, setShowEffect] = useState<boolean>(false);
  const [effectType, setEffectType] = useState<"success" | "failure" | null>(null);
  const [bounceCharacter, setBounceCharacter] = useState<number | null>(null);
  const [curtainsOpen, setCurtainsOpen] = useState<boolean>(false);
  
  // Challenge state
  const [tempChallengeItem, setTempChallengeItem] = useState<ItemDetails | null>(null);

  // Dropdown state
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Store timeout ID to properly clear it
  const timerRef = useRef<TimeoutRef>(null);

  // Player states
  const [players, setPlayers] = useState<Player[]>([
    {
      id: 1,
      name: "Player 1",
      score: 0,
      color: "bg-red-600",
      challengesLeft: 1,
      character: "🎬"
    },
    {
      id: 2,
      name: "Player 2",
      score: 0,
      color: "bg-yellow-500",
      challengesLeft: 1,
      character: "🍿"
    },
    {
      id: 3,
      name: "Player 3",
      score: 0,
      color: "bg-blue-600",
      challengesLeft: 1,
      character: "🎭"
    },
  ]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [lastCorrectPlayerIndex, setLastCorrectPlayerIndex] = useState<number | null>(null);
  const [challengedPlayerIndex, setChallengedPlayerIndex] = useState<number | null>(null);
  const [challengeStatus, setChallengeStatus] = useState<"success" | "failed" | null>(null);
  const [consecutiveWrongs, setConsecutiveWrongs] = useState<Record<number, number>>({
    0: 0,
    1: 0,
    2: 0,
  });
  const [eliminatedPlayers, setEliminatedPlayers] = useState<Record<number, boolean>>({
    0: false,
    1: false,
    2: false,
  });

  // Curtain effect when the game starts
  useEffect(() => {
    if (gameState === "playing") {
      // Short delay before opening curtains
      setTimeout(() => {
        setCurtainsOpen(true);
      }, 500);
    } else if (gameState === "landing" || gameState === "setup") {
      setCurtainsOpen(false);
    }
  }, [gameState]);

  // Handle outside clicks for dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && event.target instanceof Node && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Timer effect - FIXED: Using timerRef for proper cleanup
  useEffect(() => {
    if (timerActive && countdown > 0) {
      timerRef.current = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (
      countdown === 0 &&
      (gameState === "playing" || gameState === "challenge")
    ) {
      handleTimeUp();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [countdown, timerActive, gameState]);

  // Search debounce effect
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (
        gameState === "setup" &&
        showDropdown &&
        searchQuery.trim().length > 0
      ) {
        performSearch(searchQuery);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery, gameState, gameMode, showDropdown]);

  // Effect for animations
  useEffect(() => {
    let timeout: TimeoutRef = null;
    if (showEffect) {
      timeout = setTimeout(() => {
        setShowEffect(false);
      }, 1500);
    }
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [showEffect]);

  // Bounce effect for character
  useEffect(() => {
    let timeout: TimeoutRef = null;
    if (bounceCharacter !== null) {
      timeout = setTimeout(() => {
        setBounceCharacter(null);
      }, 1000);
    }
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [bounceCharacter]);

  // Levenshtein distance algorithm for fuzzy matching
  const levenshteinDistance = (str1: string, str2: string): number => {
    const track = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i += 1) {
      track[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j += 1) {
      track[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator
        );
      }
    }

    return track[str2.length][str1.length];
  };

  // Find close matches for "Did you mean?" feature
  const findCloseMatch = (input: string, validOptions: string[]): string | null => {
    if (!input || input.length < 2) return null;

    const lowerInput = input.toLowerCase();
    
    // You can make substring matching more strict by requiring more overlap
    // For example, only match if the input is a significant part of the option
    // Or comment out this entire block to disable substring matching
    const substringMatches = validOptions.filter(
      (option) => {
        const lowerOption = option.toLowerCase();
        // Make this stricter by requiring a longer match
        // For example, require at least 5 characters or 70% of the input length to match
        const minMatchLength = Math.max(5, Math.floor(lowerInput.length * 0.7));
        
        // Find common substring of at least minMatchLength
        return (lowerOption.includes(lowerInput) && lowerInput.length >= minMatchLength) ||
               (lowerInput.includes(lowerOption) && lowerOption.length >= minMatchLength);
      }
    );

    if (substringMatches.length > 0) {
      substringMatches.sort(
        (a, b) =>
          Math.abs(a.length - input.length) - Math.abs(b.length - input.length)
      );
      return substringMatches[0];
    }

    let bestMatch: string | null = null;
    let bestDistance = Infinity;

    for (const option of validOptions) {
      const lowerOption = option.toLowerCase();
      
      // You can make this stricter by requiring more similarity in the first letters
      // For example, require the first two letters to match instead of just the first
      if (
        lowerOption.substring(0, 2) === lowerInput.substring(0, 2) || 
        lowerOption.substring(lowerOption.length - 2) === 
          lowerInput.substring(lowerInput.length - 2)
      ) {
        const distance = levenshteinDistance(lowerInput, lowerOption);
        const maxLength = Math.max(lowerInput.length, lowerOption.length);
        
        // This is the main threshold to adjust - lower values = stricter matching
        // Change from 0.4 (40%) to a lower value like 0.3 (30%) to make it harder
        const similarityThreshold = maxLength * 0.3; // Make this smaller to be more strict
        
        if (distance < similarityThreshold && distance < bestDistance) {
          bestMatch = option;
          bestDistance = distance;
        }
      }
    }

    return bestMatch;
  };

  // API search function
  const performSearch = async (query: string): Promise<void> => {
    if (!query.trim() && gameState === "setup") {
      if (gameMode === "actor_to_movies") {
        fetchPopularPeople();
      } else {
        fetchPopularMovies();
      }
      return;
    }

    setSearchLoading(true);
    try {
      let results;
      if (gameMode === "actor_to_movies") {
        results = await searchPeople(query);
      } else {
        results = await searchMovies(query);
      }
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Fetch top 100 movies
  const fetchRandomMovie = async (): Promise<void> => {
    setSearchLoading(true);
    try {
      // Select a random movie from the TOP_MOVIES list
      const randomIndex = Math.floor(Math.random() * TOP_MOVIES.length);
      const randomMovie = TOP_MOVIES[randomIndex];
      
      // Fetch details for the movie
      const response = await fetch(
        `${TMDB_BASE_URL}/movie/${randomMovie.id}?api_key=${TMDB_API_KEY}&language=en-US`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      
      const movieWithPoster = {
        ...data,
        poster_path: data.poster_path
          ? `${TMDB_IMAGE_BASE_URL}/w185${data.poster_path}`
          : `https://via.placeholder.com/185x278?text=${encodeURIComponent(data.title)}`
      };
      
      setSearchResults([movieWithPoster]);
      
      // Automatically select this movie
      selectSearchResult(movieWithPoster);
      
    } catch (error) {
      console.error("Error fetching random movie:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Fetch random actor from top 50
  const fetchRandomActor = async (): Promise<void> => {
    setSearchLoading(true);
    try {
      // Select a random actor from the TOP_ACTORS list
      const randomIndex = Math.floor(Math.random() * TOP_ACTORS.length);
      const randomActor = TOP_ACTORS[randomIndex];
      
      // Fetch details for the actor
      const response = await fetch(
        `${TMDB_BASE_URL}/person/${randomActor.id}?api_key=${TMDB_API_KEY}&language=en-US`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      
      const actorWithProfilePic = {
        ...data,
        profile_path: data.profile_path
          ? `${TMDB_IMAGE_BASE_URL}/w185${data.profile_path}`
          : `https://via.placeholder.com/185x278?text=${encodeURIComponent(data.name)}`
      };
      
      setSearchResults([actorWithProfilePic]);
      
      // Automatically select this actor
      selectSearchResult(actorWithProfilePic);
      
    } catch (error) {
      console.error("Error fetching random actor:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Fetch popular people
  const fetchPopularPeople = async (): Promise<void> => {
    setSearchLoading(true);
    try {
      // Instead of making API call, use a randomized selection from our TOP_ACTORS
      const randomizedActors = [...TOP_ACTORS]
        .sort(() => 0.5 - Math.random()) // Shuffle the array
        .slice(0, 6);  // Take only 6 actors
      
      const peopleWithBasicInfo = randomizedActors.map(actor => ({
        ...actor,
        profile_path: `https://via.placeholder.com/185x278?text=${encodeURIComponent(actor.name)}`, // Better placeholder
        known_for_department: "Acting"
      }));

      setSearchResults(peopleWithBasicInfo);
    } catch (error) {
      console.error("Error preparing actor list:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Fetch popular movies
  const fetchPopularMovies = async (): Promise<void> => {
    setSearchLoading(true);
    try {
      // Instead of making API call, use a randomized selection from our TOP_MOVIES
      const randomizedMovies = [...TOP_MOVIES]
        .sort(() => 0.5 - Math.random()) // Shuffle the array
        .slice(0, 6);  // Take only 6 movies
      
      const moviesWithBasicInfo = randomizedMovies.map(movie => ({
        ...movie,
        poster_path: `https://via.placeholder.com/185x278?text=${encodeURIComponent(movie.title)}`, // Better placeholder
        release_date: "2023-01-01" // Default date
      }));

      setSearchResults(moviesWithBasicInfo);
    } catch (error) {
      console.error("Error preparing movie list:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Search for people
  const searchPeople = async (query: string): Promise<SearchResult[]> => {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/search/person?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(
          query
        )}&page=1&include_adult=false`
      );
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();

      const formattedResults = data.results.slice(0, 6).map((person: any) => ({
        ...person,
        profile_path: person.profile_path
          ? `${TMDB_IMAGE_BASE_URL}/w185${person.profile_path}`
          : `https://via.placeholder.com/185x278?text=${encodeURIComponent(
              person.name
            )}`,
      }));

      return formattedResults;
    } catch (error) {
      console.error("Error searching people:", error);
      return [];
    }
  };

  // Search for movies
  const searchMovies = async (query: string): Promise<SearchResult[]> => {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(
          query
        )}&page=1&include_adult=false`
      );
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();

      const formattedResults = data.results.slice(0, 6).map((movie: any) => ({
        ...movie,
        poster_path: movie.poster_path
          ? `${TMDB_IMAGE_BASE_URL}/w185${movie.poster_path}`
          : `https://via.placeholder.com/185x278?text=${encodeURIComponent(
              movie.title
            )}`,
      }));

      return formattedResults;
    } catch (error) {
      console.error("Error searching movies:", error);
      return [];
    }
  };

  // Fetch person details
  const fetchPersonDetails = async (personId: number): Promise<PersonDetails | null> => {
    const cacheKey = `person_${personId}`;
    if (itemsDataCache[cacheKey]) {
      return itemsDataCache[cacheKey] as PersonDetails;
    }

    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/person/${personId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=movie_credits`
      );
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();

      const movies =
        data.movie_credits?.cast
          ?.filter((movie: any) => movie.release_date)
          ?.sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))
          ?.slice(0, 30)
          ?.map((movie: any) => movie.title) || [];

      const personWithMovies: PersonDetails = {
        ...data,
        profile_path: data.profile_path
          ? `${TMDB_IMAGE_BASE_URL}/w185${data.profile_path}`
          : `https://via.placeholder.com/185x278?text=${encodeURIComponent(
              data.name
            )}`,
        movies: movies,
      };

      setItemsDataCache((prevCache) => ({
        ...prevCache,
        [cacheKey]: personWithMovies,
      }));

      return personWithMovies;
    } catch (error) {
      console.error(`Error fetching person details for ID ${personId}:`, error);
      return null;
    }
  };

  // Fetch movie details
  const fetchMovieDetails = async (movieId: number): Promise<MovieDetails | null> => {
    const cacheKey = `movie_${movieId}`;
    if (itemsDataCache[cacheKey]) {
      return itemsDataCache[cacheKey] as MovieDetails;
    }

    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=credits`
      );
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();

      const actors =
        data.credits?.cast
          ?.sort((a: any, b: any) => a.order - b.order)
          ?.slice(0, 30)
          ?.map((actor: any) => actor.name) || [];

      const movieWithActors: MovieDetails = {
        ...data,
        poster_path: data.poster_path
          ? `${TMDB_IMAGE_BASE_URL}/w185${data.poster_path}`
          : `https://via.placeholder.com/185x278?text=${encodeURIComponent(
              data.title
            )}`,
        actors: actors,
      };

      setItemsDataCache((prevCache) => ({
        ...prevCache,
        [cacheKey]: movieWithActors,
      }));

      return movieWithActors;
    } catch (error) {
      console.error(`Error fetching movie details for ID ${movieId}:`, error);
      return null;
    }
  };

  // Handle correct answers
  const handleCorrectAnswer = (item: string): void => {
    setNamedItems((prev) => [...prev, item]);
    setInputValue("");
    setValidationResult({
      valid: true,
      message: "Correct!",
    });
    setLastCorrectPlayerIndex(currentPlayerIndex);
    
    // Show success effect
    setEffectType("success");
    setShowEffect(true);
    setBounceCharacter(currentPlayerIndex);

    // Reset consecutive wrong answers for this player
    setConsecutiveWrongs((prev) => ({
      ...prev,
      [currentPlayerIndex]: 0,
    }));

    // Move to next player
    if (gameState === "challenge") {
      // If challenge was successful
      setChallengeStatus("success");
      setTimeout(() => {
        // Reset challenge state and continue game with next player
        setChallengeStatus(null);
        setChallengedPlayerIndex(null);
        setTempChallengeItem(null);
        setGameState("playing");
        moveToNextPlayer();
      }, 1500);
    } else {
      // Normal turn completion
      setTimeout(() => {
        moveToNextPlayer();
        setValidationResult(null);
      }, 1500);
    }
  };

  // Handle incorrect answers
  const handleIncorrectAnswer = (message: string): void => {
    // Show failure effect
    setEffectType("failure");
    setShowEffect(true);
    
    // Increment consecutive wrong answers for this player
    const newConsecutiveWrongs = {
      ...consecutiveWrongs,
      [currentPlayerIndex]: consecutiveWrongs[currentPlayerIndex] + 1,
    };
    setConsecutiveWrongs(newConsecutiveWrongs);

    // Create appropriate message
    const wrongsRemaining =
      MAX_WRONG_ANSWERS - newConsecutiveWrongs[currentPlayerIndex];
    const wrongMessage =
      wrongsRemaining > 0
        ? `${message} ${wrongsRemaining} more incorrect answer${
            wrongsRemaining > 1 ? "s" : ""
          } and you're out!`
        : `${message} You've been eliminated for this round!`;

    setValidationResult({
      valid: false,
      message: wrongMessage,
    });

    if (newConsecutiveWrongs[currentPlayerIndex] >= MAX_WRONG_ANSWERS) {
      // Player is eliminated
      const newEliminatedPlayers = {
        ...eliminatedPlayers,
        [currentPlayerIndex]: true,
      };
      setEliminatedPlayers(newEliminatedPlayers);

      // Check if all but one player is eliminated
      const remainingPlayers = Object.values(newEliminatedPlayers).filter(
        (eliminated) => !eliminated
      ).length;

      if (remainingPlayers <= 1) {
        // Only one player left, end the round
        setTimeout(() => {
          endRound();
        }, 1500);
        return;
      }
    }

    if (gameState === "challenge") {
      // Failed challenge
      setChallengeStatus("failed");
      setTimeout(() => {
        // Continue game with next player
        setValidationResult(null);
        setInputValue("");
        setChallengedPlayerIndex(null);
        setTempChallengeItem(null);
        setGameState("playing");
        moveToNextPlayer();
      }, 1500);
    } else {
      // Normal incorrect answer
      setTimeout(() => {
        setValidationResult(null);
        setInputValue("");
        moveToNextPlayer();
      }, 1500);
    }
  };

  // Handle "Did you mean?" suggestions
  const acceptSuggestion = (): void => {
    if (didYouMeanSuggestion) {
      handleCorrectAnswer(didYouMeanSuggestion);
    }
    setShowDidYouMean(false);
    setDidYouMeanSuggestion(null);
  };

  const rejectSuggestion = (): void => {
    handleIncorrectAnswer("Incorrect answer.");
    setShowDidYouMean(false);
    setDidYouMeanSuggestion(null);
  };

  // Move to next player
  const moveToNextPlayer = (): void => {
    // Find the next non-eliminated player
    let nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    let loopCount = 0;

    while (eliminatedPlayers[nextPlayerIndex] && loopCount < players.length) {
      nextPlayerIndex = (nextPlayerIndex + 1) % players.length;
      loopCount++;
    }

    // If all players are eliminated, end the round
    if (loopCount >= players.length) {
      endRound();
      return;
    }

    setCurrentPlayerIndex(nextPlayerIndex);
    setCountdown(30);
    setTimerActive(true);
  };

  // Handle time up
  const handleTimeUp = (): void => {
    setTimerActive(false);
    
    // Show failure effect
    setEffectType("failure");
    setShowEffect(true);

    // Increment consecutive wrong answers for this player
    const newConsecutiveWrongs = {
      ...consecutiveWrongs,
      [currentPlayerIndex]: consecutiveWrongs[currentPlayerIndex] + 1,
    };
    setConsecutiveWrongs(newConsecutiveWrongs);

    // Check if player should be eliminated
    if (newConsecutiveWrongs[currentPlayerIndex] >= MAX_WRONG_ANSWERS) {
      const newEliminatedPlayers = {
        ...eliminatedPlayers,
        [currentPlayerIndex]: true,
      };
      setEliminatedPlayers(newEliminatedPlayers);

      setValidationResult({
        valid: false,
        message: "Time's up! You've been eliminated for this round!",
      });

      // Check if all but one player is eliminated
      const remainingPlayers = Object.values(newEliminatedPlayers).filter(
        (eliminated) => !eliminated
      ).length;

      if (remainingPlayers <= 1) {
        setTimeout(() => {
          endRound();
        }, 1500);
        return;
      }
    } else {
      // Player gets a warning
      const wrongsRemaining =
        MAX_WRONG_ANSWERS - newConsecutiveWrongs[currentPlayerIndex];
      setValidationResult({
        valid: false,
        message: `Time's up! ${wrongsRemaining} more and you're out!`,
      });
    }

    if (gameState === "challenge") {
      setChallengeStatus("failed");
      setTimeout(() => {
        setValidationResult(null);
        setInputValue("");
        setChallengedPlayerIndex(null);
        setGameState("playing");
        moveToNextPlayer();
      }, 1500);
    } else {
      setTimeout(() => {
        setValidationResult(null);
        setInputValue("");
        moveToNextPlayer();
      }, 1500);
    }
  };

  // Issue a challenge
  const issueChallenge = async (targetPlayerIndex: number): Promise<void> => {
    // Check if current player has challenges left
    if (players[currentPlayerIndex].challengesLeft <= 0) {
      return;
    }

    // Get the last named item
    const lastNamedItem = namedItems[namedItems.length - 1];
    if (!lastNamedItem) {
      setValidationResult({
        valid: false,
        message: "No items have been named yet to challenge!"
      });
      return;
    }

    // Check challenge direction - should be opposite of current game mode
    let challengeItem = null;
    let challengeItemType = "";
    
    try {
      if (gameMode === "actor_to_movies") {
        // If current mode is actor->movies, challenge with a movie->actors
        // Search for the movie details
        challengeItemType = "movie";
        const searchResults = await searchMovies(lastNamedItem);
        if (searchResults && searchResults.length > 0) {
          const movieDetails = await fetchMovieDetails(searchResults[0].id);
          challengeItem = movieDetails;
        }
      } else {
        // If current mode is movie->actors, challenge with an actor->movies
        challengeItemType = "actor";
        const searchResults = await searchPeople(lastNamedItem);
        if (searchResults && searchResults.length > 0) {
          const actorDetails = await fetchPersonDetails(searchResults[0].id);
          challengeItem = actorDetails;
        }
      }
    } catch (error) {
      console.error("Error setting up challenge:", error);
    }

    if (!challengeItem) {
      setValidationResult({
        valid: false,
        message: `Could not find details for the ${challengeItemType}. Try a different challenge.`
      });
      return;
    }

    // Update challenges left for current player
    const updatedPlayers = [...players];
    updatedPlayers[currentPlayerIndex].challengesLeft--;
    setPlayers(updatedPlayers);

    // Set temporary item for the challenge
    setTempChallengeItem(challengeItem);
    
    // Set challenge state
    setChallengedPlayerIndex(targetPlayerIndex);
    setCurrentPlayerIndex(targetPlayerIndex);
    setGameState("challenge");
    setCountdown(30);
    setInputValue("");
    setValidationResult(null);
  };

  // Select a search result
  const selectSearchResult = async (item: SearchResult): Promise<void> => {
    setSelectedItem(null); // Clear previous selection
    setValidationResult(null); // Clear any validation messages

    try {
      let detailedItem;

      if (gameMode === "actor_to_movies") {
        detailedItem = await fetchPersonDetails(item.id);

        if (!detailedItem || (detailedItem as PersonDetails).movies.length < 5) {
          setValidationResult({
            valid: false,
            message:
              "This person doesn't have enough known movies. Please select another actor.",
          });
          return;
        }
      } else {
        detailedItem = await fetchMovieDetails(item.id);

        if (!detailedItem || (detailedItem as MovieDetails).actors.length < 5) {
          setValidationResult({
            valid: false,
            message:
              "This movie doesn't have enough known actors. Please select another movie.",
          });
          return;
        }
      }

      setSelectedItem(detailedItem);
      setSearchQuery(
        gameMode === "actor_to_movies" 
          ? ('name' in item ? item.name : "")
          : ('title' in item ? item.title : "")
      );
      setShowDropdown(false);
    } catch (error) {
      console.error("Error selecting item:", error);
      setValidationResult({
        valid: false,
        message: "There was an error retrieving details. Please try again.",
      });
    }
  };

  // Validate movie input
  const validateMovie = (movie: string): void => {
    if (!selectedItem) return;
    
    const movieTitle = movie.trim();
    const movieTitleLower = movieTitle.toLowerCase();

    // Check if already named
    if (namedItems.some((item) => item.toLowerCase() === movieTitleLower)) {
      setValidationResult({
        valid: false,
        message: "This movie has already been named!",
      });
      return;
    }

    // First check for exact match (case insensitive)
    const personDetails = selectedItem as PersonDetails;
    const exactMatch = personDetails.movies.find(
      (m) => m.toLowerCase() === movieTitleLower
    );

    if (exactMatch) {
      // Use the exact casing from the database
      handleCorrectAnswer(exactMatch);
      return;
    }

    // If no exact match, try fuzzy matching
    const closeMatch = findCloseMatch(movieTitle, personDetails.movies);
    if (closeMatch) {
      setDidYouMeanSuggestion(closeMatch);
      setShowDidYouMean(true);
    } else {
      handleIncorrectAnswer("That movie doesn't star this actor.");
    }
  };

  // Validate actor input
  const validateActor = (actor: string): void => {
    if (!selectedItem) return;
    
    const actorName = actor.trim();
    const actorNameLower = actorName.toLowerCase();

    // Check if already named
    if (namedItems.some((item) => item.toLowerCase() === actorNameLower)) {
      setValidationResult({
        valid: false,
        message: "This actor has already been named!",
      });
      return;
    }

    // First check for exact match (case insensitive)
    const movieDetails = selectedItem as MovieDetails;
    const exactMatch = movieDetails.actors.find(
      (a) => a.toLowerCase() === actorNameLower
    );

    if (exactMatch) {
      // Use the exact casing from the database
      handleCorrectAnswer(exactMatch);
      return;
    }

    // If no exact match, try fuzzy matching
    const closeMatch = findCloseMatch(actorName, movieDetails.actors);
    if (closeMatch) {
      setDidYouMeanSuggestion(closeMatch);
      setShowDidYouMean(true);
    } else {
      handleIncorrectAnswer("That actor isn't in this movie.");
    }
  };

  // Validate input
  const validateInput = (): void => {
    if (!inputValue.trim()) return;

    if (gameMode === "actor_to_movies") {
      validateMovie(inputValue);
    } else if (gameMode === "movie_to_actors") {
      validateActor(inputValue);
    }
  };

  // Start game
  const startGame = (): void => {
    if (!selectedItem) return;

    setGameState("playing");
    setNamedItems([]);
    setCurrentPlayerIndex(0);
    setLastCorrectPlayerIndex(null);
    setChallengedPlayerIndex(null);
    setChallengeStatus(null);
    setCountdown(30);
    setTimerActive(true);

    // Reset elimination status and consecutive wrongs
    setEliminatedPlayers({ 0: false, 1: false, 2: false });
    setConsecutiveWrongs({ 0: 0, 1: 0, 2: 0 });

    // Reset challenges for all players
    setPlayers(players.map((player) => ({ ...player, challengesLeft: 1 })));
  };

  // End round
  const endRound = (): void => {
    setTimerActive(false);
    setGameState("roundEnd");

    // Find the last non-eliminated player if everyone else is eliminated
    let winnerIndex = lastCorrectPlayerIndex;

    // If no one got a correct answer, check if there's only one player not eliminated
    if (winnerIndex === null) {
      const nonEliminatedPlayers = Object.entries(eliminatedPlayers)
        .filter(([_, eliminated]) => !eliminated)
        .map(([index]) => parseInt(index));

      if (nonEliminatedPlayers.length === 1) {
        winnerIndex = nonEliminatedPlayers[0];
      }
    }

    // Award point to winner
    if (winnerIndex !== null) {
      const updatedPlayers = [...players];
      updatedPlayers[winnerIndex].score += 1;
      setPlayers(updatedPlayers);
      setLastCorrectPlayerIndex(winnerIndex);
      
      // Show success effect for winner
      setBounceCharacter(winnerIndex);
      setEffectType("success");
      setShowEffect(true);

      // Check if any player has won (3 points)
      if (updatedPlayers[winnerIndex].score >= 3) {
        setGameState("gameOver");
      }
    }
  };

  // Start new round
  const startNewRound = (): void => {
    setGameMode(null);
    setSelectedItem(null);
    setSearchQuery("");
    setNamedItems([]);
    setGameState("landing");
    setChallengedPlayerIndex(null);
    setChallengeStatus(null);
  };

  // Reset game
  const resetGame = (): void => {
    setGameMode(null);
    setSelectedItem(null);
    setSearchQuery("");
    setNamedItems([]);
    setPlayers(
      players.map((player) => ({ ...player, score: 0, challengesLeft: 1 }))
    );
    setGameState("landing");
    setChallengedPlayerIndex(null);
    setChallengeStatus(null);
    setConsecutiveWrongs({ 0: 0, 1: 0, 2: 0 });
    setEliminatedPlayers({ 0: false, 1: false, 2: false });
  };

  // Update player character
  const updatePlayerCharacter = (playerId: number): void => {
    const updatedPlayers = [...players];
    const playerIndex = playerId - 1;
    const currentCharIndex = CHARACTERS.indexOf(updatedPlayers[playerIndex].character);
    const nextCharIndex = (currentCharIndex + 1) % CHARACTERS.length;
    updatedPlayers[playerIndex].character = CHARACTERS[nextCharIndex];
    setPlayers(updatedPlayers);
  };

  // Mode selection handlers
  const selectActorToMovies = (): void => {
    setGameMode("actor_to_movies");
    setGameState("setup");
    // Initialize with popular people
    fetchPopularPeople();
  };

  const selectMovieToActors = (): void => {
    setGameMode("movie_to_actors");
    setGameState("setup");
    // Initialize with popular movies
    fetchPopularMovies();
  };

  // Handle key press for input
  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter" && inputValue.trim()) {
      validateInput();
    }
  };

  // Current player and winner
  const currentPlayer = players[currentPlayerIndex];
  const winner = players.find((player) => player.score >= 3);

  // Render function for sparkles effect
  const renderSparkles = () => {
    if (!showEffect) return null;
    
    return (
      <div className={`absolute inset-0 pointer-events-none z-40 
        ${effectType === "success" ? "sparkle-container-success" : "sparkle-container-failure"}`}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div 
            key={i}
            className={`absolute sparkle 
              ${effectType === "success" ? "sparkle-success" : "sparkle-failure"}`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 0.5}s`,
              '--tx': `${(Math.random() - 0.5) * 100}px`,
              '--ty': `${(Math.random() - 0.5) * 100}px`,
              '--r': `${Math.random() * 360}deg`
            } as React.CSSProperties}
          >
            {effectType === "success" ? <Star size={16} /> : <X size={16} />}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center bg-red-900 p-4 rounded-lg shadow-lg max-w-md mx-auto text-white min-h-screen relative overflow-hidden">
      {/* Add style tag for animations */}
      <style dangerouslySetInnerHTML={{ __html: styleSheet }} />
      
      {/* Theater curtains */}
      <div className={`absolute top-0 left-0 w-1/2 h-full bg-red-800 curtain-left z-10 ${curtainsOpen ? "curtain-open-left" : ""}`}></div>
      <div className={`absolute top-0 right-0 w-1/2 h-full bg-red-800 curtain-right z-10 ${curtainsOpen ? "curtain-open-right" : ""}`}></div>
      
      {/* Sparkles effect overlay */}
      {renderSparkles()}
      
      {/* Movie theater lights */}
      <div className="absolute top-1 left-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse z-5"></div>
      <div className="absolute top-1 right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse z-5"></div>
      <div className="absolute bottom-1 left-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse z-5"></div>
      <div className="absolute bottom-1 right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse z-5"></div>

      {/* Header */}
      <div className="w-full mb-4 text-center z-40">
        <h1 className="text-3xl font-bold mb-2 text-yellow-400 cinema-title">Movie Match</h1>
        {gameState !== "landing" && (
          <p className="text-sm text-yellow-200">
            {gameMode === "actor_to_movies"
              ? "Name movies starring this actor"
              : "Name actors starring in this movie"}
          </p>
        )}
      </div>

      {/* Player Scores */}
      {gameState !== "landing" && (
        <div className="flex justify-between w-full mb-4 z-40">
          {players.map((player, index) => (
            <div
              key={player.id}
              className={`flex flex-col items-center p-2 rounded-lg transition-all duration-300 
                ${bounceCharacter === index ? "animate-bounce" : ""}
                ${currentPlayerIndex === index &&
                  (gameState === "playing" || gameState === "challenge")
                    ? `${player.color} shadow-lg shadow-yellow-300/50`
                    : challengedPlayerIndex === index && gameState === "challenge"
                    ? "bg-yellow-500 text-black shadow-lg shadow-yellow-300/50"
                    : eliminatedPlayers[index]
                    ? "bg-gray-700 text-gray-400 opacity-60"
                    : "bg-gray-900"
                }`}
            >
              <div 
                className="text-2xl mb-1 cursor-pointer" 
                onClick={() => updatePlayerCharacter(player.id)}
              >
                {player.character}
              </div>
              <div className="text-sm font-bold">
                {player.name}
                {eliminatedPlayers[index] && " (Out)"}
              </div>
              <div className="flex items-center mt-1">
                <Award size={16} className="text-yellow-400" />
                <span className="ml-1 text-lg font-bold">{player.score}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Game Screens */}
      {gameState === "landing" && (
        <div className="w-full bg-gray-900 rounded-lg p-6 shadow-lg shadow-black/50 mb-6 border-2 border-yellow-500 z-40">
          <h2 className="text-xl font-bold mb-4 text-center text-yellow-400">How to Play</h2>

          <div className="mb-6">
            <p className="mb-2 text-yellow-100">Choose a game mode:</p>
            <ul className="list-disc pl-5 mb-4 text-yellow-100">
              <li className="mb-2">
                <strong className="text-yellow-300">Actor → Movies:</strong> Players take turns naming
                movies starring a specific actor
              </li>
              <li className="mb-2">
                <strong className="text-yellow-300">Movie → Actors:</strong> Players take turns naming
                actors from a specific movie
              </li>
            </ul>
            <p className="mb-2 text-yellow-100">
              Each player has 30 seconds to name a valid item.
            </p>
            <p className="mb-2 text-yellow-100">
              Get 2 consecutive wrong answers and you're eliminated from the
              round.
            </p>
            <p className="mb-2 text-yellow-100">
              The last player standing gets 1 point. First to 3 points wins!
            </p>
            <p className="font-medium mt-3 text-yellow-300">Challenge Feature:</p>
            <p className="text-yellow-100">
              Each player can issue one challenge per round to another player.
              The challenged player must name another valid item within 30
              seconds!
            </p>
          </div>

          <div className="flex flex-col space-y-3">
            <button
              onClick={selectActorToMovies}
              className="bg-blue-600 text-white py-3 px-4 rounded-lg flex items-center justify-center shadow-md hover:bg-blue-700 transition-all"
            >
              <User size={18} className="mr-2" />
              Actor to Movies
            </button>

            <button
              onClick={selectMovieToActors}
              className="bg-purple-600 text-white py-3 px-4 rounded-lg flex items-center justify-center shadow-md hover:bg-purple-700 transition-all"
            >
              <Film size={18} className="mr-2" />
              Movie to Actors
            </button>
          </div>
        </div>
      )}

      {gameState === "setup" && (
        <div className="w-full bg-gray-900 rounded-lg p-4 shadow-lg shadow-black/50 mb-6 border-2 border-yellow-500 z-40">
          <h2 className="text-lg font-bold mb-3 text-yellow-400">
            {gameMode === "actor_to_movies"
              ? "Select an Actor"
              : "Select a Movie"}
          </h2>

          <div className="relative mb-4" ref={dropdownRef}>
            <div className="flex w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  setShowDropdown(true);
                  if (!searchQuery.trim()) {
                    if (gameMode === "actor_to_movies") {
                      fetchPopularPeople();
                    } else {
                      fetchPopularMovies();
                    }
                  }
                }}
                placeholder={
                  gameMode === "actor_to_movies"
                    ? "Search for an actor..."
                    : "Search for a movie..."
                }
                className="flex-grow p-2 border rounded-l bg-gray-800 text-white border-gray-700"
              />
              <button
                onClick={() => {
                  setShowDropdown(!showDropdown);
                  if (!showDropdown) {
                    performSearch(searchQuery);
                  }
                }}
                className="bg-yellow-600 text-white py-2 px-3 rounded-r hover:bg-yellow-700 transition-colors"
                disabled={searchLoading}
              >
                {searchLoading ? "..." : <Search size={18} />}
              </button>
            </div>

            {/* Random selection buttons */}
            <div className="flex mt-2 mb-3 space-x-2">
              <button
                onClick={gameMode === "actor_to_movies" ? fetchRandomActor : fetchRandomMovie}
                className="flex-1 bg-green-600 text-white py-2 px-3 rounded flex items-center justify-center hover:bg-green-700 transition-colors"
              >
                <Shuffle size={16} className="mr-1" />
                {gameMode === "actor_to_movies" ? "Random Actor" : "Random Movie"}
              </button>
            </div>

            {showDropdown && searchResults.length > 0 && (
              <div className="absolute w-full bg-gray-800 border border-gray-700 rounded shadow-lg max-h-64 overflow-y-auto z-50 mt-1">
                {searchQuery.trim().length === 0 && (
                  <div className="p-2 bg-gray-700 text-sm font-medium border-b border-gray-600 text-yellow-300">
                    {gameMode === "actor_to_movies"
                      ? "Popular Actors"
                      : "Popular Movies"}
                  </div>
                )}

                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => selectSearchResult(item)}
                    className="flex items-center p-2 hover:bg-gray-700 cursor-pointer border-b border-gray-700"
                  >
                    <div className="w-12 h-16 bg-gray-900 rounded mr-3 overflow-hidden flex items-center justify-center">
                      {gameMode === "actor_to_movies" && 'profile_path' in item ? (
                        <img
                          src={item.profile_path}
                          alt={'name' in item ? item.name : "Actor"}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.src = `https://via.placeholder.com/185x278?text=${
                              'name' in item ? encodeURIComponent(item.name) : "Actor"
                            }`;
                          }}
                        />
                      ) : gameMode === "movie_to_actors" && 'poster_path' in item ? (
                        <img
                          src={item.poster_path}
                          alt={'title' in item ? item.title : "Movie"}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.src = `https://via.placeholder.com/185x278?text=${
                              'title' in item ? encodeURIComponent(item.title) : "Movie"
                            }`;
                          }}
                        />
                      ) : (
                        <div className="text-xs text-center text-gray-400 p-1">
                          {'name' in item ? item.name : 'title' in item ? item.title : "No Image"}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-white">
                        {gameMode === "actor_to_movies"
                          ? 'name' in item ? item.name : ""
                          : 'title' in item ? item.title : ""}
                      </div>
                      <div className="text-xs text-gray-400">
                        {gameMode === "movie_to_actors" && 'release_date' in item && item.release_date
                          ? `Released: ${new Date(item.release_date).getFullYear()}`
                          : ""}
                      </div>
                    </div>
                  </div>
                ))}

                {searchResults.length === 0 &&
                  searchQuery.trim().length > 0 && (
                    <div className="p-3 text-center text-gray-400">
                      No results found for "{searchQuery}"
                    </div>
                  )}
              </div>
            )}
          </div>

          {selectedItem && (
            <div className="flex items-center mb-4 bg-gray-800 p-3 rounded-lg w-full border border-yellow-600">
              <div className="w-16 h-20 bg-gray-900 rounded mr-3 overflow-hidden flex items-center justify-center">
                {gameMode === "actor_to_movies" && 'profile_path' in selectedItem ? (
                  <img
                    src={selectedItem.profile_path}
                    alt={'name' in selectedItem ? selectedItem.name : "Actor"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.src = `https://via.placeholder.com/185x278?text=${
                        'name' in selectedItem ? encodeURIComponent(selectedItem.name) : "Actor"
                      }`;
                    }}
                  />
                ) : gameMode === "movie_to_actors" && 'poster_path' in selectedItem ? (
                  <img
                    src={selectedItem.poster_path}
                    alt={'title' in selectedItem ? selectedItem.title : "Movie"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.src = `https://via.placeholder.com/185x278?text=${
                        'title' in selectedItem ? encodeURIComponent(selectedItem.title) : "Movie"
                      }`;
                    }}
                  />
                ) : (
                  <div className="text-xs text-center text-gray-400 p-1">
                    {'name' in selectedItem ? selectedItem.name : 'title' in selectedItem ? selectedItem.title : "No Image"}
                  </div>
                )}
              </div>
              <div>
                <div className="font-bold text-lg text-yellow-300">
                  {gameMode === "actor_to_movies"
                    ? 'name' in selectedItem ? selectedItem.name : ""
                    : 'title' in selectedItem ? selectedItem.title : ""}
                </div>
                <div className="text-sm text-gray-300">
                  {gameMode === "actor_to_movies"
                    ? `${gameMode === "actor_to_movies" && 'movies' in selectedItem ? selectedItem.movies.length : 0} movies found for this actor`
                    : `${gameMode === "movie_to_actors" && 'actors' in selectedItem ? selectedItem.actors.length : 0} actors found in this movie`}
                </div>
              </div>
            </div>
          )}

          {validationResult && (
            <div
              className={`mb-4 p-2 rounded text-sm ${
                validationResult.valid
                  ? "bg-green-900 text-green-200 border border-green-500"
                  : "bg-red-900 text-red-200 border border-red-500"
              }`}
            >
              {validationResult.message}
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={startNewRound}
              className="bg-gray-700 text-white py-2 px-4 rounded hover:bg-gray-600 transition-colors"
            >
              Back
            </button>

            <button
              onClick={startGame}
              disabled={!selectedItem}
              className="bg-green-600 text-white py-2 px-4 rounded disabled:bg-gray-600 flex items-center hover:bg-green-700 transition-colors disabled:hover:bg-gray-600"
            >
              <Play size={18} className="mr-2" />
              Start Game
            </button>
          </div>
        </div>
      )}

      {(gameState === "playing" || gameState === "challenge") && (gameState === "challenge" ? tempChallengeItem : selectedItem) && (
        <div className="w-full bg-gray-900 rounded-lg p-4 shadow-lg shadow-black/50 mb-6 border-2 border-yellow-500 z-40">
          {/* Selected item display */}
          <div className="flex items-center mb-4 bg-gray-800 p-3 rounded-lg w-full border border-yellow-600">
            <div className="w-16 h-20 bg-gray-900 rounded mr-3 overflow-hidden flex items-center justify-center">
              {gameState === "challenge" ? (
                // For challenge, show the opposite type from the current game mode
                gameMode === "actor_to_movies" && 'poster_path' in tempChallengeItem! ? (
                  <img
                    src={tempChallengeItem!.poster_path}
                    alt={'title' in tempChallengeItem! ? tempChallengeItem!.title : "Movie"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.src = `https://via.placeholder.com/185x278?text=${
                        'title' in tempChallengeItem! ? encodeURIComponent(tempChallengeItem!.title) : "Movie"
                      }`;
                    }}
                  />
                ) : gameMode === "movie_to_actors" && 'profile_path' in tempChallengeItem! ? (
                  <img
                    src={tempChallengeItem!.profile_path}
                    alt={'name' in tempChallengeItem! ? tempChallengeItem!.name : "Actor"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.src = `https://via.placeholder.com/185x278?text=${
                        'name' in tempChallengeItem! ? encodeURIComponent(tempChallengeItem!.name) : "Actor"
                      }`;
                    }}
                  />
                ) : (
                  <div className="text-xs text-center text-gray-400 p-1">
                    {gameMode === "actor_to_movies" 
                      ? ('title' in tempChallengeItem! ? tempChallengeItem!.title : "Movie") 
                      : ('name' in tempChallengeItem! ? tempChallengeItem!.name : "Actor")}
                  </div>
                )
              ) : (
                // For regular gameplay, show according to game mode
                gameMode === "actor_to_movies" && 'profile_path' in selectedItem! ? (
                  <img
                    src={selectedItem!.profile_path}
                    alt={'name' in selectedItem! ? selectedItem!.name : "Actor"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.src = `https://via.placeholder.com/185x278?text=${
                        'name' in selectedItem! ? encodeURIComponent(selectedItem!.name) : "Actor"
                      }`;
                    }}
                  />
                ) : gameMode === "movie_to_actors" && 'poster_path' in selectedItem! ? (
                  <img
                    src={selectedItem!.poster_path}
                    alt={'title' in selectedItem! ? selectedItem!.title : "Movie"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.src = `https://via.placeholder.com/185x278?text=${
                        'title' in selectedItem! ? encodeURIComponent(selectedItem!.title) : "Movie"
                      }`;
                    }}
                  />
                ) : (
                  <div className="text-xs text-center text-gray-400 p-1">
                    {gameMode === "actor_to_movies" 
                      ? ('name' in selectedItem! ? selectedItem!.name : "Actor") 
                      : ('title' in selectedItem! ? selectedItem!.title : "Movie")}
                  </div>
                )
              )}
            </div>
            <div className="flex-grow">
              <div className="font-bold text-lg text-yellow-300">
                {gameState === "challenge" ? (
                  // For challenge, show the opposite type from the current game mode
                  gameMode === "actor_to_movies" ?
                    ('title' in tempChallengeItem! ? tempChallengeItem!.title : "") :
                    ('name' in tempChallengeItem! ? tempChallengeItem!.name : "")
                ) : (
                  // For regular gameplay, show according to game mode
                  gameMode === "actor_to_movies"
                    ? 'name' in selectedItem! ? selectedItem!.name : ""
                    : 'title' in selectedItem! ? selectedItem!.title : ""
                )}
              </div>
              <div className="text-sm text-gray-300">
                {gameState === "challenge" ? (
                  // For challenges, display what the player needs to name
                  gameMode === "actor_to_movies" ?
                    "Name an actor in this movie" :
                    "Name a movie starring this actor"
                ) : (
                  // For regular gameplay
                  gameMode === "actor_to_movies"
                    ? "Name a movie starring this actor"
                    : "Name an actor in this movie"
                )}
              </div>
            </div>
          </div>

          {/* Current player turn */}
          <div
            className={`p-3 mb-4 rounded-lg ${currentPlayer.color} text-white`}
          >
            <h3 className="font-bold flex items-center">
              {gameState === "challenge" ? (
                <>
                  <Flag size={18} className="mr-2" /> Challenge!{" "}
                  <span className="ml-1">{currentPlayer.character} {currentPlayer.name}'s Turn</span>
                </>
              ) : (
                <>
                  <span>{currentPlayer.character} {currentPlayer.name}'s Turn</span>
                </>
              )}
            </h3>
            <div className="flex justify-between items-center mt-1">
              <p className="text-sm">
                {gameState === "challenge"
                  ? "You've been challenged! Name another valid item."
                  : "Name a valid item before time runs out."}
              </p>

              {/* Consecutive wrong answers indicator */}
              <div className="flex items-center">
                <div className="text-xs font-medium mr-1">Strikes:</div>
                {[...Array(MAX_WRONG_ANSWERS)].map((_, i) => (
                  <span
                    key={i}
                    className={`inline-block w-3 h-3 rounded-full mx-px ${
                      i < consecutiveWrongs[currentPlayerIndex]
                        ? "bg-red-300"
                        : "bg-white bg-opacity-30"
                    }`}
                  ></span>
                ))}
              </div>
            </div>
          </div>

          {/* Challenge status feedback */}
          {gameState === "challenge" && challengeStatus && (
            <div 
              className={`p-3 mb-4 rounded-lg text-white flex items-center justify-center ${
                challengeStatus === "success" ? "bg-green-600" : "bg-red-600"
              }`}
            >
              {challengeStatus === "success" ? (
                <>
                  <Check size={18} className="mr-2" />
                  Challenge Successful! Moving to next player...
                </>
              ) : (
                <>
                  <X size={18} className="mr-2" />
                  Challenge Failed! Moving to next player...
                </>
              )}
            </div>
          )}

          {/* Timer */}
          <div className="flex justify-between mb-4">
            <div className="flex items-center">
              <Clock size={20} className="mr-2 text-yellow-400" />
              <div
                className={`font-bold ${countdown <= 10 ? "text-red-500" : "text-yellow-300"}`}
              >
                {countdown}s
              </div>
            </div>

            {/* Items named count */}
            <div className="text-sm font-medium text-yellow-300">
              Items named: {namedItems.length}
            </div>
          </div>

          {/* Timer progress bar */}
          <div className="w-full h-2 bg-gray-700 rounded-full mb-4 overflow-hidden">
            <div 
              className={`h-full ${countdown <= 10 ? 'bg-red-500' : 'bg-yellow-500'} rounded-full timer-bar`}
              style={{ width: `${(countdown / 30) * 100}%` }}
            ></div>
          </div>

          {/* Input area */}
          <div className="mb-4">
            <div className="flex">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                className={`flex-grow p-2 border rounded-l bg-gray-800 text-white ${
                  validationResult && !validationResult.valid
                    ? "border-red-500"
                    : "border-gray-700"
                }`}
                placeholder={
                  gameMode === "actor_to_movies"
                    ? "Enter a movie name..."
                    : "Enter an actor name..."
                }
              />
              <button
                onClick={validateInput}
                className="bg-blue-600 text-white py-2 px-4 rounded-r hover:bg-blue-700 transition-colors"
              >
                Submit
              </button>
            </div>

            {validationResult && (
              <div
                className={`mt-2 p-2 rounded text-sm ${
                  validationResult.valid
                    ? "bg-green-900 text-green-200 border border-green-500"
                    : "bg-red-900 text-red-200 border border-red-500"
                }`}
              >
                {validationResult.message}
              </div>
            )}

            {showDidYouMean && didYouMeanSuggestion && (
              <div className="mt-2 p-3 rounded bg-yellow-900 border border-yellow-500">
                <p className="text-sm text-yellow-200 mb-2">
                  Did you mean: <span className="font-bold text-yellow-400">{didYouMeanSuggestion}</span>?
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={acceptSuggestion}
                    className="bg-green-500 text-white py-1 px-3 rounded flex items-center hover:bg-green-600 transition-colors"
                  >
                    <Check size={16} className="mr-1" /> Yes
                  </button>
                  <button
                    onClick={rejectSuggestion}
                    className="bg-red-500 text-white py-1 px-3 rounded flex items-center hover:bg-red-600 transition-colors"
                  >
                    <X size={16} className="mr-1" /> No
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Challenge buttons */}
          {gameState === "playing" && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-2 text-yellow-300">Challenge a player:</p>
              <div className="flex space-x-2">
                {players.map(
                  (player, index) =>
                    index !== currentPlayerIndex &&
                    !eliminatedPlayers[index] && (
                      <button
                        key={player.id}
                        onClick={() => issueChallenge(index)}
                        disabled={currentPlayer.challengesLeft <= 0}
                        className={`px-2 py-1 rounded text-sm ${
                          currentPlayer.challengesLeft > 0
                            ? `${player.color} text-white hover:opacity-90 transition-colors`
                            : "bg-gray-700 text-gray-500"
                        }`}
                      >
                        <div className="flex items-center">
                          <Flag size={12} className="mr-1" />
                          {player.character} {player.name}
                        </div>
                      </button>
                    )
                )}
              </div>
              <p className="text-xs text-yellow-200 mt-1">
                Challenges left: {currentPlayer.challengesLeft}/1
              </p>
            </div>
          )}

          {/* Items named */}
          <div>
            <p className="font-medium mb-2 text-yellow-300">Items named:</p>
            <div className="max-h-32 overflow-y-auto bg-gray-800 p-2 rounded border border-gray-700">
              {namedItems.length > 0 ? (
                <ul className="grid grid-cols-2 gap-1">
                  {namedItems.map((item, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-200">
                      {gameMode === "actor_to_movies" ? (
                        <Film size={14} className="mr-1 flex-shrink-0 text-yellow-400" />
                      ) : (
                        <User size={14} className="mr-1 flex-shrink-0 text-yellow-400" />
                      )}
                      <span className="truncate">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm text-center py-2">
                  No items named yet
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {gameState === "roundEnd" && !winner && (
        <div className="w-full bg-gray-900 rounded-lg p-4 shadow-lg shadow-black/50 mb-6 border-2 border-yellow-500 z-40">
          <h2 className="text-lg font-bold mb-3 text-center text-yellow-400">
            Round Complete!
          </h2>

          {lastCorrectPlayerIndex !== null && (
            <div className="mb-4 p-3 bg-green-900 rounded-lg text-center border border-green-600">
              <p className="font-medium text-green-200">
                {players[lastCorrectPlayerIndex].character} {players[lastCorrectPlayerIndex].name} wins this round!
              </p>
              <p className="text-sm mt-1 text-green-300">
                +1 point awarded. First to 3 points wins!
              </p>
            </div>
          )}

          {selectedItem && (
            <div className="flex items-center mb-4 bg-gray-800 p-3 rounded-lg w-full border border-yellow-600">
              <div className="w-16 h-20 bg-gray-900 rounded mr-3 overflow-hidden">
                <img
                  src={
                    gameMode === "actor_to_movies"
                      ? 'profile_path' in selectedItem ? selectedItem.profile_path : ""
                      : 'poster_path' in selectedItem ? selectedItem.poster_path : ""
                  }
                  alt={
                    gameMode === "actor_to_movies"
                      ? 'name' in selectedItem ? selectedItem.name : ""
                      : 'title' in selectedItem ? selectedItem.title : ""
                  }
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="font-bold text-lg text-yellow-300">
                  {gameMode === "actor_to_movies"
                    ? 'name' in selectedItem ? selectedItem.name : ""
                    : 'title' in selectedItem ? selectedItem.title : ""}
                </div>
                <div className="text-sm text-gray-300 mb-2">
                  {namedItems.length} items named
                </div>
                <div className="flex space-x-3">
                  {players.map((player) => (
                    <div key={player.id} className="flex items-center text-sm">
                      <div
                        className={`w-3 h-3 rounded-full ${player.color} mr-1`}
                      ></div>
                      <span className="text-white">{player.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={resetGame}
              className="bg-gray-700 text-white py-2 px-4 rounded hover:bg-gray-600 transition-colors"
            >
              Reset Game
            </button>

            <button
              onClick={startNewRound}
              className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
            >
              Next Round
            </button>
          </div>
        </div>
      )}

      {(gameState === "gameOver" || winner) && winner && (
        <div className="w-full bg-gray-900 rounded-lg p-6 shadow-lg shadow-black/50 mb-6 text-center border-2 border-yellow-500 z-40">
          <h2 className="text-xl font-bold mb-3 text-yellow-400">Game Over!</h2>

          <div className={`p-4 rounded-lg mb-6 ${winner.color} text-white`}>
            <div className="text-3xl font-bold mb-1">{winner.character} {winner.name} Wins!</div>
            <div className="text-sm">First to reach 3 points</div>
          </div>

          <div className="mb-6">
            <h3 className="font-bold mb-2 text-yellow-300">Final Scores:</h3>
            <div className="flex justify-around">
              {players.map((player) => (
                <div key={player.id} className="text-center">
                  <div
                    className={`w-10 h-10 rounded-full ${player.color} mx-auto mb-1 flex items-center justify-center text-white font-bold`}
                  >
                    {player.score}
                  </div>
                  <div className="text-sm text-yellow-100">{player.character} {player.name}</div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={resetGame}
            className="bg-blue-600 text-white py-2 px-4 rounded w-full hover:bg-blue-700 transition-colors"
          >
            Play Again
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-yellow-200 mt-2 z-40">
        <p>Denver Labs 2025</p>
        <p>
          Data provided by{" "}
          <a href="https://www.themoviedb.org" className="text-yellow-400 hover:underline">
            TMDB
          </a>
        </p>
      </div>
    </div>
  );
};

export default MovieMatch;
