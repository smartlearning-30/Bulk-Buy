import { useState, useEffect } from 'react';
import { GroupOrder, CreateOrderData, Participant } from '@/types';

// Enhanced mock data for better demo
const mockOrders: GroupOrder[] = [
  {
    id: '1',
    supplierId: 'supplier1',
    supplierName: 'Fresh Farms Wholesale',
    item: 'Onions',
    description: 'Premium quality red onions, freshly harvested from Nashik farms',
    bulkPrice: 25,
    originalPrice: 35,
    minQuantity: 100,
    maxQuantity: 500,
    unit: 'kg',
    deadline: '2024-01-30',
    status: 'accepted',
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
    location: 'Mumbai Central',
    deliveryChargePerKm: 5,
    contactPhone: '+91 98765-43210'
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
    status: 'accepted',
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
    location: 'Delhi Market',
    deliveryChargePerKm: 4,
    contactPhone: '+91 98765-43211'
  },
  {
    id: '3',
    supplierId: 'supplier3',
    supplierName: 'Organic Valley',
    item: 'Tomatoes',
    description: 'Fresh organic tomatoes, perfect for street food and chaat preparation',
    bulkPrice: 45,
    originalPrice: 65,
    minQuantity: 80,
    maxQuantity: 300,
    unit: 'kg',
    deadline: '2024-02-05',
    status: 'accepted',
    createdAt: '2024-01-28',
    participants: [
      {
        id: 'p6',
        vendorId: 'v6',
        vendorName: 'Pune Pav Bhaji',
        quantity: 20,
        joinedAt: '2024-01-28'
      }
    ],
    totalQuantity: 20,
    location: 'Pune Market',
    deliveryChargePerKm: 6,
    contactPhone: '+91 98765-43212'
  },
  {
    id: '4',
    supplierId: 'supplier4',
    supplierName: 'Grain Masters',
    item: 'Rice',
    description: 'Premium basmati rice for biryani and pulao preparation',
    bulkPrice: 55,
    originalPrice: 75,
    minQuantity: 200,
    maxQuantity: 800,
    unit: 'kg',
    deadline: '2024-02-10',
    status: 'accepted',
    createdAt: '2024-01-29',
    participants: [    ],
    totalQuantity: 0,
    location: 'Hyderabad Market',
    deliveryChargePerKm: 7,
    contactPhone: '+91 98765-43213'
  },
  {
    id: '5',
    supplierId: 'supplier5',
    supplierName: 'Dairy Delights',
    item: 'Paneer',
    description: 'Fresh homemade paneer for street food and snacks',
    bulkPrice: 180,
    originalPrice: 220,
    minQuantity: 50,
    maxQuantity: 200,
    unit: 'kg',
    deadline: '2024-02-01',
    status: 'accepted',
    createdAt: '2024-01-24',
    participants: [
      {
        id: 'p7',
        vendorId: 'v7',
        vendorName: 'Amritsari Kulcha',
        quantity: 15,
        joinedAt: '2024-01-25'
      },
      {
        id: 'p8',
        vendorId: 'v8',
        vendorName: 'Dilli Chaat House',
        quantity: 20,
        joinedAt: '2024-01-26'
      },
      {
        id: 'p9',
        vendorId: 'v9',
        vendorName: 'Mumbai Vada Pav',
        quantity: 15,
        joinedAt: '2024-01-27'
      }
    ],
    totalQuantity: 50,
    location: 'Amritsar Market',
    deliveryChargePerKm: 3,
    contactPhone: '+91 98765-43214'
  }
];

