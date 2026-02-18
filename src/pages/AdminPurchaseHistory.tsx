import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from '../hooks/use-toast';
import { Search, Download, Calendar, User, ShoppingBag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface PurchaseHistoryItem {
  id: string;
  user_id: string;
  character_id: string;
  items: any[];
  total_bronzo: number;
  total_argento: number;
  total_oro: number;
  total_rosse: number;
  total_bianche: number;
  created_at: string;
  profiles?: {
    display_name: string;
  };
  characters?: {
    name: string;
  };
}

export default function AdminPurchaseHistory() {
  const { isAdmin, user } = useAuth();
  const [purchases, setPurchases] = useState<PurchaseHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'user' | 'total'>('date');
  const [filterPeriod, setFilterPeriod] = useState<'all' | '7d' | '30d' | '90d'>('all');

  const fetchPurchaseHistory = useCallback(async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('purchase_history')
        .select(`
          *,
          profiles!purchase_history_user_id_fkey(display_name),
          characters!purchase_history_character_id_fkey(name)
        `)
        .order('created_at', { ascending: false });

      // Applica filtro periodo
      if (filterPeriod !== 'all') {
        const days = parseInt(filterPeriod.replace('d', ''));
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - days);
        query = query.gte('created_at', dateFrom.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching purchase history:', error);
        toast({
          title: "Errore",
          description: "Impossibile caricare lo storico acquisti",
          variant: "destructive"
        });
        return;
      }

      setPurchases(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il caricamento",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [filterPeriod]);

  useEffect(() => {
    if (!isAdmin) {
      toast({
        title: "Accesso negato",
        description: "Non hai i permessi per accedere a questa pagina",
        variant: "destructive"
      });
      return;
    }
    void fetchPurchaseHistory();
  }, [isAdmin, fetchPurchaseHistory]);

  const formatCurrency = (purchase: PurchaseHistoryItem) => {
    const parts = [];
    if (purchase.total_bianche > 0) parts.push(`${purchase.total_bianche} Bianche`);
    if (purchase.total_rosse > 0) parts.push(`${purchase.total_rosse} Rosse`);
    if (purchase.total_oro > 0) parts.push(`${purchase.total_oro} Oro`);
    if (purchase.total_argento > 0) parts.push(`${purchase.total_argento} Argento`);
    if (purchase.total_bronzo > 0) parts.push(`${purchase.total_bronzo} Bronzo`);
    return parts.join(', ') || '0 Bronzo';
  };

  const getTotalValue = (purchase: PurchaseHistoryItem) => {
    return purchase.total_bronzo + 
           (purchase.total_argento * 100) + 
           (purchase.total_oro * 10000) + 
           (purchase.total_rosse * 1000000) + 
           (purchase.total_bianche * 100000000);
  };

  const filteredPurchases = purchases
    .filter(purchase => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        purchase.profiles?.display_name?.toLowerCase().includes(searchLower) ||
        purchase.characters?.name?.toLowerCase().includes(searchLower) ||
        purchase.items.some(item => item.name?.toLowerCase().includes(searchLower))
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'user':
          return (a.profiles?.display_name || '').localeCompare(b.profiles?.display_name || '');
        case 'total':
          return getTotalValue(b) - getTotalValue(a);
        case 'date':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const exportToCSV = () => {
    const csvContent = [
      ['Data', 'Utente', 'Personaggio', 'Oggetti', 'Totale', 'ID Transazione'].join(','),
      ...filteredPurchases.map(purchase => [
        new Date(purchase.created_at).toLocaleDateString('it-IT'),
        purchase.profiles?.display_name || 'N/A',
        purchase.characters?.name || 'N/A',
        purchase.items.length,
        formatCurrency(purchase),
        purchase.id
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `storico_acquisti_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Accesso Negato</h2>
              <p className="text-muted-foreground">Non hai i permessi per accedere a questa pagina.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Storico Acquisti Admin</h1>
          <p className="text-muted-foreground">Visualizza e gestisci tutti gli acquisti effettuati dagli utenti</p>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Esporta CSV
        </Button>
      </div>

      {/* Filtri e Ricerca */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtri e Ricerca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Cerca</label>
              <Input
                placeholder="Cerca per utente, personaggio o oggetto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Ordina per</label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Data (più recente)</SelectItem>
                  <SelectItem value="user">Utente (A-Z)</SelectItem>
                  <SelectItem value="total">Valore totale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Periodo</label>
              <Select value={filterPeriod} onValueChange={(value: any) => setFilterPeriod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="7d">Ultimi 7 giorni</SelectItem>
                  <SelectItem value="30d">Ultimi 30 giorni</SelectItem>
                  <SelectItem value="90d">Ultimi 90 giorni</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiche Rapide */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Totale Acquisti</p>
                <p className="text-2xl font-bold">{filteredPurchases.length}</p>
              </div>
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Utenti Unici</p>
                <p className="text-2xl font-bold">
                  {new Set(filteredPurchases.map(p => p.user_id)).size}
                </p>
              </div>
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Oggetti Venduti</p>
                <p className="text-2xl font-bold">
                  {filteredPurchases.reduce((sum, p) => sum + p.items.length, 0)}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valore Totale</p>
                <p className="text-lg font-bold">
                  {filteredPurchases.reduce((sum, p) => sum + getTotalValue(p), 0).toLocaleString()} Bronzo
                </p>
              </div>
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista Acquisti */}
      <Card>
        <CardHeader>
          <CardTitle>Storico Acquisti</CardTitle>
          <CardDescription>
            {filteredPurchases.length} acquisti trovati
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p>Caricamento...</p>
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nessun acquisto trovato</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPurchases.map((purchase) => (
                <Card key={purchase.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Utente</p>
                        <p className="font-medium">{purchase.profiles?.display_name || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">
                          Personaggio: {purchase.characters?.name || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Data</p>
                        <p className="font-medium">
                          {new Date(purchase.created_at).toLocaleDateString('it-IT')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(purchase.created_at), { 
                            addSuffix: true, 
                            locale: it 
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Oggetti</p>
                        <div className="flex flex-wrap gap-1">
                          {purchase.items.slice(0, 3).map((item, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {item.name} {item.quantity > 1 && `(${item.quantity})`}
                            </Badge>
                          ))}
                          {purchase.items.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{purchase.items.length - 3} altri
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Totale</p>
                        <p className="font-bold text-green-600">
                          {formatCurrency(purchase)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ID: {purchase.id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
