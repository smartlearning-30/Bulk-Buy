import React from 'react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import LoginForm from '@/components/auth/LoginForm';
import Header from '@/components/layout/Header';
import VendorDashboard from '@/components/vendor/VendorDashboard';
import SupplierDashboard from '@/components/supplier/SupplierDashboard';

const Index = () => {
  const { user, isLoading } = useFirebaseAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {user.role === 'vendor' ? <VendorDashboard /> : <SupplierDashboard />}
    </div>
  );
};

export default Index;
