export interface GroupOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  item: string;
  description: string;
  bulkPrice: number;
  originalPrice: number;
  minQuantity: number;
  maxQuantity: number;
  unit: string;
  deadline: string;
  status: 'open' | 'accepted' | 'completed' | 'cancelled' | 'expired';
  createdAt: string;
  participants: Participant[];
  totalQuantity: number;
  location: string;
  deliveryChargePerKm?: number;
  contactPhone?: string;
}

export interface Participant {
  id: string;
  vendorId: string;
  vendorName: string;
  quantity: number;
  joinedAt: string;
  vendorPhone?: string;
  vendorLocation?: { lat: number; lng: number };
  hasReviewed?: boolean; // Added to track if vendor has reviewed
}

export type UserRole = 'vendor' | 'supplier';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface CreateOrderData {
  item: string;
  description: string;
  bulkPrice: number;
  originalPrice: number;
  minQuantity: number;
  maxQuantity: number;
  unit: string;
  deadline: string;
  location: string;
  deliveryChargePerKm: number;
  contactPhone: string;
}

export interface Review {
  id: string;
  orderId: string;
  supplierId: string;
  supplierName: string;
  vendorId: string;
  vendorName: string;
  orderItem: string;
  rating: number;
  comment: string;
  createdAt: string;
  orderQuantity: string;
  orderValue: string;
}