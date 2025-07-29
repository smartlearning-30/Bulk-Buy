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
          // Silent error
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time orders listener
  useEffect(() => {
  
    
    const unsubscribe = groupOrderService.onOrdersSnapshot((orders) => {
      
      // Ensure all participants have consistent hasReviewed field
      const processedOrders = orders.map(order => ({
        ...order,
        participants: order.participants.map(participant => ({
          ...participant,
          hasReviewed: participant.hasReviewed === true
        }))
      }));
      
      setOrders(processedOrders);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Demo data generator (for testing)
  const generateDemoData = async () => {
    if (!currentUser) {
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
      // Silent demo data generation
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
      // Silent error
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
      // Silent error
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getVendorOrders = async (vendorId: string): Promise<GroupOrder[]> => {
    try {
      return await groupOrderService.getOrdersByVendor(vendorId);
    } catch (error) {
      // Silent error
      return [];
    }
  };

  const getSupplierOrders = async (supplierId: string): Promise<GroupOrder[]> => {
    try {
      return await groupOrderService.getOrdersBySupplier(supplierId);
    } catch (error) {
      // Silent error
      return [];
    }
  };

  const updateParticipantQuantity = async (orderId: string, vendorId: string, newQuantity: number) => {
    setIsLoading(true);
    try {
      await participantService.updateParticipantQuantity(orderId, vendorId, newQuantity);
    } catch (error) {
      // Silent error
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
      // Silent error
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
      // Silent error
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
      // Silent error
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
  const markParticipantReviewed = async (orderId: string, vendorId: string) => {
    try {
      
      // Update in Firebase first
      await participantService.markParticipantReviewed(orderId, vendorId);
      
      
      // Then update local state immediately for better UX
      setOrders(prev => {
        const updatedOrders = prev.map(order => {
          if (order.id === orderId) {
            const updatedParticipants = order.participants.map(p =>
              p.vendorId === vendorId ? { ...p, hasReviewed: true } : p
            );
            
            
            return {
              ...order,
              participants: updatedParticipants
            };
          }
          return order;
        });
        
        
        return updatedOrders;
      });
      
      
    } catch (error) {
      // Silent error
      throw error;
    }
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