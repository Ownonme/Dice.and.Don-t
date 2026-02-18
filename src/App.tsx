import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import { AuthContext, type AuthContextType, type User } from "@/hooks/useAuth";
import { Theme, ThemeContext } from "@/hooks/useTheme";
import * as Api from "@/integrations/localserver/api";
import { isLocalDb } from "@/integrations/localdb";
import { useToast } from "@/hooks/use-toast";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Character from "./pages/Character";
import MagicLibrary from "./pages/MagicLibrary";
import NotFound from "./pages/NotFound";
import CharacterSelectorPage from "./pages/CharacterSelectorPage";
import { AbilityLibrary } from './pages/AbilityLibrary';
import Market from './pages/Market';
import CityPage from './pages/CityPage';
import ShopPage from './pages/ShopPage';
import CollectedItems from './pages/CollectedItems';
import AdminPurchaseHistory from './pages/AdminPurchaseHistory';
import AdminConsole from './pages/AdminConsole';
import GlossaryPage from '@/pages/GlossaryPage';
import GlossarySectionPage from '@/pages/GlossarySectionPage';
import GlossaryEntryDetailPage from '@/pages/GlossaryEntryDetailPage';
import UpdatePassword from '@/pages/UpdatePassword';
import DiaryIndex from './pages/DiaryIndex';
import DiaryReader from './pages/DiaryReader';
import DiaryEditor from './pages/DiaryEditor';
import DiceDashboard from './pages/DiceDashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 300_000,
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
    },
  },
});

const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('app-theme') as Theme;
    return savedTheme || 'classic';
  });

  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    document.documentElement.classList.remove('classic', 'gold-black');
    document.documentElement.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'classic' ? 'gold-black' : 'classic');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem('LOCAL_AUTH_TOKEN');
    if (token) {
      Api.me(token)
        .then(({ user: u }) => {
          setUser({ id: u.id, email: u.email });
          setIsAdmin(!!u.isAdmin);
        })
        .catch(() => {
          localStorage.removeItem('LOCAL_AUTH_TOKEN');
        })
        .finally(() => setIsLoading(false));
      return;
    }

    if (isLocalDb()) {
      const localUser = { id: 'local-user', email: 'local@offline' } as User;
      setUser(localUser);
      setIsAdmin(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    try {
      const { token, user: u } = await Api.login(email, password);
      localStorage.setItem('LOCAL_AUTH_TOKEN', token);
      setUser({ id: u.id, email: u.email });
      setIsAdmin(!!u.isAdmin);
      toast({ title: 'Benvenuto', description: 'Accesso eseguito con successo' });
      return;
    } catch (err) {
      console.error('Error signing in with password:', err);
      toast({
        title: "Errore di accesso",
        description: String((err as any)?.message || "Si è verificato un errore durante l'accesso"),
        variant: "destructive",
      });
    }
  };

  const signUp = async (email: string, password: string, username?: string) => {
    try {
      const { token, user: u } = await Api.signup(email, password, username);
      localStorage.setItem('LOCAL_AUTH_TOKEN', token);
      setUser({ id: u.id, email: u.email });
      setIsAdmin(!!u.isAdmin);
      toast({ title: 'Registrazione completata', description: 'Account creato' });
      return;
    } catch (err) {
      console.error('Error signing up:', err);
      toast({
        title: "Errore di registrazione",
        description: "Si è verificato un errore durante la registrazione",
        variant: "destructive",
      });
    }
  };

  const resendConfirmationEmail = async (_email: string) => {
    try {
      toast({ title: 'Non necessario', description: 'Non serve conferma email' });
    } catch (err) {
      console.error('Error resending confirmation email:', err);
      toast({
        title: "Errore invio conferma",
        description: "Si è verificato un errore durante l'invio dell'email",
        variant: "destructive",
      });
    }
  };

  const resetPassword = async (_email: string) => {
    try {
      toast({ title: 'Non implementato', description: 'Usa cambio password interno' });
    } catch (err) {
      console.error('Error sending reset password email:', err);
      toast({
        title: "Errore reset password",
        description: "Si è verificato un errore durante l'invio dell'email",
        variant: "destructive",
      });
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem('LOCAL_AUTH_TOKEN');
      setUser(null);
      setIsAdmin(false);
      toast({ title: 'Disconnesso', description: 'Sessione chiusa' });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value: AuthContextType = {
    user,
    session: null,
    isLoading,
    signInWithPassword,
    signUp,
    resendConfirmationEmail,
    resetPassword,
    signOut,
    isAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/update-password" element={<UpdatePassword />} />
              <Route path="/character" element={<CharacterSelectorPage />} />
              <Route path="/character/new" element={<Character />} />
              <Route path="/character/:characterId" element={<Character />} />
              <Route path="/dice" element={<Navigate to="/dice-dashboard" replace />} />
              <Route path="/dice-dashboard" element={<DiceDashboard />} />
              <Route path="/collected-items" element={<CollectedItems />} />
              <Route path="/ability-library" element={<AbilityLibrary />} />
              <Route path="/magic-library" element={<MagicLibrary />} />
              <Route path="/market" element={<Market />} />
              <Route path="/market/city/:cityId" element={<CityPage />} />
              <Route path="/market/city/:cityId/shop/:shopId" element={<ShopPage />} />
              <Route path="/admin/purchase-history" element={<AdminPurchaseHistory />} />
              <Route path="/admin/console" element={<AdminConsole />} />
              <Route path="/glossary" element={<GlossaryPage />} />
              <Route path="/glossary/section/:sectionId" element={<GlossarySectionPage />} />
              <Route path="/glossary/entry/:entryId" element={<GlossaryEntryDetailPage />} />
              <Route path="/diary" element={<DiaryIndex />} />
              <Route path="/diary/:diaryId/read" element={<DiaryReader />} />
              <Route path="/diary/:diaryId/edit" element={<DiaryEditor />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
