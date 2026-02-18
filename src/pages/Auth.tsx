import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Auth = () => {
  const { user, isLoading, signInWithPassword, signUp, resendConfirmationEmail, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await signInWithPassword(email.trim(), password);
      } else {
        if (password !== confirm) {
          setSubmitting(false);
          return;
        }
        await signUp(email.trim(), password, username.trim());
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Dice&Don't</CardTitle>
          <CardDescription>
            {mode === 'login'
              ? 'Accedi al tuo account per gestire la tua scheda personaggio'
              : 'Crea un nuovo account per iniziare'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* form email/password invariato */}
            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="il_tuo_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="nickname"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tuo@esempio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="confirm">Conferma password</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
            )}
            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting
                ? (mode === 'login' ? 'Accesso in corso...' : 'Registrazione in corso...')
                : (mode === 'login' ? 'Accedi' : 'Registrati')}
            </Button>
          </form>

          {/* RIMOSSO: sezione 'Accedi con Google (solo migrazione)' */}
          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground">
            </p>
          </div>

          {mode === 'login' && (
            <div className="text-center text-sm text-muted-foreground space-y-2">
              <p>
                Non hai ricevuto l'email di conferma?{' '}
                <button
                  type="button"
                  onClick={() => email && resendConfirmationEmail(email.trim())}
                  className="text-primary hover:underline"
                >
                  Reinvia email di conferma
                </button>
              </p>
              <p>
                Password dimenticata?{' '}
                <button
                  type="button"
                  onClick={() => email && resetPassword(email.trim())}
                  className="text-primary hover:underline"
                >
                  Reimposta password via email
                </button>
              </p>
            </div>
          )}
          <div className="text-center text-sm text-muted-foreground">
            {mode === 'login' ? (
              <p>
                Non hai un account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-primary hover:underline"
                >
                  Registrati
                </button>
              </p>
            ) : (
              <p>
                Hai già un account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-primary hover:underline"
                >
                  Accedi
                </button>
              </p>
            )}
          </div>
          <div className="text-center text-xs text-muted-foreground">
            <p>
              Registrandoti accetti i nostri termini di servizio e la privacy policy
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;