export const useGroupOrders = () => {
  const [orders, setOrders] = useState<GroupOrder[]>(mockOrders);
  const [isLoading, setIsLoading] = useState(false);

  // Demo data generator
  const generateDemoData = () => {
    const demoOrders: GroupOrder[] = [
      {
        id: 'demo1',
        supplierId: 'demo-supplier1',
        supplierName: 'Demo Fresh Foods',
        item: 'Carrots',
        description: 'Fresh orange carrots for healthy street food',
        bulkPrice: 30,
        originalPrice: 45,
        minQuantity: 60,
        maxQuantity: 250,
        unit: 'kg',
        deadline: '2024-02-15',
        status: 'accepted',
        createdAt: new Date().toISOString().split('T')[0],
        participants: [],
        totalQuantity: 0,
        location: 'Demo Market',
        deliveryChargePerKm: 5,
        contactPhone: '+91 98765-43215'
      },
      {
        id: 'demo2',
        supplierId: 'demo-supplier2',
        supplierName: 'Demo Spice Co.',
        item: 'Ginger',
        description: 'Fresh ginger for chai and street food',
        bulkPrice: 120,
        originalPrice: 160,
        minQuantity: 40,
        maxQuantity: 150,
        unit: 'kg',
        deadline: '2024-02-12',
        status: 'accepted',
        createdAt: new Date().toISOString().split('T')[0],
        participants: [],
        totalQuantity: 0,
        location: 'Demo Market',
        deliveryChargePerKm: 6,
        contactPhone: '+91 98765-43216'
      }
    ];
    
    setOrders(prev => [...demoOrders, ...prev]);
  };

  const createOrder = async (orderData: CreateOrderData, supplierId: string, supplierName: string) => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newOrder: GroupOrder = {
      ...orderData,
      id: Math.random().toString(36).substr(2, 9),
      supplierId,
      supplierName,
      status: 'accepted',
      createdAt: new Date().toISOString().split('T')[0],
      participants: [],
      totalQuantity: 0
    };

    setOrders(prev => [newOrder, ...prev]);
    setIsLoading(false);
    return newOrder;
  };

  const joinOrder = async (orderId: string, vendorId: string, vendorName: string, quantity: number, vendorLocation?: { lat: number; lng: number }, vendorPhone?: string) => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        // Check if vendor already joined this order
        const existingParticipant = order.participants.find(p => p.vendorId === vendorId);
        if (existingParticipant) {
          throw new Error('Vendor has already joined this order');
        }

        // Validate minimum quantity per vendor
        if (quantity < order.minQuantity) {
          throw new Error(`Minimum order quantity is ${order.minQuantity}${order.unit}. You ordered ${quantity}${order.unit}`);
        }

        // Check if adding this quantity would exceed max quantity
        if (order.totalQuantity + quantity > order.maxQuantity) {
          throw new Error(`Cannot add ${quantity}${order.unit}. Maximum available quantity is ${order.maxQuantity - order.totalQuantity}${order.unit}`);
        }

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
        if (updatedOrder.totalQuantity >= order.minQuantity && order.status === 'accepted') {
          updatedOrder.status = 'accepted';
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

  // Update participant quantity
  const updateParticipantQuantity = async (orderId: string, vendorId: string, newQuantity: number) => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        const participantIndex = order.participants.findIndex(p => p.vendorId === vendorId);
        if (participantIndex === -1) {
          throw new Error('Participant not found');
        }

        const oldQuantity = order.participants[participantIndex].quantity;
        const quantityDifference = newQuantity - oldQuantity;

        // Validate minimum quantity
        if (newQuantity < order.minQuantity) {
          throw new Error(`Minimum order quantity is ${order.minQuantity}${order.unit}. You ordered ${newQuantity}${order.unit}`);
        }

        // Check if adding this quantity would exceed max quantity
        if (order.totalQuantity + quantityDifference > order.maxQuantity) {
          throw new Error(`Cannot update to ${newQuantity}${order.unit}. Maximum available quantity is ${order.maxQuantity - order.totalQuantity + oldQuantity}${order.unit}`);
        }

        const updatedParticipants = [...order.participants];
        updatedParticipants[participantIndex] = {
          ...updatedParticipants[participantIndex],
          quantity: newQuantity
        };

        const updatedOrder = {
          ...order,
          participants: updatedParticipants,
          totalQuantity: order.totalQuantity + quantityDifference
        };

        // Check if minimum quantity is reached
        if (updatedOrder.totalQuantity >= order.minQuantity && order.status === 'accepted') {
          updatedOrder.status = 'accepted';
        }

        return updatedOrder;
      }
      return order;
    }));
    
    setIsLoading(false);
  };

  // Remove participant from order
  const removeParticipant = async (orderId: string, vendorId: string) => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        const participant = order.participants.find(p => p.vendorId === vendorId);
        if (!participant) {
          throw new Error('Participant not found');
        }

        const updatedOrder = {
          ...order,
          participants: order.participants.filter(p => p.vendorId !== vendorId),
          totalQuantity: order.totalQuantity - participant.quantity
        };

        // If total quantity drops below minimum, unlock the order
        if (updatedOrder.totalQuantity < order.minQuantity && order.status === 'accepted') {
          updatedOrder.status = 'accepted';
        }

        return updatedOrder;
      }
      return order;
    }));
    
    setIsLoading(false);
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
    return order.status === 'accepted' && order.totalQuantity < order.maxQuantity;
  };

  return {
    orders,
    isLoading,
    createOrder,
    joinOrder,
    getVendorOrders,
    getSupplierOrders,
    generateDemoData,
    getRemainingQuantity,
    isOrderAvailable,
    updateParticipantQuantity,
    removeParticipant
  };
};