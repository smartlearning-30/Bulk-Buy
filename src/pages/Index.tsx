import React from 'react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import LoginForm from '@/components/auth/LoginForm';
import Header from '@/components/layout/Header';
import VendorDashboard from '@/components/vendor/VendorDashboard';
import SupplierDashboard from '@/components/supplier/SupplierDashboard';

const Index = () => {
  const { user } = useFirebaseAuth();

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
