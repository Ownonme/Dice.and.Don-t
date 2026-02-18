import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCharacters } from '@/hooks/useCharacters';
import CharacterCreation from '@/components/character/CharacterCreation';
import { DiceLoader } from '@/components/ui/dice-loader';
import { ThemeSelector } from '@/components/ui/theme-selector';
import Snowfall from 'react-snowfall';

const Index = () => {
  const { user, signOut, isLoading: authLoading, isAdmin } = useAuth();
  const { characters, isLoading: charactersLoading } = useCharacters();
  const navigate = useNavigate();
  const [showCharacterCreation, setShowCharacterCreation] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleCharacterCreated = (characterId: string) => {
    setShowCharacterCreation(false);
    navigate(`/character/${characterId}`);
  };

  const handleCharacterNavigation = () => {
    if (characters.length === 0) {
      setShowCharacterCreation(true);
    } else {
      // Se c'è solo un personaggio, vai direttamente a quello
      if (characters.length === 1) {
        navigate(`/character/${characters[0].id}`);
      } else {
        // Se ci sono più personaggi, vai alla pagina di selezione
        navigate('/character');
      }
    }
  };

  // Commentiamo temporaneamente il controllo del caricamento
  /*
  if (authLoading || charactersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento personaggi...</p>
        </div>
      </div>
    );
  }
  */

  // NB: nessun nuovo hook oltre questo punto
  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <>
      <Snowfall
        color="white"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 50,
        }}
      />
      <div className="min-h-screen bg-background">
      <header className="p-4">
        <div className="container mx-auto flex items-center justify-between border-b pb-4">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold">Dice&Don't</h1>
            <span className="text-sm text-muted-foreground mt-1">
              Benvenuto, {user.user_metadata?.username || user.user_metadata?.full_name || user.email}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={signOut}>
              Disconnetti
            </Button>
          </div>
        </div>
      </header>

      {/* RIMOSSO: pannello 'Imposta password' */}

      <main className="container mx-auto p-4">
        <div className="text-center py-12">
          <h2 className="text-4xl font-bold mb-4">Benvenuto in Dice&Don't</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Il tuo sistema completo per gestire partite di gioco di ruolo da tavolo
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Sezione Gestione Personaggi */}
            <div className="p-6 border rounded-lg hover:bg-muted/50 transition-colors">
                 <div onClick={charactersLoading ? undefined : handleCharacterNavigation} className={charactersLoading ? "cursor-wait" : "cursor-pointer"}>
              <h3 className="text-lg font-semibold mb-2">Gestione Personaggi</h3>
              <div className="text-muted-foreground mb-4 flex items-center justify-center min-h-6">
                {charactersLoading ? (
                  <DiceLoader mode="inline" size="sm" label={null} text="D20" />
                ) : (
                  <span>
                    {characters.length === 0 ? 'Crea il tuo primo personaggio per iniziare' : `Gestisci i tuoi ${characters.length} personaggi`}
                  </span>
                )}
              </div>
              {!charactersLoading && characters.length === 0 && (
                <Button onClick={() => navigate('/character/new')} className="w-full">
                  Nuovo Personaggio
                </Button>
              )}
               </div>
               <div className="mt-3">
                 <Button variant="secondary" onClick={handleCharacterNavigation} className="w-full" disabled={charactersLoading}>Apri</Button>
               </div>
            </div>
                  
                  {/* Sostituito "Scheda Personaggio" con "Mercato" */}
                  <div className="p-6 border rounded-lg hover:bg-muted/50 transition-colors">
                       <div onClick={() => navigate('/market')} className="cursor-pointer">
                    <h3 className="text-lg font-semibold mb-2">Mercato</h3>
                    <p className="text-muted-foreground">Esplora città, negozi e acquista oggetti, armi e servizi</p>
                       </div>
                       <div className="mt-3">
                         <Button variant="secondary" onClick={() => navigate('/market')} className="w-full">Apri</Button>
                       </div>
                  </div>
                  
                  <div className="p-6 border rounded-lg hover:bg-muted/50 transition-colors">
                       <div onClick={() => navigate('/dice-dashboard')} className="cursor-pointer">
                    <h3 className="text-lg font-semibold mb-2">Sistema Dadi</h3>
                    <p className="text-muted-foreground">Tira i dadi condiviso con tutti i giocatori in tempo reale</p>
                       </div>
                       <div className="mt-3">
                         <Button variant="secondary" onClick={() => navigate('/dice-dashboard')} className="w-full">Apri</Button>
                       </div>
                  </div>
                  <div className="p-6 border rounded-lg hover:bg-muted/50 transition-colors">
                       <div onClick={() => navigate('/magic-library')} className="cursor-pointer">
                    <h3 className="text-lg font-semibold mb-2">Libreria Magie</h3>
                    <p className="text-muted-foreground">Esplora e gestisci tutte le magie organizzate per categoria e specificità</p>
                       </div>
                       <div className="mt-3">
                         <Button variant="secondary" onClick={() => navigate('/magic-library')} className="w-full">Apri</Button>
                       </div>
                  </div>
                  <div className="p-6 border rounded-lg hover:bg-muted/50 transition-colors">
                       <div onClick={() => navigate('/ability-library')} className="cursor-pointer">
                    <h3 className="text-lg font-semibold mb-2">Libreria Abilità</h3>
                    <p className="text-muted-foreground">Gestisci tutte le abilità organizzate per categoria e livello di competenza</p>
                       </div>
                       <div className="mt-3">
                         <Button variant="secondary" onClick={() => navigate('/ability-library')} className="w-full">Apri</Button>
                       </div>
                  </div>
                  <div className="p-6 border rounded-lg hover:bg-muted/50 transition-colors">
                       <div onClick={() => navigate('/glossary')} className="cursor-pointer">
                    <h3 className="text-lg font-semibold mb-2">Glossario</h3>
                    <p className="text-muted-foreground">Raccolta di termini e definizioni del gioco</p>
                       </div>
                       <div className="mt-3">
                         <Button variant="secondary" onClick={() => navigate('/glossary')} className="w-full">Apri</Button>
                       </div>
                  </div>
                  <div className="p-6 border rounded-lg hover:bg-muted/50 transition-colors">
                       <div onClick={() => navigate('/diary')} className="cursor-pointer">
                    <h3 className="text-lg font-semibold mb-2">Diario & Note</h3>
                    <p className="text-muted-foreground">Tieni traccia della storia e degli appunti personali</p>
                       </div>
                       <div className="mt-3">
                         <Button variant="secondary" onClick={() => navigate('/diary')} className="w-full">Apri</Button>
                       </div>
                  </div>
                  {isAdmin && (
                    <div className="p-6 border rounded-lg hover:bg-muted/50 transition-colors">
                         <div onClick={() => navigate('/admin/console')} className="cursor-pointer">
                      <h3 className="text-lg font-semibold mb-2">Console Admin</h3>
                      <p className="text-muted-foreground">Gestione anomalie e creazione tipi di danno</p>
                         </div>
                         <div className="mt-3">
                           <Button variant="secondary" onClick={() => navigate('/admin/console')} className="w-full">Apri</Button>
                         </div>
                    </div>
                  )}
                </div>
                
                {/* Aggiungi il selettore tema */}
                <div className="mt-8 flex justify-center">
                  <ThemeSelector />
                </div>
        </div>
      </main>
      
      <CharacterCreation
        isOpen={showCharacterCreation}
        onClose={() => setShowCharacterCreation(false)}
        onCharacterCreated={handleCharacterCreated}
      />
      </div>
    </>
  );
};

export default Index;
