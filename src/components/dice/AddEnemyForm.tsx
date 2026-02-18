import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import EquipmentModal from '@/components/character/modals/EquipmentModal';
import { ImportSpellModal } from '@/components/magic/ImportSpellModal';
import { ImportAbilityModal } from '@/components/abilities/ImportAbilityModal';
import type { EquipmentItem, WeaponDamageSet, StatusAnomaly } from '@/types/character';

interface EnemyWeapon {
  id: string;
  name: string;
  enemy_damage_leggero: number;
  enemy_damage_pesante: number;
  enemy_damage_affondo: number;
  // Facoltativo: set di danno basati su damage_effects
  damage_sets?: WeaponDamageSet[];
}

interface SelectedSpell {
  id: string;
  name: string;
  type: string;
  description: string;
  primary_branch: string;
  grade: string;
  level?: number; // legacy campo per UI
  // Nuovo: includi la struttura completa per visualizzare danni/specifiche
  current_level?: number;
  levels?: any[];
}

interface SelectedAbility {
  id: string;
  name: string;
  type: string;
  description: string;
  category: string;
  grade: string;
  level?: number; // legacy campo per UI
  // Nuovo: includi livelli per dettagli danni/specifiche
  current_level?: number;
  levels?: any[];
}

interface EnemyFormData {
  name: string;
  enemy_level: number; // Aggiungi questo campo
  enemy_max_hp: number;
  enemy_max_armor: number;
  enemy_max_pa: number;
  enemy_current_hp?: number;
  enemy_current_armor?: number;
  enemy_current_pa?: number;
  enemy_forza: number;
  enemy_percezione: number;
  enemy_resistenza: number;
  enemy_intelletto: number;
  enemy_sapienza: number;
  enemy_anima: number;
  enemy_weapons: EnemyWeapon[];
  enemy_spells: SelectedSpell[];
  enemy_abilities: SelectedAbility[];
  enemy_anomalies?: StatusAnomaly[];
}

interface AddEnemyFormProps {
  onSave: (enemyData: EnemyFormData) => void;
  onCancel: () => void;
  initialData?: Partial<EnemyFormData> & { id?: string };
}

