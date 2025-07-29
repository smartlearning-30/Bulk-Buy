import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { ShoppingCart, LogOut, User, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useTheme } from '@/App';
import { Sun, Moon } from 'lucide-react';

const Header = () => {
  const { user, logout } = useFirebaseAuth();
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  if (!user) return null;

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-card/80">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-glow rounded-xl flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Bulk Buy Platform</h1>
            <p className="text-sm text-muted-foreground">Street Vendor Collaboration</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Dialog open={isHowItWorksOpen} onOpenChange={setIsHowItWorksOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                How it Works
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>How Bulk Buy Platform Works</DialogTitle>
                <DialogDescription>
                  A simple guide to understanding the platform
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                      1
                    </div>
                    <div>
                      <h3 className="font-semibold">For Suppliers</h3>
                      <p className="text-sm text-muted-foreground">
                        Create group orders with bulk pricing. Set minimum quantities and deadlines. 
                        Watch as vendors join your deals and reach the minimum threshold.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                      2
                    </div>
                    <div>
                      <h3 className="font-semibold">For Vendors</h3>
                      <p className="text-sm text-muted-foreground">
                        Browse available group orders, see bulk discounts, and join with your desired quantity. 
                        Save money through collective buying power.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                      3
                    </div>
                    <div>
                      <h3 className="font-semibold">Deal Locking</h3>
                      <p className="text-sm text-muted-foreground">
                        When minimum quantity is reached, the deal gets "locked" and suppliers 
                        can coordinate delivery with all participating vendors.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">Benefits</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Vendors save 20-40% on bulk purchases</li>
                    <li>• Suppliers get guaranteed minimum orders</li>
                    <li>• Reduced logistics costs through consolidation</li>
                    <li>• Transparent pricing and participation</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-foreground">{user.name}</span>
            </div>
            <Badge variant={user.role === 'vendor' ? 'default' : 'secondary'}>
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </Badge>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleTheme}
            className="flex items-center gap-2"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === 'dark' ? 'Light' : 'Dark'}
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={logout}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;