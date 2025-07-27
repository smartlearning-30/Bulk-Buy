import { useState, useEffect } from 'react';
import { groupOrderService, participantService, userService } from '@/services/firebaseService';
import { GroupOrder, CreateOrderData, User, UserRole } from '@/types';
import { User as FirebaseUser } from 'firebase/auth';

export const useFirebaseOrders = () => {
  const [orders, setOrders] = useState<GroupOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Initialize auth listener
  useEffect(() => {
    const unsubscribe = userService.onAuthStateChanged(async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          const user = await userService.getUserById(firebaseUser.uid);
          setCurrentUser(user);
        } catch (error) {
          console.error('Error getting user:', error);
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time orders listener
  useEffect(() => {
    console.log('Setting up Firebase orders listener...');
    
    const unsubscribe = groupOrderService.onOrdersSnapshot((orders) => {
      console.log('Firebase orders received:', orders);
      setOrders(orders);
    });

    // Fallback: manually fetch orders after a delay to ensure we have data
    const fallbackTimer = setTimeout(async () => {
      try {
        console.log('Running fallback: manually fetching orders...');
        const manualOrders = await groupOrderService.getAllOrders();
        console.log('Manual orders fetched:', manualOrders);
        if (manualOrders.length > 0 && orders.length === 0) {
          console.log('Setting orders from fallback fetch');
          setOrders(manualOrders);
        }
      } catch (error) {
        console.error('Fallback: Error fetching orders:', error);
      }
    }, 2000); // Wait 2 seconds before fallback

    // Automatically reset accepted orders with no participants
    const resetTimer = setTimeout(async () => {
      try {
        console.log('Auto-resetting accepted orders with no participants...');
        await participantService.resetAcceptedOrdersWithNoParticipants();
      } catch (error) {
        console.error('Auto-reset failed:', error);
      }
    }, 3000); // Wait 3 seconds before auto-reset

    // Automatically check and update expired orders
    const expiredTimer = setTimeout(async () => {
      try {
        console.log('Auto-checking for expired orders...');
        await participantService.checkAndUpdateExpiredOrders();
      } catch (error) {
        console.error('Auto-expired check failed:', error);
      }
    }, 5000); // Wait 5 seconds before checking expired orders

    return () => {
      console.log('Cleaning up Firebase orders listener');
      unsubscribe();
      clearTimeout(fallbackTimer);
      clearTimeout(resetTimer);
      clearTimeout(expiredTimer);
    };
  }, []);

  // Demo data generator (for testing)
  const generateDemoData = async () => {
    if (!currentUser) {
      console.error('No user logged in');
      return;
    }

    setIsLoading(true);
    try {
      const demoOrders: CreateOrderData[] = [
        {
          item: 'Carrots',
          description: 'Fresh orange carrots for healthy street food',
          bulkPrice: 30,
          originalPrice: 45,
          minQuantity: 60,
          maxQuantity: 250,
          unit: 'kg',
          deadline: '2024-02-15',
          location: 'Demo Market',
          deliveryChargePerKm: 5,
          contactPhone: '+91 98765-43215'
        },
        {
          item: 'Ginger',
          description: 'Fresh ginger for chai and street food',
          bulkPrice: 120,
          originalPrice: 160,
          minQuantity: 40,
          maxQuantity: 150,
          unit: 'kg',
          deadline: '2024-02-12',
          location: 'Demo Market',
          deliveryChargePerKm: 6,
          contactPhone: '+91 98765-43216'
        }
      ];

      for (const orderData of demoOrders) {
        await groupOrderService.createOrder(orderData, currentUser.id, currentUser.name);
      }
    } catch (error) {
      console.error('Error generating demo data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createOrder = async (orderData: CreateOrderData, supplierId: string, supplierName: string) => {
    setIsLoading(true);
    try {
      const newOrder = await groupOrderService.createOrder(orderData, supplierId, supplierName);
      return newOrder;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const joinOrder = async (orderId: string, vendorId: string, vendorName: string, quantity: number, vendorLocation?: { lat: number; lng: number }, vendorPhone?: string) => {
    setIsLoading(true);
    try {
      await participantService.joinOrder(orderId, vendorId, vendorName, quantity, vendorLocation, vendorPhone);
    } catch (error) {
      console.error('Error joining order:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getVendorOrders = async (vendorId: string): Promise<GroupOrder[]> => {
    try {
      return await groupOrderService.getOrdersByVendor(vendorId);
    } catch (error) {
      console.error('Error getting vendor orders:', error);
      return [];
    }
  };

  const getSupplierOrders = async (supplierId: string): Promise<GroupOrder[]> => {
    try {
      return await groupOrderService.getOrdersBySupplier(supplierId);
    } catch (error) {
      console.error('Error getting supplier orders:', error);
      return [];
    }
  };

  const updateParticipantQuantity = async (orderId: string, vendorId: string, newQuantity: number) => {
    setIsLoading(true);
    try {
      await participantService.updateParticipantQuantity(orderId, vendorId, newQuantity);
    } catch (error) {
      console.error('Error updating participant quantity:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateParticipantDetails = async (orderId: string, vendorId: string, vendorPhone: string, vendorLocation: { lat: number; lng: number }) => {
    setIsLoading(true);
    try {
      await participantService.updateParticipantDetails(orderId, vendorId, vendorPhone, vendorLocation);
    } catch (error) {
      console.error('Error updating participant details:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const removeParticipant = async (orderId: string, vendorId: string) => {
    setIsLoading(true);
    try {
      await participantService.removeParticipant(orderId, vendorId);
    } catch (error) {
      console.error('Error removing participant:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrder = async (orderId: string, updates: Partial<GroupOrder>) => {
    setIsLoading(true);
    try {
      await groupOrderService.updateOrder(orderId, updates);
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to calculate remaining available quantity
  const getRemainingQuantity = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return 0;
    return Math.max(0, order.maxQuantity - order.totalQuantity);
  };

  // Helper function to check if order is available for joining
  const isOrderAvailable = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return false;
    return order.status === 'open' && order.totalQuantity < order.maxQuantity;
  };

  // Mark a participant as reviewed
  const markParticipantReviewed = (orderId: string, vendorId: string) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        return {
          ...order,
          participants: order.participants.map(p =>
            p.vendorId === vendorId ? { ...p, hasReviewed: true } : p
          )
        };
      }
      return order;
    }));
  };

  return {
    orders,
    isLoading,
    currentUser,
    createOrder,
    joinOrder,
    getVendorOrders,
    getSupplierOrders,
    generateDemoData,
    updateParticipantQuantity,
    updateParticipantDetails,
    removeParticipant,
    updateOrder,
    getRemainingQuantity,
    isOrderAvailable,
    markParticipantReviewed
  };
}; 