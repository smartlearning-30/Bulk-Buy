import { useState, useEffect } from 'react';
import { GroupOrder, CreateOrderData, Participant } from '@/types';

// Mock data for demonstration
const mockOrders: GroupOrder[] = [
  {
    id: '1',
    supplierId: 'supplier1',
    supplierName: 'Fresh Farms Wholesale',
    item: 'Onions',
    description: 'Premium quality red onions, freshly harvested',
    bulkPrice: 25,
    originalPrice: 35,
    minQuantity: 100,
    maxQuantity: 500,
    unit: 'kg',
    deadline: '2024-01-30',
    status: 'open',
    createdAt: '2024-01-25',
    participants: [
      {
        id: 'p1',
        vendorId: 'v1',
        vendorName: 'Raj Chaat Corner',
        quantity: 30,
        joinedAt: '2024-01-25'
      },
      {
        id: 'p2',
        vendorId: 'v2',
        vendorName: 'Mumbai Street Foods',
        quantity: 25,
        joinedAt: '2024-01-26'
      }
    ],
    totalQuantity: 55,
    location: 'Mumbai Central'
  },
  {
    id: '2',
    supplierId: 'supplier2',
    supplierName: 'Spice Kingdom',
    item: 'Potatoes',
    description: 'Grade A potatoes perfect for street food preparation',
    bulkPrice: 18,
    originalPrice: 28,
    minQuantity: 150,
    maxQuantity: 600,
    unit: 'kg',
    deadline: '2024-02-02',
    status: 'locked',
    createdAt: '2024-01-20',
    participants: [
      {
        id: 'p3',
        vendorId: 'v3',
        vendorName: 'Delhi Delights',
        quantity: 50,
        joinedAt: '2024-01-21'
      },
      {
        id: 'p4',
        vendorId: 'v4',
        vendorName: 'Kolkata Kitchen',
        quantity: 40,
        joinedAt: '2024-01-22'
      },
      {
        id: 'p5',
        vendorId: 'v5',
        vendorName: 'Chennai Chats',
        quantity: 60,
        joinedAt: '2024-01-23'
      }
    ],
    totalQuantity: 150,
    location: 'Delhi Market'
  }
];

export const useGroupOrders = () => {
  const [orders, setOrders] = useState<GroupOrder[]>(mockOrders);
  const [isLoading, setIsLoading] = useState(false);

  const createOrder = async (orderData: CreateOrderData, supplierId: string, supplierName: string) => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newOrder: GroupOrder = {
      ...orderData,
      id: Math.random().toString(36).substr(2, 9),
      supplierId,
      supplierName,
      status: 'open',
      createdAt: new Date().toISOString().split('T')[0],
      participants: [],
      totalQuantity: 0
    };

    setOrders(prev => [newOrder, ...prev]);
    setIsLoading(false);
    return newOrder;
  };

  const joinOrder = async (orderId: string, vendorId: string, vendorName: string, quantity: number) => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        const participant: Participant = {
          id: Math.random().toString(36).substr(2, 9),
          vendorId,
          vendorName,
          quantity,
          joinedAt: new Date().toISOString().split('T')[0]
        };
        
        const updatedOrder = {
          ...order,
          participants: [...order.participants, participant],
          totalQuantity: order.totalQuantity + quantity
        };
        
        // Check if minimum quantity is reached
        if (updatedOrder.totalQuantity >= order.minQuantity && order.status === 'open') {
          updatedOrder.status = 'locked';
        }
        
        return updatedOrder;
      }
      return order;
    }));
    
    setIsLoading(false);
  };

  const getVendorOrders = (vendorId: string) => {
    return orders.filter(order => 
      order.participants.some(p => p.vendorId === vendorId)
    );
  };

  const getSupplierOrders = (supplierId: string) => {
    return orders.filter(order => order.supplierId === supplierId);
  };

  return {
    orders,
    isLoading,
    createOrder,
    joinOrder,
    getVendorOrders,
    getSupplierOrders
  };
};