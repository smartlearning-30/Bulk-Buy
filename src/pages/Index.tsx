import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import Header from '@/components/layout/Header';
import VendorDashboard from '@/components/vendor/VendorDashboard';
import SupplierDashboard from '@/components/supplier/SupplierDashboard';

const Index = () => {
  const { user } = useAuth();

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
