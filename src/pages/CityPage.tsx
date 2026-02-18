import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiBase } from '@/integrations/localserver';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { CreateShopModal } from '../components/market/CreateShopModal';
import { toast } from '../hooks/use-toast';
import { ArrowLeft, Plus, Store } from 'lucide-react';

interface Shop {
  id: string;
  name: string;
  description: string;
  category: 'weapons' | 'armor' | 'potions' | 'services' | 'general';
  created_at: string;
}

interface City {
  id: string;
  name: string;
  description: string;
}

const CATEGORY_LABELS = {
  weapons: 'Armi',
  armor: 'Armature',
  potions: 'Pozioni',
  services: 'Servizi',
  general: 'Generale'
};

const CATEGORY_ICONS = {
  weapons: '⚔️',
  armor: '🛡️',
  potions: '🧪',
  services: '🔧',
  general: '📦'
};

export default function CityPage() {
  const { cityId } = useParams<{ cityId: string }>();
  const { isAdmin } = useAuth();
  const [city, setCity] = useState<City | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchCityAndShops = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch city details
      const cityRes = await fetch(`${apiBase()}/api/cities?eq_id=${cityId}`);
      const cityArr = await cityRes.json();
      const cityData = cityArr?.[0] || null;

      setCity(cityData);

      // Fetch shops in this city
      const shopsRes = await fetch(`${apiBase()}/api/shops?eq_city_id=${cityId}&order=name:asc`);
      const shopsData = await shopsRes.json();

      setShops(shopsData || []);
    } catch (error) {
      console.error('Error fetching city and shops:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati della città",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [cityId]);

  useEffect(() => {
    if (cityId) {
      fetchCityAndShops();
    }
  }, [cityId, fetchCityAndShops]);

  const handleShopCreated = () => {
    fetchCityAndShops();
    setShowCreateModal(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Caricamento...</div>
        </div>
      </div>
    );
  }

  if (!city) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">Città non trovata</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/market">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna al Mercato
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{city.name}</h1>
            <p className="text-muted-foreground">{city.description}</p>
          </div>
        </div>
        
        {isAdmin && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Aggiungi Negozio
          </Button>
        )}
      </div>

      {/* Shops Grid */}
      {shops.length === 0 ? (
        <div className="text-center py-12">
          <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nessun negozio disponibile</h3>
          <p className="text-muted-foreground">
            {isAdmin 
              ? "Aggiungi il primo negozio a questa città" 
              : "Non ci sono ancora negozi in questa città"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shops.map((shop) => (
            <Link key={shop.id} to={`/market/city/${cityId}/shop/${shop.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">{CATEGORY_ICONS[shop.category]}</span>
                    {shop.name}
                  </CardTitle>
                  <CardDescription>
                    {CATEGORY_LABELS[shop.category]}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{shop.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create Shop Modal */}
      {showCreateModal && (
        <CreateShopModal
          cityId={cityId!}
          onClose={() => setShowCreateModal(false)}
          onShopCreated={handleShopCreated}
        />
      )}
    </div>
  );
}
