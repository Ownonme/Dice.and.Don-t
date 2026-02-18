import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Edit } from 'lucide-react';
import DiceTypeSelector from './DiceTypeSelector';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface EnemySectionProps {
  enemies: any[];
  selectedEnemyId: string;
  diceType: string;
  onEnemySelect: (id: string) => void;
  onDiceTypeChange: (type: string) => void;
  onOpenAddEnemyModal: () => void;
  onEnemyDiceRoll: () => void; // Cambiato da (enemyId: string, diceType: DiceType) => void
  onDeleteEnemy: (enemyId: string) => void;
  onOpenEnemyModificationModal: () => void;
  onEnemyHealthChange: (value: string) => void;
  onEnemyArmorChange: (value: string) => void;
  onEnemyActionPointsChange: (value: string) => void;
  enemyUpdated?: boolean;
}

const EnemySection: React.FC<EnemySectionProps> = ({
  enemies,
  selectedEnemyId,
  diceType,
  onEnemySelect,
  onDiceTypeChange,
  onOpenAddEnemyModal,
  onEnemyDiceRoll,
  onDeleteEnemy,
  onOpenEnemyModificationModal,
  onEnemyHealthChange,
  onEnemyArmorChange,
  onEnemyActionPointsChange,
  enemyUpdated
}) => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = React.useState(false);
  
  const selectedEnemy = enemies.find(e => e.id === selectedEnemyId);

  React.useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (error) {
          console.error('Error checking admin status:', error);
          return;
        }

        setIsAdmin(!!data);
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };

    checkAdminStatus();
  }, [user]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Casella 1 - Display Avversario */}
      <Card>
        <CardHeader>
          <CardTitle>Avversario Selezionato</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Nel componente EnemySection, modifica la visualizzazione dei valori */}
          {selectedEnemyId && selectedEnemy ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Avversario: {selectedEnemy.name}</p>
                {enemyUpdated && (<span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-800 border border-green-200">Aggiornato</span>)}
              </div>
              
              {/* Salute */}
              <div className="space-y-1">
                <Label htmlFor="enemy-health" className="text-xs">Salute</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="enemy-health"
                    type="number"
                    value={selectedEnemy.enemy_current_hp ?? selectedEnemy.enemy_max_hp}
                    onChange={(e) => onEnemyHealthChange(e.target.value)}
                    className="w-16 h-8 text-xs"
                    min="0"
                    max={selectedEnemy.enemy_max_hp}
                  />
                  <span className="text-xs text-muted-foreground">/ {selectedEnemy.enemy_max_hp}</span>
                </div>
              </div>
              
              {/* Armatura */}
              <div className="space-y-1">
                <Label htmlFor="enemy-armor" className="text-xs">Armatura</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="enemy-armor"
                    type="number"
                    value={selectedEnemy.enemy_current_armor ?? selectedEnemy.enemy_max_armor}
                    onChange={(e) => onEnemyArmorChange(e.target.value)}
                    className="w-16 h-8 text-xs"
                    min="0"
                    max={selectedEnemy.enemy_max_armor}
                  />
                  <span className="text-xs text-muted-foreground">/ {selectedEnemy.enemy_max_armor}</span>
                </div>
              </div>
              
              {/* Punti Azione */}
              <div className="space-y-1">
                <Label htmlFor="enemy-pa" className="text-xs">Punti Azione</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="enemy-pa"
                    type="number"
                    value={selectedEnemy.enemy_current_pa ?? selectedEnemy.enemy_max_pa}
                    onChange={(e) => onEnemyActionPointsChange(e.target.value)}
                    className="w-16 h-8 text-xs"
                    min="0"
                    max={selectedEnemy.enemy_max_pa}
                  />
                  <span className="text-xs text-muted-foreground">/ {selectedEnemy.enemy_max_pa}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nessun avversario selezionato</p>
          )}
        </CardContent>
      </Card>
      
      {/* Casella 2 - Aggiungi Nemico */}
      <Card>
        <CardHeader>
          <CardTitle>Gestione Nemici</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={onOpenAddEnemyModal}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Aggiungi Nemico
          </Button>
          
          {enemies.length > 0 && (
            <Select value={selectedEnemyId} onValueChange={onEnemySelect}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona nemico" />
              </SelectTrigger>
              <SelectContent>
                {enemies.map((enemy) => (
                  <SelectItem key={enemy.id} value={enemy.id}>
                    {enemy.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {/* Pulsante Elimina Nemico (solo per admin) */}
          {isAdmin && selectedEnemyId && (
            <Button 
              onClick={() => onDeleteEnemy(selectedEnemyId)}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Elimina Nemico
            </Button>
          )}
        </CardContent>
      </Card>
      
      {/* Casella 3 - Scelta Dado Avversario */}
      <Card>
        <CardHeader>
          <CardTitle>Dado Avversario</CardTitle>
        </CardHeader>
        <CardContent>
          <DiceTypeSelector
            diceType={diceType}
            onDiceTypeChange={onDiceTypeChange}
          />
        </CardContent>
      </Card>
      
      {/* Casella 4 - Lancio Dado Avversario */}
      <Card>
        <CardHeader>
          <CardTitle>Lancio Avversario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            onClick={() => {}}
            disabled
            className="w-full"
            variant="secondary"
            title="Lancio nemico temporaneamente disabilitato"
          >
            Lancio disabilitato
          </Button>
          
          {/* Pulsante Modifica Diretta */}
          {selectedEnemyId && (
            <Button 
              onClick={onOpenEnemyModificationModal}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Edit className="h-4 w-4 mr-2" />
              Modifica Diretta
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnemySection;