const AddEnemyForm: React.FC<AddEnemyFormProps> = ({ onSave, onCancel, initialData }) => {
  const [formData, setFormData] = useState<EnemyFormData>({
    name: '',
    enemy_level: 1,
    enemy_max_hp: 0,
    enemy_max_armor: 0,
    enemy_max_pa: 0,
    enemy_forza: 0,
    enemy_percezione: 0,
    enemy_resistenza: 0,
    enemy_intelletto: 0,
    enemy_sapienza: 0,
    enemy_anima: 0,
    enemy_weapons: [],
    enemy_spells: [],
    enemy_abilities: [],
    enemy_anomalies: [],
  });

  const [isImportSpellOpen, setIsImportSpellOpen] = useState(false);
  const [isImportAbilityOpen, setIsImportAbilityOpen] = useState(false);

  // Stato per gestione equipaggiamento creato via EquipmentModal
  const [enemyEquipment, setEnemyEquipment] = useState<EquipmentItem[]>([]);
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [editingEquipmentItem, setEditingEquipmentItem] = useState<EquipmentItem | null>(null);

  // Pre-popolazione in modalità modifica
  useEffect(() => {
    if (!initialData) return;
    setFormData(prev => ({
      name: String(initialData.name ?? prev.name ?? ''),
      enemy_level: Number(initialData.enemy_level ?? prev.enemy_level ?? 1),
      enemy_max_hp: Number(initialData.enemy_max_hp ?? prev.enemy_max_hp ?? 0),
      enemy_max_armor: Number(initialData.enemy_max_armor ?? prev.enemy_max_armor ?? 0),
      enemy_max_pa: Number(initialData.enemy_max_pa ?? prev.enemy_max_pa ?? 0),
      enemy_current_hp: typeof initialData.enemy_current_hp === 'number' ? initialData.enemy_current_hp : prev.enemy_current_hp,
      enemy_current_armor: typeof initialData.enemy_current_armor === 'number' ? initialData.enemy_current_armor : prev.enemy_current_armor,
      enemy_current_pa: typeof initialData.enemy_current_pa === 'number' ? initialData.enemy_current_pa : prev.enemy_current_pa,
      enemy_forza: Number(initialData.enemy_forza ?? prev.enemy_forza ?? 0),
      enemy_percezione: Number(initialData.enemy_percezione ?? prev.enemy_percezione ?? 0),
      enemy_resistenza: Number(initialData.enemy_resistenza ?? prev.enemy_resistenza ?? 0),
      enemy_intelletto: Number(initialData.enemy_intelletto ?? prev.enemy_intelletto ?? 0),
      enemy_sapienza: Number(initialData.enemy_sapienza ?? prev.enemy_sapienza ?? 0),
      enemy_anima: Number(initialData.enemy_anima ?? prev.enemy_anima ?? 0),
      enemy_weapons: Array.isArray(initialData.enemy_weapons) ? (initialData.enemy_weapons as EnemyWeapon[]) : [],
      enemy_spells: Array.isArray(initialData.enemy_spells) ? (initialData.enemy_spells as SelectedSpell[]) : [],
      enemy_abilities: Array.isArray(initialData.enemy_abilities) ? (initialData.enemy_abilities as SelectedAbility[]) : [],
      enemy_anomalies: Array.isArray((initialData as any)?.enemy_anomalies) ? (((initialData as any).enemy_anomalies as StatusAnomaly[]) || []) : [],
    }));
    // Prefill equipaggiamento da enemy_weapons
    try {
      const equipmentFromWeapons: EquipmentItem[] = (Array.isArray(initialData.enemy_weapons) ? (initialData.enemy_weapons as EnemyWeapon[]) : [])
        .map((w) => ({
          id: String(w.id ?? Math.random()),
          name: String(w.name ?? 'Arma'),
          type: 'arma',
          subtype: 'una_mano',
          stats: {},
          weight: 0,
          description: '',
          damageVeloce: Number(w.enemy_damage_leggero ?? 0),
          damagePesante: Number(w.enemy_damage_pesante ?? 0),
          damageAffondo: Number(w.enemy_damage_affondo ?? 0),
          data: Array.isArray(w.damage_sets) ? { damage_sets: w.damage_sets } : undefined,
        }));
      setEnemyEquipment(equipmentFromWeapons);
    } catch {
      // Ignora errori di mapping
    }
  }, [initialData]);

  const handleInputChange = (field: keyof EnemyFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Errore',
        description: 'Il nome del nemico è obbligatorio',
        variant: 'destructive'
      });
      return;
    }

    // Mappa l'equipaggiamento di tipo arma verso enemy_weapons
    const mappedEnemyWeapons: EnemyWeapon[] = (enemyEquipment || [])
      .filter((it) => it.type === 'arma')
      .map((it) => ({
        id: it.id,
        name: it.name,
        enemy_damage_leggero: Number(it.damageVeloce || (it as any).calculatedDamageVeloce || 0),
        enemy_damage_pesante: Number(it.damagePesante || (it as any).calculatedDamagePesante || 0),
        enemy_damage_affondo: Number(it.damageAffondo || (it as any).calculatedDamageAffondo || 0),
        damage_sets: Array.isArray(it.data?.damage_sets) ? (it.data!.damage_sets as WeaponDamageSet[]) : []
      }));

    // Inizializza i valori correnti con i valori massimi
    const enemyDataWithCurrentValues = {
      ...formData,
      enemy_weapons: mappedEnemyWeapons,
      enemy_current_hp: typeof formData.enemy_current_hp === 'number' ? formData.enemy_current_hp : formData.enemy_max_hp,
      enemy_current_armor: typeof formData.enemy_current_armor === 'number' ? formData.enemy_current_armor : formData.enemy_max_armor,
      enemy_current_pa: typeof formData.enemy_current_pa === 'number' ? formData.enemy_current_pa : formData.enemy_max_pa,
    };

    onSave(enemyDataWithCurrentValues);
  };

  // Gestione equipaggiamento via EquipmentModal
  const addEquipment = () => {
    setEditingEquipmentItem(null);
    setIsEquipmentModalOpen(true);
  };

  const onSaveEquipment = (item: EquipmentItem) => {
    setEnemyEquipment(prev => {
      const existsIndex = prev.findIndex(i => i.id === item.id);
      if (existsIndex >= 0) {
        const next = [...prev];
        next[existsIndex] = item;
        return next;
      }
      return [...prev, item];
    });
  };

  const removeEquipment = (id: string) => {
    setEnemyEquipment(prev => prev.filter(i => i.id !== id));
  };

  const handleImportSpellConfirm = ({ spell, level }: { spell: any; level: number }) => {
    const selectedSpell: SelectedSpell = {
      id: spell.id,
      name: spell.name,
      type: spell.type,
      description: spell.description,
      primary_branch: spell.primary_branch || '',
      grade: spell.grade,
      level,
      // Mantieni dati completi per display in EnemySheet
      current_level: level,
      levels: Array.isArray(spell.levels) ? spell.levels : [],
    };
    setFormData(prev => ({
      ...prev,
      enemy_spells: [...prev.enemy_spells.filter(s => s.id !== selectedSpell.id), selectedSpell]
    }));
    toast({ title: 'Magia aggiunta', description: `${spell.name} (Livello ${level}) aggiunta al nemico` });
  };

  const handleImportAbilityConfirm = ({ ability, level }: { ability: any; level: number }) => {
    const selectedAbility: SelectedAbility = {
      id: ability.id,
      name: ability.name,
      type: ability.type,
      description: ability.description,
      category: ability.subcategory || ability.category,
      grade: ability.grade,
      level,
      // Mantieni dati completi per display in EnemySheet
      current_level: level,
      levels: Array.isArray(ability.levels) ? ability.levels : [],
    };
    setFormData(prev => ({
      ...prev,
      enemy_abilities: [...prev.enemy_abilities.filter(a => a.id !== selectedAbility.id), selectedAbility]
    }));
    toast({ title: 'Abilità aggiunta', description: `${ability.name} (Livello ${level}) aggiunta al nemico` });
  };

  const addSpell = (spell: any) => {
    const selectedSpell: SelectedSpell = {
      id: spell.id,
      name: spell.name,
      type: spell.type,
      description: spell.description,
      primary_branch: spell.primary_branch,
      grade: spell.grade,
      // se disponibili, includi la struttura completa
      levels: Array.isArray(spell.levels) ? spell.levels : [],
      current_level: Number(spell.current_level ?? 1),
    };
    
    setFormData(prev => ({
      ...prev,
      enemy_spells: [...prev.enemy_spells, selectedSpell]
    }));
    
    toast({ title: 'Magia aggiunta', description: `${spell.name} aggiunta al nemico` });
  };

  const addAbility = (ability: any) => {
    const selectedAbility: SelectedAbility = {
      id: ability.id,
      name: ability.name,
      type: ability.type,
      description: ability.description,
      category: ability.category,
      grade: ability.grade,
      levels: Array.isArray(ability.levels) ? ability.levels : [],
      current_level: Number(ability.current_level ?? 1),
    };
    
    setFormData(prev => ({
      ...prev,
      enemy_abilities: [...prev.enemy_abilities, selectedAbility]
    }));
    
    toast({ title: 'Abilità aggiunta', description: `${ability.name} aggiunta al nemico` });
  };

  const removeSpell = (spellId: string) => {
    setFormData(prev => ({
      ...prev,
      enemy_spells: prev.enemy_spells.filter(s => s.id !== spellId)
    }));
  };

  const removeAbility = (abilityId: string) => {
    setFormData(prev => ({
      ...prev,
      enemy_abilities: prev.enemy_abilities.filter(a => a.id !== abilityId)
    }));
  };

  return (
    <>
      <div className="space-y-6">
        {/* Statistiche Base */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Nome</Label>
            <Input 
              placeholder="Nome del nemico" 
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
            />
          </div>
          <div>
            <Label>Livello</Label>
            <Input 
              type="number" 
              min="1"
              max="20"
              value={formData.enemy_level}
              onChange={(e) => handleInputChange('enemy_level', parseInt(e.target.value) || 1)}
            />
          </div>
          <div>
            <Label>Salute Massima</Label>
            <Input 
              type="number" 
              value={formData.enemy_max_hp}
              onChange={(e) => handleInputChange('enemy_max_hp', parseInt(e.target.value) || 0)}
            />
          </div>
          <div>
            <Label>Armatura Massima</Label>
            <Input 
              type="number" 
              value={formData.enemy_max_armor}
              onChange={(e) => handleInputChange('enemy_max_armor', parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
        
        <div>
          <Label>Punti Azione</Label>
          <Input 
            type="number" 
            value={formData.enemy_max_pa}
            onChange={(e) => handleInputChange('enemy_max_pa', parseInt(e.target.value) || 0)}
          />
        </div>
        
        {/* Statistiche */}
        <div>
          <h4 className="font-semibold mb-2">Statistiche</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label>Forza</Label>
              <Input 
                type="number" 
                value={formData.enemy_forza}
                onChange={(e) => handleInputChange('enemy_forza', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Percezione</Label>
              <Input 
                type="number" 
                value={formData.enemy_percezione}
                onChange={(e) => handleInputChange('enemy_percezione', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Resistenza</Label>
              <Input 
                type="number" 
                value={formData.enemy_resistenza}
                onChange={(e) => handleInputChange('enemy_resistenza', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Intelletto</Label>
              <Input 
                type="number" 
                value={formData.enemy_intelletto}
                onChange={(e) => handleInputChange('enemy_intelletto', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Sapienza</Label>
              <Input 
                type="number" 
                value={formData.enemy_sapienza}
                onChange={(e) => handleInputChange('enemy_sapienza', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Anima</Label>
              <Input 
                type="number" 
                value={formData.enemy_anima}
                onChange={(e) => handleInputChange('enemy_anima', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>
        
        {/* Equipaggiamento Nemico */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold">Equipaggiamento</h4>
            <Button onClick={addEquipment} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Equipaggiamento
            </Button>
          </div>
          {enemyEquipment.length > 0 ? (
            <div className="space-y-3">
              {enemyEquipment.map((item) => {
                const sets: WeaponDamageSet[] = ((item?.data?.damage_sets as WeaponDamageSet[]) || []).filter(Boolean);
                const sumBase = {
                  veloce: sets.reduce((acc, s) => acc + (Number(s?.damage_veloce) || 0), 0),
                  pesante: sets.reduce((acc, s) => acc + (Number(s?.damage_pesante) || 0), 0),
                  affondo: sets.reduce((acc, s) => acc + (Number(s?.damage_affondo) || 0), 0)
                };
                const sumCalc = {
                  veloce: sets.reduce((acc, s) => acc + (Number(s?.calculated_damage_veloce) || 0), 0),
                  pesante: sets.reduce((acc, s) => acc + (Number(s?.calculated_damage_pesante) || 0), 0),
                  affondo: sets.reduce((acc, s) => acc + (Number(s?.calculated_damage_affondo) || 0), 0)
                };
                const hasSets = sets.length > 0;
                const cat = item?.data?.weapon_type_category || undefined;
                const typeName = item?.data?.weapon_type_name || undefined;
                return (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded">
                    <div className="md:col-span-2">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-gray-600">
                        {item.type} · {item.subtype}
                        {typeName ? ` · ${typeName}` : ''}
                        {cat ? ` · ${cat}` : ''}
                      </div>
                    </div>
                    {item.type === 'arma' ? (
                      <div className="space-y-2">
                        {hasSets ? (
                          <div className="space-y-2">
                            {sets.map((s, idx) => (
                              <div key={idx} className="grid grid-cols-3 gap-2">
                                <div className="col-span-3 text-xs text-muted-foreground">{s.effect_name || 'Effetto'}</div>
                                <div>
                                  <Label className="text-xs">Veloce</Label>
                                  <div className="text-sm">{`d${Number(s?.damage_veloce || 0)} + ${Number(s?.calculated_damage_veloce || 0)}`}</div>
                                </div>
                                <div>
                                  <Label className="text-xs">Pesante</Label>
                                  <div className="text-sm">{`d${Number(s?.damage_pesante || 0)} + ${Number(s?.calculated_damage_pesante || 0)}`}</div>
                                </div>
                                <div>
                                  <Label className="text-xs">Affondo</Label>
                                  <div className="text-sm">{`d${Number(s?.damage_affondo || 0)} + ${Number(s?.calculated_damage_affondo || 0)}`}</div>
                                </div>
                              </div>
                            ))}
                            <div className="grid grid-cols-3 gap-2 border-t pt-2">
                              <div>
                                <Label className="text-xs">Somma Veloce</Label>
                                <div className="text-sm">{`d${sumBase.veloce} + ${sumCalc.veloce}`}</div>
                              </div>
                              <div>
                                <Label className="text-xs">Somma Pesante</Label>
                                <div className="text-sm">{`d${sumBase.pesante} + ${sumCalc.pesante}`}</div>
                              </div>
                              <div>
                                <Label className="text-xs">Somma Affondo</Label>
                                <div className="text-sm">{`d${sumBase.affondo} + ${sumCalc.affondo}`}</div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <Label className="text-xs">Veloce</Label>
                              <div className="text-sm">{`d${Number(item.damageVeloce || 0)} + ${Number(item.calculatedDamageVeloce || 0)}`}</div>
                            </div>
                            <div>
                              <Label className="text-xs">Pesante</Label>
                              <div className="text-sm">{`d${Number(item.damagePesante || 0)} + ${Number(item.calculatedDamagePesante || 0)}`}</div>
                            </div>
                            <div>
                              <Label className="text-xs">Affondo</Label>
                              <div className="text-sm">{`d${Number(item.damageAffondo || 0)} + ${Number(item.calculatedDamageAffondo || 0)}`}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <Label className="text-xs">Armatura</Label>
                        <div className="text-sm">{item.armor || 0}</div>
                      </div>
                    )}
                    <div className="flex items-end gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => { setEditingEquipmentItem(item); setIsEquipmentModalOpen(true); }}>
                        Modifica
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => removeEquipment(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Nessun equipaggiamento aggiunto.</div>
          )}
        </div>
        
        {/* Abilità e Magie */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">Abilità</h4>
            <Button 
              variant="outline" 
              className="w-full mb-2"
              onClick={() => setIsImportAbilityOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Importa Abilità
            </Button>
            {formData.enemy_abilities.length > 0 && (
              <div className="space-y-2">
                {formData.enemy_abilities.map((ability) => (
                  <div key={ability.id} className="flex justify-between items-center p-2 bg-gray-100 rounded">
                    <div>
                      <div className="font-medium text-sm">{ability.name}</div>
                      <div className="text-xs text-gray-600">{ability.category} - {ability.grade}{ability.level ? ` · Lvl ${ability.level}` : ''}</div>
                    </div>
                    <Button 
                      onClick={() => removeAbility(ability.id)} 
                      variant="ghost" 
                      size="sm"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h4 className="font-semibold mb-2">Magie</h4>
            <Button 
              variant="outline" 
              className="w-full mb-2"
              onClick={() => setIsImportSpellOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Importa Magie
            </Button>
            {formData.enemy_spells.length > 0 && (
              <div className="space-y-2">
                {formData.enemy_spells.map((spell) => (
                  <div key={spell.id} className="flex justify-between items-center p-2 bg-gray-100 rounded">
                    <div>
                      <div className="font-medium text-sm">{spell.name}</div>
                      <div className="text-xs text-gray-600">{spell.primary_branch} - {spell.grade}{spell.level ? ` · Lvl ${spell.level}` : ''}</div>
                    </div>
                    <Button 
                      onClick={() => removeSpell(spell.id)} 
                      variant="ghost" 
                      size="sm"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleSave}>
            {initialData ? 'Salva Modifiche' : 'Salva Nemico'}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Annulla
          </Button>
        </div>
      </div>

      {/* Modale Import Magie */}
      <ImportSpellModal
        isOpen={isImportSpellOpen}
        onOpenChange={setIsImportSpellOpen}
        mode="inline"
        onConfirm={handleImportSpellConfirm}
      />

      {/* Modale Import Abilità */}
      <ImportAbilityModal
        isOpen={isImportAbilityOpen}
        onOpenChange={setIsImportAbilityOpen}
        mode="inline"
        onConfirm={handleImportAbilityConfirm}
      />
      {/* Modale Creazione/Modifica Equipaggiamento */}
      <EquipmentModal
        isOpen={isEquipmentModalOpen}
        onClose={() => { setIsEquipmentModalOpen(false); setEditingEquipmentItem(null); }}
        onSave={onSaveEquipment}
        editingItem={editingEquipmentItem}
      />
    </>
  );
};

export default AddEnemyForm;
