import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { UserRole } from '@/types';
import { toast } from '@/hooks/use-toast';
import { Loader2, ShoppingCart, Store, Sparkles, UserPlus, LogIn } from 'lucide-react';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [activeTab, setActiveTab] = useState<UserRole>('vendor');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const { login, register, isLoading } = useFirebaseAuth();

  const handleDemoMode = () => {
    setEmail('demo@example.com');
    setPassword('demo123');
    setName(activeTab === 'vendor' ? 'Demo Vendor' : 'Demo Supplier');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !name) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    try {
      if (isRegisterMode) {
        await register(email, password, activeTab, name);
        toast({
          title: "Account Created!",
          description: `Successfully registered as ${activeTab}`,
          variant: "default"
        });
      } else {
        await login(email, password, activeTab, name);
        toast({
          title: "Welcome!",
          description: `Successfully logged in as ${activeTab}`,
          variant: "default"
        });
      }
    } catch (error: any) {
      toast({
        title: isRegisterMode ? "Registration Failed" : "Login Failed",
        description: error.message || "Please check your credentials",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary-glow rounded-2xl flex items-center justify-center">
            <ShoppingCart className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Bulk Buy Platform
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Join the community of street food vendors and suppliers
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Mode Toggle */}
          <div className="flex items-center justify-center mb-6">
            <div className="bg-muted rounded-lg p-1 flex">
              <button
                type="button"
                onClick={() => setIsRegisterMode(false)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  !isRegisterMode 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LogIn className="w-4 h-4" />
                Login
              </button>
              <button
                type="button"
                onClick={() => setIsRegisterMode(true)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  isRegisterMode 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                Register
              </button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as UserRole)}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="vendor" className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Vendor
              </TabsTrigger>
              <TabsTrigger value="supplier" className="flex items-center gap-2">
                <Store className="w-4 h-4" />
                Supplier
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-4">
              <TabsContent value="vendor" className="space-y-4">
                <div className="text-center p-4 bg-accent rounded-lg">
                  <p className="text-sm text-accent-foreground">
                    {isRegisterMode 
                      ? "Create your vendor account to join group orders and save on bulk purchases"
                      : "Join group orders and save on bulk purchases"
                    }
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="supplier" className="space-y-4">
                <div className="text-center p-4 bg-secondary/10 rounded-lg">
                  <p className="text-sm text-secondary">
                    {isRegisterMode 
                      ? "Create your supplier account to create bulk deals and manage vendor orders"
                      : "Create bulk deals and manage vendor orders"
                    }
                  </p>
                </div>
              </TabsContent>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder={isRegisterMode ? "Enter your full name" : "Enter your name"}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={isRegisterMode ? "Enter your email address" : "Enter your email"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={isRegisterMode ? "Create a strong password" : "Enter your password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  {isRegisterMode && (
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 6 characters long
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    className="flex-1 bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90 shadow-lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isRegisterMode ? 'Creating Account...' : 'Signing in...'}
                      </>
                    ) : (
                      isRegisterMode 
                        ? `Create ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Account`
                        : `Sign in as ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`
                    )}
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={handleDemoMode}
                    className="flex items-center gap-2"
                    disabled={isLoading}
                  >
                    <Sparkles className="w-4 h-4" />
                    Demo
                  </Button>
                </div>
              </div>
            </form>
          </Tabs>
          
          {/* Helpful message */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {isRegisterMode 
                ? "Already have an account? " 
                : "Don't have an account? "
              }
              <button
                type="button"
                onClick={() => setIsRegisterMode(!isRegisterMode)}
                className="text-primary hover:underline font-medium"
              >
                {isRegisterMode ? "Sign in here" : "Create account here"}
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;