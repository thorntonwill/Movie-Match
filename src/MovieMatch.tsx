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
} from "lucide-react";

// Define interfaces for data structures
interface Player {
  id: number;
  name: string;
  score: number;
  color: string;
  challengesLeft: number;
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

// Maps for consecutive wrongs and eliminated players
interface PlayerMap {
  [key: number]: number | boolean;
}

// Custom timeout type for browser environment
type TimeoutRef = ReturnType<typeof setTimeout> | null;

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
      color: "bg-blue-500",
      challengesLeft: 1,
    },
    {
      id: 2,
      name: "Player 2",
      score: 0,
      color: "bg-red-500",
      challengesLeft: 1,
    },
    {
      id: 3,
      name: "Player 3",
      score: 0,
      color: "bg-green-500",
      challengesLeft: 1,
    },
  ]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [lastCorrectPlayerIndex, setLastCorrectPlayerIndex] = useState<number | null>(null);
  const [challengedPlayerIndex, setChallengedPlayerIndex] = useState<number | null>(null);
  // Note: This variable is used in the UI conditionally
  const [challengeStatus, setChallengeStatus] = useState<"success" | "failed" | null>(null);
  const [consecutiveWrongs, setConsecutiveWrongs] = useState<PlayerMap>({
    0: 0,
    1: 0,
    2: 0,
  });
  const [eliminatedPlayers, setEliminatedPlayers] = useState<PlayerMap>({
    0: false,
    1: false,
    2: false,
  });

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
    const substringMatches = validOptions.filter(
      (option) =>
        option.toLowerCase().includes(lowerInput) ||
        lowerInput.includes(option.toLowerCase())
    );

    if (substringMatches.length > 0) {
      substringMatches.sort(
        (a, b) =>
          Math.abs(a.length - input.length) - Math.abs(b.length - input.length)
      );
      return substringMatches[0];
    }

    let bestMatch = null;
    let bestDistance = Infinity;

    for (const option of validOptions) {
      const lowerOption = option.toLowerCase();
      if (
        lowerOption[0] === lowerInput[0] ||
        lowerOption[lowerOption.length - 1] ===
          lowerInput[lowerInput.length - 1]
      ) {
        const distance = levenshteinDistance(lowerInput, lowerOption);
        const maxLength = Math.max(lowerInput.length, lowerOption.length);
        const similarityThreshold = maxLength * 0.4;

        if (distance < similarityThreshold && distance < bestDistance) {
          bestDistance = distance;
          bestMatch = option;
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

  // Fetch popular people
  const fetchPopularPeople = async (): Promise<void> => {
    setSearchLoading(true);
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/person/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`
      );
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();

      const peopleWithBasicInfo = data.results.slice(0, 6).map((person: PersonResult) => ({
        ...person,
        profile_path: person.profile_path
          ? `${TMDB_IMAGE_BASE_URL}/w185${person.profile_path}`
          : `https://via.placeholder.com/185x278?text=${encodeURIComponent(
              person.name
            )}`,
      }));

      setSearchResults(peopleWithBasicInfo);
    } catch (error) {
      console.error("Error fetching popular people:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Fetch popular movies
  const fetchPopularMovies = async (): Promise<void> => {
    setSearchLoading(true);
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`
      );
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();

      const moviesWithBasicInfo = data.results.slice(0, 6).map((movie: MovieResult) => ({
        ...movie,
        poster_path: movie.poster_path
          ? `${TMDB_IMAGE_BASE_URL}/w185${movie.poster_path}`
          : `https://via.placeholder.com/185x278?text=${encodeURIComponent(
              movie.title
            )}`,
      }));

      setSearchResults(moviesWithBasicInfo);
    } catch (error) {
      console.error("Error fetching popular movies:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Search for people
  const searchPeople = async (query: string): Promise<PersonResult[]> => {
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

      const formattedResults = data.results.slice(0, 6).map((person: PersonResult) => ({
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
  const searchMovies = async (query: string): Promise<MovieResult[]> => {
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

      const formattedResults = data.results.slice(0, 6).map((movie: MovieResult) => ({
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
          ?.filter((movie: MovieResult) => movie.release_date)
          ?.sort((a: MovieResult, b: MovieResult) => (b.popularity || 0) - (a.popularity || 0))
          ?.slice(0, 30)
          ?.map((movie: MovieResult) => movie.title) || [];

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
          ?.sort((a: PersonResult, b: PersonResult) => (a as any).order - (b as any).order)
          ?.slice(0, 30)
          ?.map((actor: PersonResult) => actor.name) || [];

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
    // Increment consecutive wrong answers for this player
    const newConsecutiveWrongs = {
      ...consecutiveWrongs,
      [currentPlayerIndex]: (consecutiveWrongs[currentPlayerIndex] as number) + 1,
    };
    setConsecutiveWrongs(newConsecutiveWrongs);

    // Create appropriate message
    const wrongsRemaining =
      MAX_WRONG_ANSWERS - (newConsecutiveWrongs[currentPlayerIndex] as number);
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

    if ((newConsecutiveWrongs[currentPlayerIndex] as number) >= MAX_WRONG_ANSWERS) {
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

    while ((eliminatedPlayers[nextPlayerIndex] as boolean) && loopCount < players.length) {
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

    // Increment consecutive wrong answers for this player
    const newConsecutiveWrongs = {
      ...consecutiveWrongs,
      [currentPlayerIndex]: (consecutiveWrongs[currentPlayerIndex] as number) + 1,
    };
    setConsecutiveWrongs(newConsecutiveWrongs);

    // Check if player should be eliminated
    if ((newConsecutiveWrongs[currentPlayerIndex] as number) >= MAX_WRONG_ANSWERS) {
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
        MAX_WRONG_ANSWERS - (newConsecutiveWrongs[currentPlayerIndex] as number);
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
  const issueChallenge = (targetPlayerIndex: number): void => {
    // Check if current player has challenges left
    if (players[currentPlayerIndex].challengesLeft <= 0) {
      return;
    }

    // Update challenges left for current player
    const updatedPlayers = [...players];
    updatedPlayers[currentPlayerIndex].challengesLeft--;
    setPlayers(updatedPlayers);

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

        if (!detailedItem || detailedItem.movies.length < 5) {
          setValidationResult({
            valid: false,
            message:
              "This person doesn't have enough known movies. Please select another actor.",
          });
          return;
        }
      } else {
        detailedItem = await fetchMovieDetails(item.id);

        if (!detailedItem || detailedItem.actors.length < 5) {
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
        gameMode === "actor_to_movies" ? detailedItem.name : detailedItem.title
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

  return (
    <div className="flex flex-col items-center bg-gray-100 p-4 rounded-lg shadow-lg max-w-md mx-auto text-gray-800 min-h-screen">
      {/* Header */}
      <div className="w-full mb-4 text-center">
        <h1 className="text-2xl font-bold mb-2">Movie Match</h1>
        {gameState !== "landing" && (
          <p className="text-sm">
            {gameMode === "actor_to_movies"
              ? "Name movies starring this actor"
              : "Name actors starring in this movie"}
          </p>
        )}
      </div>

      {/* Player Scores */}
      {gameState !== "landing" && (
        <div className="flex justify-between w-full mb-4">
          {players.map((player, index) => (
            <div
              key={player.id}
              className={`flex flex-col items-center p-2 rounded-lg ${
                currentPlayerIndex === index &&
                (gameState === "playing" || gameState === "challenge")
                  ? `${player.color} text-white`
                  : challengedPlayerIndex === index && gameState === "challenge"
                  ? "bg-yellow-500 text-white"
                  : eliminatedPlayers[index]
                  ? "bg-gray-400 text-white opacity-60"
                  : "bg-gray-200"
              }`}
            >
              <User className="mb-1" size={20} />
              <div className="text-sm font-bold">
                {player.name}
                {eliminatedPlayers[index] && " (Out)"}
              </div>
              <div className="flex items-center mt-1">
                <Award size={16} />
                <span className="ml-1 text-lg font-bold">{player.score}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Game Screens */}
      {gameState === "landing" && (
        <div className="w-full bg-white rounded-lg p-6 shadow mb-6">
          <h2 className="text-xl font-bold mb-4 text-center">How to Play</h2>

          <div className="mb-6">
            <p className="mb-2">Choose a game mode:</p>
            <ul className="list-disc pl-5 mb-4">
              <li className="mb-2">
                <strong>Actor → Movies:</strong> Players take turns naming
                movies starring a specific actor
              </li>
              <li className="mb-2">
                <strong>Movie → Actors:</strong> Players take turns naming
                actors from a specific movie
              </li>
            </ul>
            <p className="mb-2">
              Each player has 30 seconds to name a valid item.
            </p>
            <p className="mb-2">
              Get 2 consecutive wrong answers and you're eliminated from the
              round.
            </p>
            <p className="mb-2">
              The last player standing gets 1 point. First to 3 points wins!
            </p>
            <p className="font-medium mt-3">Challenge Feature:</p>
            <p>
              Each player can issue one challenge per round to another player.
              The challenged player must name another valid item within 30
              seconds!
            </p>
          </div>

          <div className="flex flex-col space-y-3">
            <button
              onClick={selectActorToMovies}
              className="bg-blue-600 text-white py-3 px-4 rounded flex items-center justify-center"
            >
              <User size={18} className="mr-2" />
              Actor to Movies
            </button>

            <button
              onClick={selectMovieToActors}
              className="bg-purple-600 text-white py-3 px-4 rounded flex items-center justify-center"
            >
              <Film size={18} className="mr-2" />
              Movie to Actors
            </button>
          </div>
        </div>
      )}

      {gameState === "setup" && (
        <div className="w-full bg-white rounded-lg p-4 shadow mb-6">
          <h2 className="text-lg font-bold mb-3">
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
                className="flex-grow p-2 border rounded-l"
              />
              <button
                onClick={() => {
                  setShowDropdown(!showDropdown);
                  if (!showDropdown) {
                    performSearch(searchQuery);
                  }
                }}
                className="bg-gray-200 text-gray-800 py-2 px-3 rounded-r"
                disabled={searchLoading}
              >
                {searchLoading ? "..." : <Search size={18} />}
              </button>
            </div>

            {showDropdown && searchResults.length > 0 && (
              <div className="absolute w-full bg-white border rounded shadow-lg max-h-64 overflow-y-auto z-10 mt-1">
                {searchQuery.trim().length === 0 && (
                  <div className="p-2 bg-gray-100 text-sm font-medium border-b">
                    {gameMode === "actor_to_movies"
                      ? "Popular Actors"
                      : "Popular Movies"}
                  </div>
                )}

                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => selectSearchResult(item)}
                    className="flex items-center p-2 hover:bg-gray-100 cursor-pointer border-b"
                  >
                    <img
                      src={
                        gameMode === "actor_to_movies"
                          ? (item as PersonResult).profile_path
                          : (item as MovieResult).poster_path
                      }
                      alt={
                        gameMode === "actor_to_movies"
                          ? (item as PersonResult).name
                          : (item as MovieResult).title
                      }
                      className="w-12 h-16 object-cover rounded mr-3"
                    />
                    <div>
                      <div className="font-medium">
                        {gameMode === "actor_to_movies"
                          ? (item as PersonResult).name
                          : (item as MovieResult).title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {gameMode === "actor_to_movies"
                          ? `Known for: ${
                              (item as PersonResult).known_for_department || "Acting"
                            }`
                          : `Released: ${
                              (item as MovieResult).release_date
                                ? new Date((item as MovieResult).release_date || "").getFullYear()
                                : "Unknown"
                            }`}
                      </div>
                    </div>
                  </div>
                ))}

                {searchResults.length === 0 &&
                  searchQuery.trim().length > 0 && (
                    <div className="p-3 text-center text-gray-500">
                      No results found for "{searchQuery}"
                    </div>
                  )}
              </div>
            )}
          </div>

          {selectedItem && (
            <div className="flex items-center mb-4 bg-gray-100 p-3 rounded-lg w-full">
              <img
                src={
                  gameMode === "actor_to_movies"
                    ? (selectedItem as PersonDetails).profile_path
                    : (selectedItem as MovieDetails).poster_path
                }
                alt={
                  gameMode === "actor_to_movies"
                    ? (selectedItem as PersonDetails).name
                    : (selectedItem as MovieDetails).title
                }
                className="w-16 h-20 object-cover rounded mr-3"
              />
              <div>
                <div className="font-bold text-lg">
                  {gameMode === "actor_to_movies"
                    ? "name" in selectedItem ? selectedItem.name : ""
                    : "title" in selectedItem ? selectedItem.title : ""}
                </div>
                <div className="text-sm text-gray-600">
                  {gameMode === "actor_to_movies"
                    ? `${(selectedItem as PersonDetails).movies.length} movies found for this actor`
                    : `${(selectedItem as MovieDetails).actors.length} actors found in this movie`}
                </div>
              </div>
            </div>
          )}

          {validationResult && (
            <div
              className={`mb-4 p-2 rounded text-sm ${
                validationResult.valid
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {validationResult.message}
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={startNewRound}
              className="bg-gray-300 text-gray-800 py-2 px-4 rounded"
            >
              Back
            </button>

            <button
              onClick={startGame}
              disabled={!selectedItem}
              className="bg-green-600 text-white py-2 px-4 rounded disabled:bg-gray-400 flex items-center"
            >
              <Play size={18} className="mr-2" />
              Start Game
            </button>
          </div>
        </div>
      )}

      {(gameState === "playing" || gameState === "challenge") && selectedItem && (
        <div className="w-full bg-white rounded-lg p-4 shadow mb-6">
          {/* Selected item display */}
          <div className="flex items-center mb-4 bg-gray-100 p-3 rounded-lg w-full">
            <img
              src={
                gameMode === "actor_to_movies"
                  ? (selectedItem as PersonDetails).profile_path
                  : (selectedItem as MovieDetails).poster_path
              }
              alt={
                gameMode === "actor_to_movies"
                  ? "name" in selectedItem ? selectedItem.name : ""
                  : "title" in selectedItem ? selectedItem.title : ""
              }
              className="w-16 h-20 object-cover rounded mr-3"
            />
            <div className="flex-grow">
              <div className="font-bold text-lg">
                {gameMode === "actor_to_movies"
                  ? "name" in selectedItem ? selectedItem.name : ""
                  : "title" in selectedItem ? selectedItem.title : ""
              </div>
              <div className="text-sm text-gray-600">
                {gameMode === "actor_to_movies"
                  ? "Name a movie starring this actor"
                  : "Name an actor in this movie"}
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
                  {currentPlayer.name}'s Turn
                </>
              ) : (
                <>{currentPlayer.name}'s Turn</>
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
                      i < (consecutiveWrongs[currentPlayerIndex] as number)
                        ? "bg-red-300"
                        : "bg-white bg-opacity-30"
                    }`}
                  ></span>
                ))}
              </div>
            </div>
          </div>

          {/* Timer */}
          <div className="flex justify-between mb-4">
            <div className="flex items-center">
              <Clock size={20} className="mr-2" />
              <div
                className={`font-bold ${countdown <= 10 ? "text-red-500" : ""}`}
              >
                {countdown}s
              </div>
            </div>

            {/* Items named count */}
            <div className="text-sm font-medium">
              Items named: {namedItems.length}
            </div>
          </div>

          {/* Input area */}
          <div className="mb-4">
            <div className="flex">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                className={`flex-grow p-2 border rounded-l ${
                  validationResult && !validationResult.valid
                    ? "border-red-500"
                    : ""
                }`}
                placeholder={
                  gameMode === "actor_to_movies"
                    ? "Enter a movie name..."
                    : "Enter an actor name..."
                }
              />
              <button
                onClick={validateInput}
                className="bg-blue-600 text-white py-2 px-4 rounded-r"
              >
                Submit
              </button>
            </div>

            {validationResult && (
              <div
                className={`mt-2 p-2 rounded text-sm ${
                  validationResult.valid
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {validationResult.message}
              </div>
            )}

            {showDidYouMean && (
              <div className="mt-2 p-3 rounded bg-yellow-100 border border-yellow-300">
                <p className="font-medium mb-2">
                  Did you mean:{" "}
                  <span className="font-bold">{didYouMeanSuggestion}</span>?
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Your entry: "{inputValue}"
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={acceptSuggestion}
                    className="bg-green-500 text-white py-1 px-3 rounded flex items-center"
                  >
                    <Check size={16} className="mr-1" /> Yes
                  </button>
                  <button
                    onClick={rejectSuggestion}
                    className="bg-red-500 text-white py-1 px-3 rounded flex items-center"
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
              <p className="text-sm font-medium mb-2">Challenge a player:</p>
              <div className="flex space-x-2">
                {players.map(
                  (player, index) =>
                    index !== currentPlayerIndex &&
                    !(eliminatedPlayers[index] as boolean) && (
                      <button
                        key={player.id}
                        onClick={() => issueChallenge(index)}
                        disabled={currentPlayer.challengesLeft <= 0}
                        className={`px-2 py-1 rounded text-sm ${
                          currentPlayer.challengesLeft > 0
                            ? `${player.color} text-white`
                            : "bg-gray-300 text-gray-500"
                        }`}
                      >
                        <div className="flex items-center">
                          <Flag size={12} className="mr-1" />
                          {player.name}
                        </div>
                      </button>
                    )
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Challenges left: {currentPlayer.challengesLeft}/1
              </p>
            </div>
          )}

          {/* Items named */}
          <div>
            <p className="font-medium mb-2">Items named:</p>
            <div className="max-h-32 overflow-y-auto bg-gray-100 p-2 rounded">
              {namedItems.length > 0 ? (
                <ul className="grid grid-cols-2 gap-1">
                  {namedItems.map((item, index) => (
                    <li key={index} className="flex items-center text-sm">
                      {gameMode === "actor_to_movies" ? (
                        <Film size={14} className="mr-1 flex-shrink-0" />
                      ) : (
                        <User size={14} className="mr-1 flex-shrink-0" />
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
        <div className="w-full bg-white rounded-lg p-4 shadow mb-6">
          <h2 className="text-lg font-bold mb-3 text-center">
            Round Complete!
          </h2>

          {lastCorrectPlayerIndex !== null && (
            <div className="mb-4 p-3 bg-green-100 rounded-lg text-center">
              <p className="font-medium">
                {players[lastCorrectPlayerIndex].name} wins this round!
              </p>
              <p className="text-sm mt-1">
                +1 point awarded. First to 3 points wins!
              </p>
            </div>
          )}

          {selectedItem && (
            <div className="flex items-center mb-4 bg-gray-100 p-3 rounded-lg w-full">
              <img
                src={
                  gameMode === "actor_to_movies"
                    ? (selectedItem as PersonDetails).profile_path
                    : (selectedItem as MovieDetails).poster_path
                }
                alt={
                  gameMode === "actor_to_movies"
                    ? "name" in selectedItem ? selectedItem.name : ""
                    : "title" in selectedItem ? selectedItem.title : ""
                }
                className="w-16 h-20 object-cover rounded mr-3"
              />
              <div>
                <div className="font-bold text-lg">
                  {gameMode === "actor_to_movies"
                    ? "name" in selectedItem ? selectedItem.name : ""
                    : "title" in selectedItem ? selectedItem.title : ""}
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {namedItems.length} items named
                </div>
                <div className="flex space-x-3">
                  {players.map((player) => (
                    <div key={player.id} className="flex items-center text-sm">
                      <div
                        className={`w-3 h-3 rounded-full ${player.color} mr-1`}
                      ></div>
                      {player.score}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={resetGame}
              className="bg-gray-300 text-gray-800 py-2 px-4 rounded"
            >
              Reset Game
            </button>

            <button
              onClick={startNewRound}
              className="bg-blue-600 text-white py-2 px-4 rounded"
            >
              Next Round
            </button>
          </div>
        </div>
      )}

      {(gameState === "gameOver" || winner) && winner && (
        <div className="w-full bg-white rounded-lg p-6 shadow mb-6 text-center">
          <h2 className="text-xl font-bold mb-3">Game Over!</h2>

          <div className={`p-4 rounded-lg mb-6 ${winner.color} text-white`}>
            <div className="text-3xl font-bold mb-1">{winner.name} Wins!</div>
            <div className="text-sm">First to reach 3 points</div>
          </div>

          <div className="mb-6">
            <h3 className="font-bold mb-2">Final Scores:</h3>
            <div className="flex justify-around">
              {players.map((player) => (
                <div key={player.id} className="text-center">
                  <div
                    className={`w-8 h-8 rounded-full ${player.color} mx-auto mb-1 flex items-center justify-center text-white font-bold`}
                  >
                    {player.score}
                  </div>
                  <div className="text-sm">{player.name}</div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={resetGame}
            className="bg-blue-600 text-white py-2 px-4 rounded w-full"
          >
            Play Again
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 mt-2">
        <p>MovieMatch Game - Developed by Will Thornton & Claude </p>
        <p>
          Data provided by{" "}
          <a href="https://www.themoviedb.org" className="text-blue-500">
            TMDB
          </a>
        </p>
      </div>
    </div>
  );
};

export default MovieMatch;
