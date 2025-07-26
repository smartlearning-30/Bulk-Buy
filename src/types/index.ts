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
  status: 'open' | 'locked' | 'completed';
  createdAt: string;
  participants: Participant[];
  totalQuantity: number;
  location: string;
}

export interface Participant {
  id: string;
  vendorId: string;
  vendorName: string;
  quantity: number;
  joinedAt: string;
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
}