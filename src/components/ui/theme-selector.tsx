import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette, Sun, Sparkles } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export const ThemeSelector: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Scegli il Tema
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant={theme === 'classic' ? 'default' : 'outline'}
            onClick={() => setTheme('classic')}
            className="flex flex-col items-center gap-2 h-auto p-4"
          >
            <Sun className="h-6 w-6" />
            <span>Classico</span>
          </Button>
          
          <Button
            variant={theme === 'gold-black' ? 'default' : 'outline'}
            onClick={() => setTheme('gold-black')}
            className="flex flex-col items-center gap-2 h-auto p-4"
          >
            <Sparkles className="h-6 w-6" />
            <span>Dice&Don't</span>
          </Button>
        </div>
        
        <div className="mt-4 text-sm text-muted-foreground text-center">
          {theme === 'classic' 
            ? 'Stile classico con colori chiari'
            : 'Tema elegante Dice&Don\'t'
          }
        </div>
      </CardContent>
    </Card>
  );
};