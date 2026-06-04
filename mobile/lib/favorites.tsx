import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { api } from "./api";
import { useAuth } from "./auth";

export interface FavoriteAgent {
  id: string;
  name: string;
  photo: string | null;
  bio?: string | null;
  specialties?: string[] | null;
  serviceAreas?: string[] | null;
  languages?: string[] | null;
  rating?: number | null;
  reviewCount?: number | null;
  transactionCount?: number | null;
  avgDaysOnMarket?: number | null;
  saleToListRatio?: number | null;
  yearsExperience?: number | null;
  priceRangeMin?: number | null;
  priceRangeMax?: number | null;
  isApproved?: boolean;
  licenseNumber?: string | null;
}

interface FavoritesContextValue {
  favorites: FavoriteAgent[];
  favoriteIds: Set<string>;
  isFavorite: (agentId: string) => boolean;
  toggleFavorite: (agent: FavoriteAgent) => Promise<void>;
  refresh: () => Promise<void>;
  loading: boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteAgent[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get<FavoriteAgent[]>("/api/favorites");
      setFavorites(data);
    } catch {
      // keep last-known state on failure
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const favoriteIds = new Set(favorites.map((a) => a.id));

  const isFavorite = useCallback(
    (agentId: string) => favorites.some((a) => a.id === agentId),
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (agent: FavoriteAgent) => {
      const currentlyFav = favorites.some((a) => a.id === agent.id);
      // Optimistic update
      if (currentlyFav) {
        setFavorites((prev) => prev.filter((a) => a.id !== agent.id));
        try {
          await api.del(`/api/favorites/${agent.id}`);
        } catch {
          setFavorites((prev) => [agent, ...prev]); // revert
        }
      } else {
        setFavorites((prev) => [agent, ...prev]);
        try {
          await api.post("/api/favorites", { agentId: agent.id });
        } catch {
          setFavorites((prev) => prev.filter((a) => a.id !== agent.id)); // revert
        }
      }
    },
    [favorites]
  );

  return (
    <FavoritesContext.Provider
      value={{ favorites, favoriteIds, isFavorite, toggleFavorite, refresh, loading }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within a FavoritesProvider");
  return ctx;
}
