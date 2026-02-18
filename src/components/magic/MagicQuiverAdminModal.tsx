import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { listDamageEffects } from '@/integrations/supabase/damageEffects';
import { listAnomalies } from '@/integrations/supabase/anomalies';

export interface DamageSetRow {
  damageEffectId: string;
  guaranteedDamage: number;
  additionalDamage: number;
}

export interface AnomalyChanceRow {
  anomalyId: string;
  percent: number; // 0-100
}

export interface MagicQuiverDefinition {
  name: string;
  description?: string;
  warnings?: string;
  actionPointsCost?: number | null;
  indicativeActionPointsCost?: number | null;
  damageSets: DamageSetRow[];
  anomalies: AnomalyChanceRow[];
}

interface MagicQuiverAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (def: MagicQuiverDefinition) => void;
}

export const MagicQuiverAdminModal = ({ isOpen, onClose, onSave }: MagicQuiverAdminModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [warnings, setWarnings] = useState('');
  const [actionPointsCost, setActionPointsCost] = useState<string>('');
  const [indicativeActionPointsCost, setIndicativeActionPointsCost] = useState<string>('');

  const [damageSets, setDamageSets] = useState<DamageSetRow[]>([]);
  const [damageEffectOptions, setDamageEffectOptions] = useState<{ id: string; name: string }[]>([]);
  const [damageEffectsLoading, setDamageEffectsLoading] = useState(false);

  const [anomalies, setAnomalies] = useState<AnomalyChanceRow[]>([]);
  const [anomalyOptions, setAnomalyOptions] = useState<{ id: string; name: string }[]>([]);
  const [anomaliesLoading, setAnomaliesLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchDamage = async () => {
      setDamageEffectsLoading(true);
      try {
        const effects = await listDamageEffects();
        const mapped = Array.isArray(effects) ? effects.map((e: any) => ({ id: String(e.id), name: e.name })) : [];
        if (active) setDamageEffectOptions(mapped);
      } catch (err) {
        console.error('Errore caricamento effetti danno', err);
      } finally {
        if (active) setDamageEffectsLoading(false);
      }
    };
    const fetchAnomalies = async () => {
      setAnomaliesLoading(true);
      try {
        const anoms = await listAnomalies();
        const mapped = Array.isArray(anoms) ? anoms.map((a: any) => ({ id: String(a.id), name: a.name })) : [];
        if (active) setAnomalyOptions(mapped);
      } catch (err) {
        console.error('Errore caricamento anomalie', err);
      } finally {
        if (active) setAnomaliesLoading(false);
      }
    };
    fetchDamage();
    fetchAnomalies();
    return () => { active = false; };
  }, []);

  const resetAll = () => {
    setName(''); setDescription(''); setWarnings('');
    setActionPointsCost(''); setIndicativeActionPointsCost('');
    setDamageSets([]); setAnomalies([]);
  };

  const handleSave = () => {
    const def: MagicQuiverDefinition = {
      name: name.trim(),
      description: description.trim() || undefined,
      warnings: warnings.trim() || undefined,
      actionPointsCost: actionPointsCost === '' ? null : (Number(actionPointsCost) || 0),
      indicativeActionPointsCost: indicativeActionPointsCost === '' ? null : (Number(indicativeActionPointsCost) || 0),
      damageSets: damageSets.map(d => ({
        damageEffectId: d.damageEffectId,
        guaranteedDamage: Number(d.guaranteedDamage) || 0,
        additionalDamage: Number(d.additionalDamage) || 0,
      })),
      anomalies: anomalies.map(a => ({
        anomalyId: a.anomalyId,
        percent: Math.min(100, Math.max(0, Number(a.percent) || 0))
      }))
    };
    onSave(def);
    resetAll();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Creazione Proiettili Magici — Faretra Magica</DialogTitle>
          <DialogDescription>Definisci pacchetto di frecce magiche con danni, costi, anomalie e avvertenze.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nome freccia */}
          <div>
            <Label htmlFor="name">Nome freccia</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="es. Freccia Infernale" />
          </div>

          {/* Damage effects */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Effetti di danno per freccia</Label>
              <Button variant="secondary" size="sm" onClick={() => setDamageSets(prev => [...prev, { damageEffectId: '', guaranteedDamage: 0, additionalDamage: 0 }])}>Aggiungi effetto</Button>
            </div>
            {damageSets.length === 0 && (
              <p className="text-xs text-muted-foreground">Nessun effetto aggiunto. Usa "Aggiungi effetto" per selezionare tipi di danno.</p>
            )}
            {damageSets.map((row, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-12 md:col-span-5">
                  <Label>Tipo di danno</Label>
                  <Select
                    value={row.damageEffectId}
                    onValueChange={(val) => setDamageSets(prev => prev.map((r, i) => i === idx ? { ...r, damageEffectId: val } : r))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={damageEffectsLoading ? 'Caricamento...' : 'Seleziona effetto'} />
                    </SelectTrigger>
                    <SelectContent>
                      {damageEffectOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-6 md:col-span-3">
                  <Label>Danno assicurato</Label>
                  <Input type="number" min="0" value={row.guaranteedDamage}
                    onChange={(e) => setDamageSets(prev => prev.map((r, i) => i === idx ? { ...r, guaranteedDamage: Number(e.target.value) || 0 } : r))}
                    placeholder="0" />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <Label>Danno aggiuntivo</Label>
                  <Input type="number" min="0" value={row.additionalDamage}
                    onChange={(e) => setDamageSets(prev => prev.map((r, i) => i === idx ? { ...r, additionalDamage: Number(e.target.value) || 0 } : r))}
                    placeholder="0" />
                </div>
                <div className="col-span-12 md:col-span-1 flex items-end">
                  <Button variant="ghost" onClick={() => setDamageSets(prev => prev.filter((_, i) => i !== idx))} className="w-full">Rimuovi</Button>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Definisci più effetti per comporre danni di natura diversa.</p>
          </div>

          {/* Costi Punti Azione */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="apc">Costo punti azione</Label>
              <Input id="apc" type="number" value={actionPointsCost} onChange={(e) => setActionPointsCost(e.target.value)} placeholder="Numero" />
            </div>
            <div>
              <Label htmlFor="iapc">Costo punti azione indicativo</Label>
              <Input id="iapc" type="number" value={indicativeActionPointsCost} onChange={(e) => setIndicativeActionPointsCost(e.target.value)} placeholder="Numero" />
            </div>
          </div>

          {/* Anomalie applicate con percentuale */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Anomalie applicate</Label>
              <Button variant="secondary" size="sm" onClick={() => setAnomalies(prev => [...prev, { anomalyId: '', percent: 0 }])}>Aggiungi anomalia</Button>
            </div>
            {anomalies.length === 0 && (
              <p className="text-xs text-muted-foreground">Nessuna anomalia. Usa "Aggiungi anomalia" per selezionare e impostare percentuale.</p>
            )}
            {anomalies.map((row, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-12 md:col-span-7">
                  <Label>Seleziona anomalia</Label>
                  <Select
                    value={row.anomalyId}
                    onValueChange={(val) => setAnomalies(prev => prev.map((r, i) => i === idx ? { ...r, anomalyId: val } : r))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={anomaliesLoading ? 'Caricamento...' : 'Seleziona anomalia'} />
                    </SelectTrigger>
                    <SelectContent>
                      {anomalyOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-8 md:col-span-4">
                  <Label>Percentuale</Label>
                  <Input type="number" min="0" max="100" value={row.percent}
                    onChange={(e) => setAnomalies(prev => prev.map((r, i) => i === idx ? { ...r, percent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) } : r))}
                    placeholder="0-100" />
                </div>
                <div className="col-span-4 md:col-span-1 flex items-end">
                  <Button variant="ghost" onClick={() => setAnomalies(prev => prev.filter((_, i) => i !== idx))} className="w-full">Rimuovi</Button>
                </div>
              </div>
            ))}
          </div>

          {/* Descrizione */}
          <div>
            <Label htmlFor="desc">Descrizione</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrizione della faretra o delle frecce" />
          </div>

          {/* Warning */}
          <div>
            <Label htmlFor="warn">Avvertenze</Label>
            <Textarea id="warn" value={warnings} onChange={(e) => setWarnings(e.target.value)} placeholder="Eventuali warning o note d'uso" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetAll(); onClose(); }}>Annulla</Button>
          <Button onClick={handleSave}>Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}