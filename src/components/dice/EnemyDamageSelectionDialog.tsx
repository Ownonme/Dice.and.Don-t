import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EnemyDamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  enemy: any;
  onDamageRoll: (damageType: string, selectedItem: any) => void;
}

const EnemyDamageSelectionDialog: React.FC<EnemyDamageSelectionDialogProps> = ({
  isOpen,
  onClose,
  enemy,
  onDamageRoll
}) => {
  const [damageType, setDamageType] = useState<string>('');
  const [selectedWeapon, setSelectedWeapon] = useState<any>(null);
  const [selectedWeaponDamageSet, setSelectedWeaponDamageSet] = useState<any>(null);
  const [selectedSpell, setSelectedSpell] = useState<any>(null);
  const [selectedAbility, setSelectedAbility] = useState<any>(null);
  const [weaponDamageType, setWeaponDamageType] = useState<string>('leggero');

  const enemySpellsSorted = useMemo(() => {
    try {
      const list = Array.isArray(enemy?.enemy_spells) ? enemy.enemy_spells : [];
      return [...list].sort((a: any, b: any) => String(a?.name || '').localeCompare(String(b?.name || ''), 'it', { sensitivity: 'base' }));
    } catch { return Array.isArray(enemy?.enemy_spells) ? enemy.enemy_spells : []; }
  }, [enemy?.enemy_spells]);

  const handleRoll = () => {
    let selectedItem = null;
    
    if (damageType === 'weapon' && selectedWeapon) {
      selectedItem = { ...selectedWeapon, damageType: weaponDamageType, damageSet: selectedWeaponDamageSet || null };
    } else if (damageType === 'spell' && selectedSpell) {
      selectedItem = selectedSpell;
    } else if (damageType === 'ability' && selectedAbility) {
      selectedItem = selectedAbility;
    }
    
    if (selectedItem) {
      onDamageRoll(damageType, selectedItem);
      onClose();
    }
  };

  const resetDialog = () => {
    setDamageType('');
    setSelectedWeapon(null);
    setSelectedWeaponDamageSet(null);
    setSelectedSpell(null);
    setSelectedAbility(null);
    setWeaponDamageType('leggero');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        resetDialog();
        onClose();
      }
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Seleziona Tipo di Danno - {enemy?.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Tipo di Danno</label>
            <Select value={damageType} onValueChange={setDamageType}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona tipo di danno" />
              </SelectTrigger>
              <SelectContent>
                {enemy?.enemy_weapons?.length > 0 && (
                  <SelectItem value="weapon">Arma</SelectItem>
                )}
                {enemy?.enemy_spells?.length > 0 && (
                  <SelectItem value="spell">Magia</SelectItem>
                )}
                {enemy?.enemy_abilities?.length > 0 && (
                  <SelectItem value="ability">Abilità</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {damageType === 'weapon' && (
            <>
              <div>
                <label className="text-sm font-medium">Arma</label>
                <Select value={selectedWeapon?.name || ''} onValueChange={(value) => {
                  const weapon = enemy.enemy_weapons.find((w: any) => w.name === value);
                  setSelectedWeapon(weapon);
                  setSelectedWeaponDamageSet(null);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona arma" />
                  </SelectTrigger>
                  <SelectContent>
                    {enemy.enemy_weapons.map((weapon: any, index: number) => (
                      <SelectItem key={index} value={weapon.name}>
                        {weapon.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedWeapon?.damage_sets && selectedWeapon.damage_sets.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Effetto danno</label>
                  <Select value={selectedWeaponDamageSet?.effect_name || ''} onValueChange={(value) => {
                    const ds = selectedWeapon.damage_sets.find((s: any) => s.effect_name === value);
                    setSelectedWeaponDamageSet(ds);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona effetto" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedWeapon.damage_sets.map((s: any, idx: number) => (
                        <SelectItem key={idx} value={s.effect_name}>
                          {s.effect_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium">Tipo di Danno Arma</label>
                <Select value={weaponDamageType} onValueChange={setWeaponDamageType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedWeaponDamageSet ? (
                      <>
                        <SelectItem value="leggero">Leggero (d{selectedWeaponDamageSet?.damage_veloce || 0})</SelectItem>
                        <SelectItem value="pesante">Pesante (d{selectedWeaponDamageSet?.damage_pesante || 0})</SelectItem>
                        <SelectItem value="affondo">Affondo (d{selectedWeaponDamageSet?.damage_affondo || 0})</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="leggero">Leggero (d{selectedWeapon?.enemy_damage_leggero || 0})</SelectItem>
                        <SelectItem value="pesante">Pesante (d{selectedWeapon?.enemy_damage_pesante || 0})</SelectItem>
                        <SelectItem value="affondo">Affondo (d{selectedWeapon?.enemy_damage_affondo || 0})</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {damageType === 'spell' && (
            <div>
              <label className="text-sm font-medium">Magia</label>
              <Select value={selectedSpell?.name || ''} onValueChange={(value) => {
                const spell = enemy.enemy_spells.find((s: any) => s.name === value);
                setSelectedSpell(spell);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona magia" />
                </SelectTrigger>
                <SelectContent>
                  {enemySpellsSorted.map((spell: any, index: number) => (
                    <SelectItem key={index} value={spell.name}>
                      {spell.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {damageType === 'ability' && (
            <div>
              <label className="text-sm font-medium">Abilità</label>
              <Select value={selectedAbility?.name || ''} onValueChange={(value) => {
                const ability = enemy.enemy_abilities.find((a: any) => a.name === value);
                setSelectedAbility(ability);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona abilità" />
                </SelectTrigger>
                <SelectContent>
                  {enemy.enemy_abilities.map((ability: any, index: number) => (
                    <SelectItem key={index} value={ability.name}>
                      {ability.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleRoll} disabled={!damageType || 
              (damageType === 'weapon' && !selectedWeapon) ||
              (damageType === 'spell' && !selectedSpell) ||
              (damageType === 'ability' && !selectedAbility)
            }>
              Lancia Dado
            </Button>
            <Button variant="outline" onClick={() => {
              resetDialog();
              onClose();
            }}>
              Annulla
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnemyDamageSelectionDialog;
