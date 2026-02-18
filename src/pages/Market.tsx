import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import * as Api from '@/integrations/localserver/api';
import { apiBase } from '@/integrations/localserver';
import { Plus, MapPin } from 'lucide-react';
import { CreateCityModal } from '@/components/market/CreateCityModal';

interface City {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

const Market = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadCities = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase()}/api/cities?order=name:asc`);
      const items = await res.json();
      setCities(items || []);
    } catch (error) {
      console.error('Error loading cities:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare le città',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCities();
  }, [loadCities]);

  const handleCityCreated = () => {
    setIsCreateModalOpen(false);
    loadCities();
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Caricamento mercato...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/')}>
              ← Home
            </Button>
            <h1 className="text-2xl font-bold">Mercato</h1>
          </div>
          {isAdmin && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crea Città
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto p-4">
        <div className="text-center py-8">
          <h2 className="text-3xl font-bold mb-4">Benvenuto al Mercato</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Esplora le città e scopri i loro mercanti
          </p>
        </div>

        {cities.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nessuna città disponibile</h3>
            <p className="text-muted-foreground mb-4">
              {isAdmin 
                ? 'Crea la prima città per iniziare il mercato'
                : 'Le città saranno disponibili presto'}
            </p>
            {isAdmin && (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crea Prima Città
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cities.map((city) => (
              <Card 
                key={city.id} 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/market/city/${city.id}`)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    {city.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {city.description || 'Esplora questa città e i suoi mercanti'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <CreateCityModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCityCreated={handleCityCreated}
      />
    </div>
  );
};

export default Market;
