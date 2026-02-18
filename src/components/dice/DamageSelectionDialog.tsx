import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DamageSelectionDialogProps } from '@/types/dice';
import { useCharacters } from '@/hooks/useCharacters';

// Estendo localmente le props per includere il supporto ai cooldown delle magie
interface ExtendedDamageSelectionDialogProps extends DamageSelectionDialogProps {
  spellCooldowns?: Record<string, number>;
}

const DamageSelectionDialog: React.FC<ExtendedDamageSelectionDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  character,
  calculations,
  onOpenSpecialAbility,
  diceType, // Aggiungi questo parametro
  spellCooldowns,
  preselectedItem,
  preselectedType
}) => {
  const { loadFullCharacter } = useCharacters();
  const [fullCharacter, setFullCharacter] = useState<any>(null);
  const [selectionType, setSelectionType] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [damageType, setDamageType] = useState<string>('');
  const [selectedAbility, setSelectedAbility] = useState<any>(null);
  const [abilities, setAbilities] = useState<any[]>([]);
  const [selectedSpecialAbility, setSelectedSpecialAbility] = useState<string>(''); 
  const [assassinioMultiplier, setAssassinioMultiplier] = useState<number>(1);
  const [selectedArrow, setSelectedArrow] = useState<any>(null);
  const [additionalCriticalDamage, setAdditionalCriticalDamage] = useState<number>(0);
  const [isDamageTypeFromParent, setIsDamageTypeFromParent] = useState<string>('');
  // Nuovi stati per "per secondo"
  const [secondsDuration, setSecondsDuration] = useState<number>(1);
  const [hasPerSecondEffect, setHasPerSecondEffect] = useState<boolean>(false);
  // Nuovi stati per "danno per proiettile"
  const [hasPerProjectileEffect, setHasPerProjectileEffect] = useState<boolean>(false);
  const [projectilesCount, setProjectilesCount] = useState<number>(1);

  // Nuovi stati per "danno per azione"
  const [hasPerActionEffect, setHasPerActionEffect] = useState<boolean>(false);
  const [actionsCount, setActionsCount] = useState<number>(1);
  
  // Nuovi stati per "+danno arma"
  const [hasWeaponDamageEffect, setHasWeaponDamageEffect] = useState<boolean>(false);
  const [selectedWeaponForDamage, setSelectedWeaponForDamage] = useState<any>(null);
  const [weaponDamageType, setWeaponDamageType] = useState<string>('');
  const [equipmentDamageProfileIndex, setEquipmentDamageProfileIndex] = useState<number>(-1);

  // Massimali derivati dai dati della magia/abilità
  const [maxSeconds, setMaxSeconds] = useState<number>(0);
  const [maxMultipleAttacks, setMaxMultipleAttacks] = useState<number>(0);
  const [maxExtraActionCost, setMaxExtraActionCost] = useState<number>(0);
  useEffect(() => {
    if (!isOpen) return;
    if (!preselectedItem || !preselectedType) return;
    const t = String(preselectedType || '').toLowerCase();
    const mapped = t === 'spell' ? 'magic' : t;
    if (mapped !== 'magic' && mapped !== 'ability' && mapped !== 'equipment') return;
    setSelectionType(mapped);
    setSelectedItem(preselectedItem);
  }, [isOpen, preselectedItem, preselectedType]);

  // Funzione per rilevare "per secondo" nelle descrizioni
  const detectPerSecondEffect = (item: any) => {
    if (!item) return false;
    
    const currentLevel = item.levels?.find((l: any) => l.level === item.current_level) || item.levels?.[0];
    const description = currentLevel?.level_description || item.description || '';
    const additionalDescription = item.additional_description || '';
    
    const fullDescription = `${description} ${additionalDescription}`.toLowerCase();
    return fullDescription.includes('per secondo') || fullDescription.includes('al secondo');
  };
  
  // Funzione per rilevare "danno per proiettile" nelle descrizioni
  const detectPerProjectileEffect = (item: any) => {
    if (!item) return false;
    
    const currentLevel = item.levels?.find((l: any) => l.level === item.current_level) || item.levels?.[0];
    const description = currentLevel?.level_description || item.description || '';
    const additionalDescription = item.additional_description || '';
    
    const full = `${description} ${additionalDescription}`.toLowerCase();
    return full.includes('danno per proiettile')
      || full.includes('danni per proiettile')
      || full.includes('per proiettile')
      || full.includes('per proiettili');
  };
  
  // Funzione per rilevare "danno per azione" nelle descrizioni
  const detectPerActionEffect = (item: any) => {
    if (!item) return false;
    
    const currentLevel = item.levels?.find((l: any) => l.level === item.current_level) || item.levels?.[0];
    const description = currentLevel?.level_description || item.description || '';
    const additionalDescription = item.additional_description || '';
    
    const full = `${description} ${additionalDescription}`.toLowerCase();
    return full.includes('danno per azione')
      || full.includes('danni per azione')
      || full.includes('per azione')
      || full.includes('per azioni');
  };
  
  // Funzione per rilevare "+danno arma" nelle descrizioni
  const detectWeaponDamageEffect = (item: any) => {
    if (!item) return false;
    
    const currentLevel = item.levels?.find((l: any) => l.level === item.current_level) || item.levels?.[0];
    const description = currentLevel?.level_description || item.description || '';
    const additionalDescription = item.additional_description || '';
    
    const fullDescription = `${description} ${additionalDescription}`.toLowerCase();
    
    // Espandi i pattern di ricerca per catturare più varianti
    const weaponDamagePatterns = [
      '+ danno arma',
      '+danno arma', 
      'danno arma',
      'danno dell\'arma',
      'danno della arma',
      'bonus danno arma',
      'aggiunge danno arma',
      'somma danno arma'
    ];
    
    return weaponDamagePatterns.some(pattern => fullDescription.includes(pattern));
  };

  // Aggiorna hasPerSecondEffect, hasWeaponDamageEffect e hasPerProjectileEffect quando cambia selectedItem
  useEffect(() => {
    if (selectedItem && (selectionType === 'ability' || selectionType === 'magic')) {
      // Ricava il livello corrente
      const currentLevel = selectedItem.levels?.find((l: any) => l.level === selectedItem.current_level) || selectedItem.levels?.[0];

      const ms = Number(currentLevel?.max_seconds ?? selectedItem?.max_seconds ?? 0) || 0;
      const mma = Number(
        currentLevel?.max_multiple_attacks ??
        selectedItem?.max_multiple_attacks ??
        currentLevel?.max_projectiles ??
        selectedItem?.max_projectiles ??
        0
      ) || 0;
      const eac = Number(
        currentLevel?.extra_action_cost ??
        selectedItem?.extra_action_cost ??
        currentLevel?.max_pa_investment ??
        selectedItem?.max_pa_investment ??
        currentLevel?.indicative_action_cost ??
        selectedItem?.indicative_action_cost ??
        0
      ) || 0;

      setMaxSeconds(ms);
      setMaxMultipleAttacks(mma);
      setMaxExtraActionCost(eac);

      // Abilitazioni basate sia su detection testuale che su massimali espliciti
      setHasPerSecondEffect(detectPerSecondEffect(selectedItem) || ms > 0);
      setHasWeaponDamageEffect(detectWeaponDamageEffect(selectedItem) || !!selectedItem?.weaponForDamage);
      // Mostra l'UI per attacchi multipli se sono definiti massimali, anche senza testo esplicito
      setHasPerProjectileEffect(detectPerProjectileEffect(selectedItem) || mma > 0);
      setHasPerActionEffect(detectPerActionEffect(selectedItem));

      const clampLocal = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
      const nextSeconds = ms > 0 ? clampLocal(Number(selectedItem?.secondsDuration ?? 1) || 1, 1, ms) : 1;
      const nextProjectiles = mma > 0 ? clampLocal(Number(selectedItem?.projectilesCount ?? 1) || 1, 1, mma) : 1;
      const nextActions = Math.max(1, Number(selectedItem?.actionsCount ?? 1) || 1);
      setSecondsDuration(nextSeconds);
      setProjectilesCount(nextProjectiles);
      setActionsCount(nextActions);

      const unmapDamageType = (stored: string) => {
        if (stored === 'veloce') return 'leggero';
        return stored || '';
      };
      const wfd = (selectedItem as any)?.weaponForDamage;
      if (wfd?.weapon) {
        setSelectedWeaponForDamage(wfd.weapon);
        setWeaponDamageType(unmapDamageType(String(wfd?.damageType || '')));
      } else {
        setSelectedWeaponForDamage(null);
        setWeaponDamageType('');
      }
    } else {
      setHasPerSecondEffect(false);
      setHasWeaponDamageEffect(false);
      setHasPerProjectileEffect(false);
      setHasPerActionEffect(false);
      setMaxSeconds(0);
      setMaxMultipleAttacks(0);
      setMaxExtraActionCost(0);
    }
  }, [selectedItem, selectionType]);

  useEffect(() => {
    if (!isOpen || !selectedItem) return;
    const src = (selectedItem as any)?.selectedCompetences?.[0];
    if (!src?.id || !Array.isArray(abilities) || abilities.length === 0) return;
    const found = abilities.find((a: any) => String(a?.id || '') === String(src.id));
    if (found) setSelectedAbility(found);
  }, [isOpen, selectedItem, abilities]);

  useEffect(() => {
    if (!isOpen || !selectedItem) return;
    const sa = (selectedItem as any)?.specialAbility;
    if (sa?.type) {
      setSelectedSpecialAbility(String(sa.type));
      setAssassinioMultiplier(Number(sa?.multiplier ?? 1) || 1);
    } else {
      setSelectedSpecialAbility('');
      setAssassinioMultiplier(1);
    }
    setSelectedArrow((selectedItem as any)?.projectile ?? null);
    setAdditionalCriticalDamage(Number((selectedItem as any)?.additionalCriticalDamage ?? 0) || 0);
    if (selectionType === 'equipment') {
      const unmapDamageType = (stored: string) => {
        if (stored === 'veloce') return 'leggero';
        return stored || '';
      };
      setDamageType(unmapDamageType(String((selectedItem as any)?.damageType || '')));
      setEquipmentDamageProfileIndex(Number((selectedItem as any)?.equipmentDamageProfileIndex ?? -1) || -1);
    }
  }, [isOpen, selectedItem, selectionType]);

  // Carica il personaggio completo quando la modale si apre
  useEffect(() => {
    if (isOpen && character?.id) {
      loadFullCharacter(character.id).then(setFullCharacter);
    }
  }, [isOpen, character?.id, loadFullCharacter]);

  // Estrai le competenze quando il personaggio completo è caricato
  useEffect(() => {
    if (isOpen && fullCharacter?.abilities) {
      const characterCompetences: any[] = [];
      
      // Competenze specifiche per il danno (escludendo quelle sotto "Tecnico")
      const combatCompetences = [
        { key: 'spada', name: 'Spada' },
        { key: 'coltello', name: 'Coltello' },
        { key: 'ascia', name: 'Ascia' },
        { key: 'mazza', name: 'Mazza' },
        { key: 'frusta', name: 'Frusta' },
        { key: 'falce', name: 'Falce' },
        { key: 'tirapugni', name: 'Tirapugni' },
        { key: 'bastone', name: 'Bastone' },
        { key: 'armi_inastate', name: 'Armi inastate' },
        { key: 'scudo', name: 'Scudo' },
        { key: 'arco', name: 'Arco' },
        { key: 'balestra', name: 'Balestra' },
        { key: 'fionda', name: 'Fionda' },
        { key: 'da_fuoco', name: 'Da fuoco' },
        { key: 'da_lancio', name: 'Da lancio' },
        { key: 'pesante', name: 'Pesante' }
      ];
      
      // Estrai le competenze dalla sezione abilities del personaggio
      combatCompetences.forEach(({ key, name }) => {
        const competenceValue = fullCharacter.abilities?.[key] || 0;
        
        if (competenceValue > 0) {
          characterCompetences.push({
            id: key,
            name: name,
            type: 'Competenza',
            current_level: competenceValue,
            subcategory: 'Competenza'
          });
        }
      });
      
      setAbilities(characterCompetences);
    }
  }, [isOpen, fullCharacter]);

  // Armi reali dal personaggio
  const weapons = fullCharacter?.equipment?.filter((item: any) => item.type === 'arma') || [];

  // Aggiungi questo log più dettagliato

  // Magie reali dal personaggio
  const spells = fullCharacter?.custom_spells || [];
  
  // Frecce dal personaggio (solo per armi a distanza)
  const arrows = fullCharacter?.arrows || [];
  
  // Controlla se l'arma selezionata è a distanza
  const isRangedWeapon = selectedItem?.subtype === 'arma_distanza';
  const equipmentAlternateDamages: Array<{ name?: string | null; damage_sets?: any[] }> =
    selectionType === 'equipment' && selectedItem
      ? (Array.isArray((selectedItem as any)?.data?.alternate_damages)
          ? (selectedItem as any).data.alternate_damages
          : ((selectedItem as any)?.data?.alternate_damage ? [(selectedItem as any).data.alternate_damage] : []))
      : [];

  const getEquipmentSetsForProfile = useCallback((weapon: any, profileIndex: number) => {
    if (!weapon) return [];
    if (profileIndex >= 0) {
      const altProfiles: any[] = Array.isArray((weapon as any)?.data?.alternate_damages)
        ? (weapon as any).data.alternate_damages
        : (((weapon as any)?.data?.alternate_damage) ? [(weapon as any).data.alternate_damage] : []);
      const alt = altProfiles[profileIndex];
      return Array.isArray(alt?.damage_sets) ? alt.damage_sets : [];
    }

    const direct = Array.isArray((weapon as any)?.data?.damage_sets)
      ? (weapon as any).data.damage_sets
      : (Array.isArray((weapon as any)?.damage_sets) ? (weapon as any).damage_sets : []);
    return Array.isArray(direct) ? direct : [];
  }, []);

  const getEquipmentDamagePreview = useCallback((
    weapon: any,
    profileIndex: number,
    uiDamageType: 'leggero' | 'pesante' | 'affondo'
  ) => {
    const mapUiTypeToKey = (t: 'leggero' | 'pesante' | 'affondo') => (t === 'leggero' ? 'veloce' : t);
    const typeKey = mapUiTypeToKey(uiDamageType);

    const sets = getEquipmentSetsForProfile(weapon, profileIndex);
    if (Array.isArray(sets) && sets.length > 0) {
      const dmgKey = typeKey === 'veloce' ? 'damage_veloce' : typeKey === 'pesante' ? 'damage_pesante' : 'damage_affondo';
      const calcKey = typeKey === 'veloce' ? 'calculated_damage_veloce' : typeKey === 'pesante' ? 'calculated_damage_pesante' : 'calculated_damage_affondo';

      const sides = sets.reduce((sum: number, s: any) => sum + (Number(s?.[dmgKey]) || 0), 0);
      const calcSum = sets.reduce((sum: number, s: any) => sum + (Number(s?.[calcKey]) || 0), 0);
      const pure = calcSum > 0 ? calcSum : Math.floor(sides * 0.33);
      return { sides, pure };
    }

    const legacySides =
      typeKey === 'veloce' ? Number((weapon as any)?.damageVeloce || 0)
      : typeKey === 'pesante' ? Number((weapon as any)?.damagePesante || 0)
      : Number((weapon as any)?.damageAffondo || 0);
    const legacyPure =
      typeKey === 'veloce' ? Number((weapon as any)?.calculatedDamageVeloce || 0)
      : typeKey === 'pesante' ? Number((weapon as any)?.calculatedDamagePesante || 0)
      : Number((weapon as any)?.calculatedDamageAffondo || 0);
    const pure = legacyPure > 0 ? legacyPure : Math.floor(legacySides * 0.33);
    return { sides: legacySides, pure };
  }, [getEquipmentSetsForProfile]);
  // Rileva in modo robusto la variante (normale/critico) dalla prop diceType
  useEffect(() => {
    if (isOpen && diceType) {
      setIsDamageTypeFromParent(diceType);
    }
  }, [isOpen, diceType]);

  useEffect(() => {
    if (selectionType === 'equipment') {
      setEquipmentDamageProfileIndex(-1);
    }
  }, [selectionType, selectedItem?.id]);

  useEffect(() => {
    if (selectionType !== 'equipment' || !selectedItem) return;
    const available: Array<'leggero' | 'pesante' | 'affondo'> = ['leggero', 'pesante', 'affondo'].filter((t) => {
      const p = getEquipmentDamagePreview(selectedItem, equipmentDamageProfileIndex, t);
      return (Number(p?.sides) || 0) > 0;
    });
    if (!available.includes(damageType as any)) {
      setDamageType(available[0] || '');
    }
  }, [selectionType, selectedItem, equipmentDamageProfileIndex, damageType, getEquipmentDamagePreview]);
  
  const handleConfirm = () => {
    if (!selectedItem) return;

    // Mappa i tipi di danno dall'interfaccia a quelli della funzione
    const mapDamageType = (uiDamageType: string) => {
      switch (uiDamageType) {
        case 'leggero': return 'veloce';
        case 'pesante': return 'pesante';
        case 'affondo': return 'affondo';
        default: return uiDamageType;
      }
    };

    const selectionData = {
      ...selectedItem,
      selectedCompetences: selectedAbility ? [selectedAbility] : [],
      // Converti il damageType per l'equipaggiamento
      damageType: selectionType === 'equipment' ? mapDamageType(damageType) : damageType,
      equipmentDamageProfileIndex: selectionType === 'equipment' ? equipmentDamageProfileIndex : -1,
      specialAbility: selectedSpecialAbility ? {
        type: selectedSpecialAbility,
        value: selectedSpecialAbility === 'contrattacco' ? fullCharacter?.abilities?.contrattacco || 0 : 0,
        multiplier: selectedSpecialAbility === 'assassinio' ? assassinioMultiplier : 1
      } : null,
      projectile: selectedArrow,
      secondsDuration: hasPerSecondEffect ? secondsDuration : 1,
      // Conteggio proiettili per effetti "per proiettile"
      projectilesCount: hasPerProjectileEffect ? projectilesCount : 1,
      // Conteggio azioni per effetti "per azione"
      actionsCount: hasPerActionEffect ? actionsCount : 1,
      additionalCriticalDamage: isDamageTypeFromParent === 'danno_critico' ? additionalCriticalDamage : 0,
      // Aggiungi dati arma per "+danno arma"
      weaponForDamage: hasWeaponDamageEffect ? {
        weapon: selectedWeaponForDamage,
        damageType: mapDamageType(weaponDamageType) // Converti anche qui
      } : null
    };

    onConfirm(selectionType, selectionData);
    resetSelection();
  };

  const resetSelection = () => {
    setSelectionType('');
    setSelectedItem(null);
    setDamageType('');
    setSelectedAbility(null);
    setSelectedSpecialAbility('');
    setAssassinioMultiplier(1);
    setSelectedArrow(null);
    setAdditionalCriticalDamage(0);
    setSecondsDuration(1);
    setHasPerSecondEffect(false);
    // Reset nuovi stati
    setHasWeaponDamageEffect(false);
    setSelectedWeaponForDamage(null);
    setWeaponDamageType('');
    setHasPerProjectileEffect(false);
    setProjectilesCount(1);
    setHasPerActionEffect(false);
    setActionsCount(1);
    setEquipmentDamageProfileIndex(-1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => { onClose(); resetSelection(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Selezione Danno</DialogTitle>
          <DialogDescription>
            Scegli la fonte del danno e l'abilità da utilizzare
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Selezione tipo di danno */}
          <div>
            <label className="text-sm font-medium mb-2 block">Fonte del Danno</label>
            <Select value={selectionType} onValueChange={setSelectionType}>
              <SelectTrigger>
                <SelectValue placeholder="Scegli fonte danno" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equipment">Equipaggiamento</SelectItem>
                <SelectItem value="ability">Abilità</SelectItem>
                <SelectItem value="magic">Magia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectionType === 'equipment' && (
            <>
              {weapons.length > 0 ? (
                <Select value={selectedItem?.id || ''} onValueChange={(value) => {
                  const weapon = weapons.find(w => w.id === value);
                  setSelectedItem(weapon);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Scegli un'arma" />
                  </SelectTrigger>
                  <SelectContent>
                    {weapons.map(weapon => (
                      <SelectItem key={weapon.id} value={weapon.id}>
                        {weapon.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">Nessuna arma equipaggiata</p>
              )}
              
              {selectedItem && (
                <>
                  {equipmentAlternateDamages.length > 0 && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Profilo danno</label>
                      <Select
                        value={equipmentDamageProfileIndex < 0 ? 'base' : String(equipmentDamageProfileIndex)}
                        onValueChange={(value) => setEquipmentDamageProfileIndex(value === 'base' ? -1 : (parseInt(value) || 0))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Scegli profilo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="base">Base</SelectItem>
                          {equipmentAlternateDamages.map((a: any, idx: number) => (
                            <SelectItem key={`profile:${idx}`} value={String(idx)}>
                              {String(a?.name || `Alternativo ${idx + 1}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Select value={damageType} onValueChange={(value: 'leggero' | 'pesante' | 'affondo') => setDamageType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo di danno" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const p = getEquipmentDamagePreview(selectedItem, equipmentDamageProfileIndex, 'leggero');
                        if ((Number(p?.sides) || 0) <= 0) return null;
                        return (
                          <SelectItem value="leggero">
                            {`Leggero (d${p.sides} + ${p.pure})`}
                          </SelectItem>
                        );
                      })()}
                      {(() => {
                        const p = getEquipmentDamagePreview(selectedItem, equipmentDamageProfileIndex, 'pesante');
                        if ((Number(p?.sides) || 0) <= 0) return null;
                        return (
                          <SelectItem value="pesante">
                            {`Pesante (d${p.sides} + ${p.pure})`}
                          </SelectItem>
                        );
                      })()}
                      {(() => {
                        const p = getEquipmentDamagePreview(selectedItem, equipmentDamageProfileIndex, 'affondo');
                        if ((Number(p?.sides) || 0) <= 0) return null;
                        return (
                          <SelectItem value="affondo">
                            {`Affondo (d${p.sides} + ${p.pure})`}
                          </SelectItem>
                        );
                      })()}
                    </SelectContent>
                  </Select>
                </>
              )}
              
              {/* Frecce - solo per armi a distanza */}
              {isRangedWeapon && arrows.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Frecce (opzionale)</label>
                  <Select value={selectedArrow?.id || ''} onValueChange={(value) => {
                    const arrow = arrows.find(a => a.id === value);
                    setSelectedArrow(arrow);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Scegli freccia" />
                    </SelectTrigger>
                    <SelectContent>
                      {arrows.map(arrow => {
                        const sets = Array.isArray((arrow as any)?.damage_sets) ? (arrow as any).damage_sets : [];
                        const guaranteed = Array.isArray(sets) && sets.length > 0
                          ? sets.reduce((sum: number, s: any) => sum + (Number(s?.guaranteed_damage || 0)), 0)
                          : (Number((arrow as any)?.damage || 0) || 0);
                        const additional = Array.isArray(sets) && sets.length > 0
                          ? sets.reduce((sum: number, s: any) => sum + (Number(s?.additional_damage || 0)), 0)
                          : (Number((arrow as any)?.additional_damage || 0) || 0);
                        return (
                          <SelectItem key={arrow.id} value={arrow.id}>
                            {arrow.name} (Assicurato: {guaranteed}{additional > 0 ? `, Aggiuntivo: d${additional}` : ''})
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
                {selectedArrow && (
                  <div className="mt-2 rounded border p-2 text-sm">
                    <div className="font-semibold">{selectedArrow.name}</div>
                    {selectedArrow.description && (
                      <div className="text-muted-foreground">{selectedArrow.description}</div>
                    )}
                    {Array.isArray((selectedArrow as any)?.damage_sets) && (selectedArrow as any).damage_sets.length > 0 ? (
                      <div className="mt-1 space-y-1">
                        {((selectedArrow as any).damage_sets || []).map((ds: any, idx: number) => {
                          const eff = ds?.effect_name || `Effetto ${idx + 1}`;
                          const guar = Number(ds?.guaranteed_damage || 0);
                          const addi = Number(ds?.additional_damage || 0);
                          return (
                            <div key={`${eff}-${idx}`}>• {eff}: {guar} {addi > 0 ? `+ d${addi}` : ''}</div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-1">Danno: {Number((selectedArrow as any)?.damage || 0)}{Number((selectedArrow as any)?.additional_damage || 0) > 0 ? ` + d${Number((selectedArrow as any)?.additional_damage || 0)}` : ''}</div>
                    )}
                  </div>
                )}
              </div>
            )}
            </>
          )}

          {selectionType === 'ability' && (
            <Select value={selectedItem?.id || ''} onValueChange={(value) => {
              const ability = character?.custom_abilities?.find(a => a.id === value);
              setSelectedItem(ability);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Scegli un'abilità" />
              </SelectTrigger>
              <SelectContent>
                {character?.custom_abilities
                  ?.filter(ability => 
                    ability.category !== 'Posture' && 
                    ability.category !== 'Tecnico'
                  )
                  ?.map(ability => {
                    const currentLevel = ability.levels?.find((l: any) => l.level === ability.current_level) || ability.levels?.[0];
                    const dannoAssicurato = currentLevel?.danno_assicurato || 0;
                    const dannoAggiuntivo = currentLevel?.danno_aggiuntivo || 0;
                    const actionCost = currentLevel?.action_cost || currentLevel?.indicative_action_cost || 0;
                    
                    return (
                      <SelectItem key={ability.id} value={ability.id}>
                        {ability.name} (Assicurato: {dannoAssicurato}, Aggiuntivo: {dannoAggiuntivo}{actionCost > 0 ? `, PA: ${actionCost}` : ''})
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          )}

          {selectionType === 'magic' && (
            <>
              {spells.length > 0 ? (
                <Select value={selectedItem?.id || ''} onValueChange={(value) => {
                  const spell = spells.find(s => s.id === value);
                  setSelectedItem(spell);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Scegli una magia" />
                  </SelectTrigger>
                  <SelectContent>
                    {spells.map(spell => {
                      const currentLevel = spell.levels?.find((l: any) => l.level === spell.current_level) || spell.levels?.[0];
                      const dannoAssicurato = currentLevel?.guaranteed_damage || 0;
                      const dannoAggiuntivo = currentLevel?.additional_damage || 0;
                      const actionCost = currentLevel?.action_cost || currentLevel?.indicative_action_cost || 0;
                      const cdTurns = spellCooldowns?.[spell.id] ?? 0;
                      const isBlocked = cdTurns > 0;
                      
                      return (
                        <SelectItem key={spell.id} value={spell.id} disabled={isBlocked}>
                          {spell.name} (Assicurato: {dannoAssicurato}, Aggiuntivo: {dannoAggiuntivo}{actionCost > 0 ? `, PA: ${actionCost}` : ''})
                          {isBlocked && (
                            <span className="ml-2 text-xs text-muted-foreground">in recupero: {cdTurns} turni</span>
                          )}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">Nessuna magia disponibile</p>
              )}
            </>
          )}

          {selectionType === 'ability' && (
            <Select value={selectedItem?.id || ''} onValueChange={(value) => {
              const ability = character?.custom_abilities?.find(a => a.id === value);
              setSelectedItem(ability);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Scegli un'abilità" />
              </SelectTrigger>
              <SelectContent>
                {character?.custom_abilities
                  ?.filter(ability => 
                    ability.category !== 'Posture' && 
                    ability.category !== 'Tecnico'
                  )
                  ?.map(ability => {
                    const currentLevel = ability.levels?.find((l: any) => l.level === ability.current_level) || ability.levels?.[0];
                    const dannoAssicurato = currentLevel?.danno_assicurato || 0;
                    const dannoAggiuntivo = currentLevel?.danno_aggiuntivo || 0;
                    const actionCost = currentLevel?.action_cost || currentLevel?.indicative_action_cost || 0;
                    
                    return (
                      <SelectItem key={ability.id} value={ability.id}>
                        {ability.name} (Assicurato: {dannoAssicurato}, Aggiuntivo: {dannoAggiuntivo}{actionCost > 0 ? `, PA: ${actionCost}` : ''})
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          )}

          {/* Selezione Arma per "+danno arma" - solo se rilevato */}
          {hasWeaponDamageEffect && (selectionType === 'ability' || selectionType === 'magic') && (
            <>
              <div>
                <label className="text-sm font-medium mb-2 block">Arma per "+danno arma"</label>
                {weapons.length > 0 ? (
                  <Select value={selectedWeaponForDamage?.id || ''} onValueChange={(value) => {
                    const weapon = weapons.find(w => w.id === value);
                    setSelectedWeaponForDamage(weapon);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Scegli un'arma" />
                    </SelectTrigger>
                    <SelectContent>
                      {weapons.map(weapon => (
                        <SelectItem key={weapon.id} value={weapon.id}>
                          {weapon.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">Nessuna arma equipaggiata</p>
                )}
              </div>

              {/* Tipo di danno arma */}
              {selectedWeaponForDamage && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Tipo di Danno Arma</label>
                  <Select value={weaponDamageType} onValueChange={setWeaponDamageType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Scegli tipo danno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leggero">
                        Leggero (d{selectedWeaponForDamage.damageVeloce || 0} + {(selectedWeaponForDamage.calculatedDamageVeloce || 0)})
                      </SelectItem>
                      <SelectItem value="normale">
                        Normale (d{selectedWeaponForDamage.damageAffondo || 0} + {(selectedWeaponForDamage.calculatedDamageAffondo || 0)})
                      </SelectItem>
                      <SelectItem value="pesante">
                        Pesante (d{selectedWeaponForDamage.damagePesante || 0} + {(selectedWeaponForDamage.calculatedDamagePesante || 0)})
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {/* Campo per i secondi - solo se rilevato "per secondo" */}
          {hasPerSecondEffect && (
            <div>
              <label className="text-sm font-medium mb-2 block">Per quanti secondi?</label>
              <Input
                type="number"
                min={1}
                max={maxSeconds > 0 ? maxSeconds : 10}
                value={secondsDuration}
                onChange={(e) => {
                  const v = parseInt(e.target.value) || 1;
                  const m = maxSeconds > 0 ? maxSeconds : 10;
                  setSecondsDuration(Math.min(Math.max(1, v), m));
                }}
                placeholder="Numero di secondi (es. 3)"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Il danno assicurato e massimale verranno moltiplicati per {secondsDuration} second{secondsDuration !== 1 ? 'i' : 'o'}
              </p>
            </div>
          )}

          {/* Nuovo: Campo per i proiettili - solo se rilevato "danno per proiettile" */}
          {(selectionType === 'magic' || hasPerProjectileEffect) && (
            <div>
              <label className="text-sm font-medium mb-2 block">{(selectionType === 'magic' || maxMultipleAttacks > 0) ? 'Quanti attacchi?' : 'Quanti proiettili?'}</label>
              <Input
                type="number"
                min={1}
                max={maxMultipleAttacks > 0 ? maxMultipleAttacks : 20}
                value={projectilesCount}
                onChange={(e) => {
                  const v = parseInt(e.target.value) || 1;
                  const m = maxMultipleAttacks > 0 ? maxMultipleAttacks : 20;
                  setProjectilesCount(Math.min(Math.max(1, v), m));
                }}
                placeholder={(selectionType === 'magic' || maxMultipleAttacks > 0) ? 'Numero di attacchi (es. 3)' : 'Numero di proiettili (es. 3)'}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {maxMultipleAttacks > 0
                  ? (<>Il danno assicurato e massimale verranno moltiplicati per {projectilesCount} attacc{projectilesCount !== 1 ? 'hi' : 'o'}</>)
                  : (<>Il danno assicurato e massimale verranno moltiplicati per {projectilesCount} proiettil{projectilesCount !== 1 ? 'i' : 'e'}</>)}
              </p>
            </div>
          )}

          {/* Indicatore costo PA extra derivato dai dati della magia */}
          {(selectionType === 'magic' && maxExtraActionCost > 0) && (
            <p className="text-xs text-muted-foreground">
              Costo PA extra: {maxExtraActionCost}
            </p>
          )}

          {/* Nuovo: Campo per le azioni - solo se rilevato "danno per azione" */}
          {hasPerActionEffect && (
            <div>
              <label className="text-sm font-medium mb-2 block">Quante azioni?</label>
              <Input
                type="number"
                min="1"
                max="20"
                value={actionsCount}
                onChange={(e) => setActionsCount(parseInt(e.target.value) || 1)}
                placeholder="Numero di azioni (es. 2)"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Il danno assicurato e massimale verranno moltiplicati per {actionsCount} azion{actionsCount !== 1 ? 'i' : 'e'}
              </p>
            </div>
          )}

          {/* Selezione Competenze */}
          <div>
            <label className="text-sm font-medium mb-2 block">Scegli una competenza (opzionale)</label>
            <Select value={selectedAbility?.id || ''} onValueChange={(value) => {
              const ability = abilities.find(a => a.id === value);
              setSelectedAbility(ability);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Scegli una competenza (opzionale)" />
              </SelectTrigger>
              <SelectContent>
                {abilities.map(ability => (
                  <SelectItem key={ability.id} value={ability.id}>
                    {ability.name} (d{ability.current_level})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Abilità Speciali */}
          <div>
            <label className="text-sm font-medium mb-2 block">Abilità Speciali (opzionale)</label>
            <Select value={selectedSpecialAbility} onValueChange={setSelectedSpecialAbility}>
              <SelectTrigger>
                <SelectValue placeholder="Scegli un'abilità speciale (opzionale)" />
              </SelectTrigger>
              <SelectContent>
                {fullCharacter?.abilities?.contrattacco > 0 && (
                  <SelectItem value="contrattacco">
                    Contrattacco (d{fullCharacter.abilities.contrattacco})
                  </SelectItem>
                )}
                {fullCharacter?.abilities?.assassinio > 0 && (
                  <SelectItem value="assassinio">
                    Assassinio (d{fullCharacter.abilities.assassinio})
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Input moltiplicatore Assassinio */}
          {selectedSpecialAbility === 'assassinio' && (
            <div>
              <label className="text-sm font-medium mb-2 block">Moltiplicatore Assassinio</label>
              <Input
                type="number"
                min="1"
                value={assassinioMultiplier}
                onChange={(e) => setAssassinioMultiplier(parseInt(e.target.value) || 1)}
                placeholder="Moltiplicatore (es. 2)"
              />
            </div>
          )}

          {/* Campo danno critico aggiuntivo - solo se è danno critico */}
          {(() => {
            return isDamageTypeFromParent === 'danno_critico';
          })() && (
            <div>
              <label className="text-sm font-medium mb-2 block">Danno Puro Aggiuntivo (Critico)</label>
              <Input
                type="number"
                min="0"
                value={additionalCriticalDamage}
                onChange={(e) => setAdditionalCriticalDamage(parseInt(e.target.value) || 0)}
                placeholder="Danno aggiuntivo (es. 5)"
              />
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => { onClose(); resetSelection(); }}>Annulla</Button>
            <Button 
              onClick={handleConfirm} 
              disabled={
                !selectionType || 
                (selectionType === 'equipment' && (!selectedItem || !damageType)) ||
                ((selectionType === 'ability' || selectionType === 'magic') && !selectedItem)
              }
            >
              Conferma
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DamageSelectionDialog;
