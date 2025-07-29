import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser 
} from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { GroupOrder, CreateOrderData, Participant, User, UserRole, Review } from '@/types';

// Haversine formula for calculating distance between two coordinates
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Collection names
const COLLECTIONS = {
  USERS: 'users',
  GROUP_ORDERS: 'groupOrders',
  PARTICIPANTS: 'participants',
  REVIEWS: 'reviews'
} as const;

// User Service
export const userService = {
  // Register new user
  async register(email: string, password: string, role: UserRole, name: string): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user: User = {
        id: userCredential.user.uid,
        email,
        role,
        name: name // Placeholder, will be updated later if needed
      };
      
      // Save user data to Firestore
      await addDoc(collection(db, COLLECTIONS.USERS), {
        ...user,
        createdAt: serverTimestamp()
      });
      
      return user;
    } catch (error) {
      throw error;
    }
  },

  // Login user
  async login(email: string, password: string): Promise<FirebaseUser> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      throw error;
    }
  },

  // Logout user
  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  },

  // Get user by ID
  async getUserById(userId: string): Promise<User | null> {
    try {
      const usersRef = collection(db, COLLECTIONS.USERS);
      const q = query(usersRef, where('id', '==', userId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return userDoc.data() as User;
      }
      return null;
    } catch (error) {
      throw error;
    }
  },

  // Listen to auth state changes
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  }
};

// Group Order Service
export const groupOrderService = {
  // Create new group order
  async createOrder(orderData: CreateOrderData, supplierId: string, supplierName: string): Promise<GroupOrder> {
    try {
      const userDoc = await userService.getUserById(supplierId);
      
      if (!userDoc) {
        // Don't throw error, just continue
      }

      const order: Omit<GroupOrder, 'id'> = {
        supplierId,
        supplierName,
        ...orderData,
        status: 'open',
        createdAt: new Date().toISOString().split('T')[0],
        participants: [],
        totalQuantity: 0
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.GROUP_ORDERS), {
        ...order,
        createdAt: serverTimestamp()
      });

      const createdOrder = { ...order, id: docRef.id };
      
      // Store notification for supplier about order creation
      if (userDoc?.id) {
        // Notification logic here
      }
      
      // Store notification for all vendors about new order
      try {
        const vendorsSnapshot = await getDocs(query(collection(db, COLLECTIONS.USERS), where('role', '==', 'vendor')));
        
        for (const vendorDoc of vendorsSnapshot.docs) {
          const vendorData = vendorDoc.data();
          const vendorId = vendorData.id || vendorDoc.id;
          
          // Store notification for vendor
        }
      } catch (error) {
        // Silent notification error
      }

      return createdOrder;
    } catch (error) {
      throw error;
    }
  },

  // Get all orders
  async getAllOrders(): Promise<GroupOrder[]> {
    try {
      const ordersRef = collection(db, COLLECTIONS.GROUP_ORDERS);
      const q = query(ordersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const orders: GroupOrder[] = [];
      
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        const order: GroupOrder = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString().split('T')[0] || data.createdAt,
          participants: []
        } as GroupOrder;
        
        // Fetch participants for this order
        try {
          const participantsRef = collection(db, COLLECTIONS.PARTICIPANTS);
          const participantsQuery = query(participantsRef, where('orderId', '==', doc.id));
          const participantsSnapshot = await getDocs(participantsQuery);
          
          const participants: Participant[] = [];
          participantsSnapshot.forEach((participantDoc) => {
            const participantData = participantDoc.data();
            participants.push({
              id: participantDoc.id,
              vendorId: participantData.vendorId,
              vendorName: participantData.vendorName,
              quantity: participantData.quantity,
              joinedAt: participantData.joinedAt?.toDate?.()?.toISOString().split('T')[0] || participantData.joinedAt,
              vendorPhone: participantData.vendorPhone,
              vendorLocation: participantData.vendorLocation
            } as Participant);
          });
          
          order.participants = participants;
          // Calculate total quantity from participants
          order.totalQuantity = participants.reduce((sum, p) => sum + p.quantity, 0);
        } catch (error) {
          console.error('Error fetching participants for order:', doc.id, error);
          order.participants = [];
          order.totalQuantity = 0;
        }
        
        orders.push(order);
      }
      
      return orders;
    } catch (error) {
      console.error('Get orders error:', error);
      throw error;
    }
  },

  // Get orders by supplier
  async getOrdersBySupplier(supplierId: string): Promise<GroupOrder[]> {
    try {
      const ordersRef = collection(db, COLLECTIONS.GROUP_ORDERS);
      const q = query(ordersRef, where('supplierId', '==', supplierId), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const orders: GroupOrder[] = [];
      
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        const order: GroupOrder = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString().split('T')[0] || data.createdAt,
          participants: []
        } as GroupOrder;
        
        // Fetch participants for this order
        try {
          const participantsRef = collection(db, COLLECTIONS.PARTICIPANTS);
          const participantsQuery = query(participantsRef, where('orderId', '==', doc.id));
          const participantsSnapshot = await getDocs(participantsQuery);
          
          const participants: Participant[] = [];
          participantsSnapshot.forEach((participantDoc) => {
            const participantData = participantDoc.data();
            participants.push({
              id: participantDoc.id,
              vendorId: participantData.vendorId,
              vendorName: participantData.vendorName,
              quantity: participantData.quantity,
              joinedAt: participantData.joinedAt?.toDate?.()?.toISOString().split('T')[0] || participantData.joinedAt,
              vendorPhone: participantData.vendorPhone,
              vendorLocation: participantData.vendorLocation
            } as Participant);
          });
          
          order.participants = participants;
          // Calculate total quantity from participants
          order.totalQuantity = participants.reduce((sum, p) => sum + p.quantity, 0);
        } catch (error) {
          console.error('Error fetching participants for order:', doc.id, error);
          order.participants = [];
          order.totalQuantity = 0;
        }
        
        orders.push(order);
      }
      
      return orders;
    } catch (error) {
      console.error('Get supplier orders error:', error);
      throw error;
    }
  },

  // Get orders by vendor (participated)
  async getOrdersByVendor(vendorId: string): Promise<GroupOrder[]> {
    try {
      const participantsRef = collection(db, COLLECTIONS.PARTICIPANTS);
      const q = query(participantsRef, where('vendorId', '==', vendorId));
      const querySnapshot = await getDocs(q);
      
      const orderIds = querySnapshot.docs.map(doc => doc.data().orderId);
      const orders: GroupOrder[] = [];
      
      for (const orderId of orderIds) {
        const orderDoc = await getDoc(doc(db, COLLECTIONS.GROUP_ORDERS, orderId));
        if (orderDoc.exists()) {
          const data = orderDoc.data();
          const order: GroupOrder = {
            id: orderDoc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString().split('T')[0] || data.createdAt,
            participants: []
          } as GroupOrder;
          
          // Fetch participants for this order
          try {
            const participantsRef = collection(db, COLLECTIONS.PARTICIPANTS);
            const participantsQuery = query(participantsRef, where('orderId', '==', orderId));
            const participantsSnapshot = await getDocs(participantsQuery);
            
            const participants: Participant[] = [];
            participantsSnapshot.forEach((participantDoc) => {
              const participantData = participantDoc.data();
              participants.push({
                id: participantDoc.id,
                vendorId: participantData.vendorId,
                vendorName: participantData.vendorName,
                quantity: participantData.quantity,
                joinedAt: participantData.joinedAt?.toDate?.()?.toISOString().split('T')[0] || participantData.joinedAt,
                vendorPhone: participantData.vendorPhone,
                vendorLocation: participantData.vendorLocation,
                hasReviewed: participantData.hasReviewed || false
              } as Participant);
            });
            
            order.participants = participants;
          } catch (error) {
            console.error('Error fetching participants for order:', orderId, error);
            order.participants = [];
          }
          
          orders.push(order);
        }
      }
      
      return orders;
    } catch (error) {
      console.error('Get vendor orders error:', error);
      throw error;
    }
  },

  // Update order
  async updateOrder(orderId: string, updates: Partial<GroupOrder>): Promise<void> {
    try {
      const orderRef = doc(db, COLLECTIONS.GROUP_ORDERS, orderId);
      await updateDoc(orderRef, updates);
      // All notification and participant logic removed for clean update
    } catch (error) {
      console.error('Update order error:', error);
      throw error;
    }
  },

  // Delete order and all its participants
  async deleteOrder(orderId: string): Promise<void> {
    try {
      // First, delete all participants for this order
      const participantsRef = collection(db, COLLECTIONS.PARTICIPANTS);
      const q = query(participantsRef, where('orderId', '==', orderId));
      const participantSnapshot = await getDocs(q);
      
      // Delete all participants
      const deletePromises = participantSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      // Then delete the order itself
      const orderRef = doc(db, COLLECTIONS.GROUP_ORDERS, orderId);
      await deleteDoc(orderRef);
    } catch (error) {
      console.error('Delete order error:', error);
      throw error;
    }
  },

  // Listen to orders in real-time
  onOrdersSnapshot(callback: (orders: GroupOrder[]) => void) {
    const ordersRef = collection(db, COLLECTIONS.GROUP_ORDERS);
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, async (querySnapshot) => {
      const orders: GroupOrder[] = [];
      
      // Process each order and fetch its participants
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        const order: GroupOrder = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString().split('T')[0] || data.createdAt,
          participants: [] // Initialize empty participants array
        } as GroupOrder;
        
        // Fetch participants for this order using real-time listener
        try {
          const participantsRef = collection(db, COLLECTIONS.PARTICIPANTS);
          const participantsQuery = query(participantsRef, where('orderId', '==', order.id));
          const participantsSnapshot = await getDocs(participantsQuery);
          
          const participants: Participant[] = [];
          participantsSnapshot.forEach((participantDoc) => {
            const participantData = participantDoc.data();
            
            // Ensure hasReviewed is always a boolean
            const hasReviewed = participantData.hasReviewed === true;
            
            const participant = {
              id: participantDoc.id,
              vendorId: participantData.vendorId,
              vendorName: participantData.vendorName,
              quantity: participantData.quantity,
              joinedAt: participantData.joinedAt?.toDate?.()?.toISOString().split('T')[0] || participantData.joinedAt,
              vendorPhone: participantData.vendorPhone,
              vendorLocation: participantData.vendorLocation,
              hasReviewed: hasReviewed
            } as Participant;
            
            participants.push(participant);
          });
          
          order.participants = participants;
          // Calculate total quantity from participants
          order.totalQuantity = participants.reduce((sum, p) => sum + p.quantity, 0);
        } catch (error) {
          console.error('Error fetching participants for order:', order.id, error);
          order.participants = [];
          order.totalQuantity = 0;
        }
        
        orders.push(order);
      }
      
      // Call callback with all orders and their participants
      callback(orders);
    }, (error) => {
      console.error('Error in onOrdersSnapshot:', error);
    });
  },

  // Enhanced real-time listener that also listens to participant changes
  onOrdersWithParticipantsSnapshot(callback: (orders: GroupOrder[]) => void) {
    const ordersRef = collection(db, COLLECTIONS.GROUP_ORDERS);
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    
    let lastOrdersData = '';
    let isProcessing = false;
    
    const processOrders = async (ordersSnapshot: any) => {
      if (isProcessing) return; // Prevent concurrent processing
      isProcessing = true;
      
      const orders: GroupOrder[] = [];
      
      // Process each order
      for (const doc of ordersSnapshot.docs) {
        const data = doc.data();
        const order: GroupOrder = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString().split('T')[0] || data.createdAt,
          participants: []
        } as GroupOrder;
        
        orders.push(order);
      }
      
      // Now fetch participants for all orders
      await Promise.all(orders.map(async (order) => {
        try {
          const participantsRef = collection(db, COLLECTIONS.PARTICIPANTS);
          const participantsQuery = query(participantsRef, where('orderId', '==', order.id));
          const participantsSnapshot = await getDocs(participantsQuery);
          
          const participants: Participant[] = [];
          participantsSnapshot.forEach((participantDoc) => {
            const participantData = participantDoc.data();
            
            const participant = {
              id: participantDoc.id,
              vendorId: participantData.vendorId,
              vendorName: participantData.vendorName,
              quantity: participantData.quantity,
              joinedAt: participantData.joinedAt?.toDate?.()?.toISOString().split('T')[0] || participantData.joinedAt,
              vendorPhone: participantData.vendorPhone,
              vendorLocation: participantData.vendorLocation,
              hasReviewed: participantData.hasReviewed === true
            } as Participant;
            
            participants.push(participant);
          });
          
          order.participants = participants;
          order.totalQuantity = participants.reduce((sum, p) => sum + p.quantity, 0);
        } catch (error) {
          console.error('Error fetching participants for order:', order.id, error);
          order.participants = [];
          order.totalQuantity = 0;
        }
      }));
      
      // Create a hash of the orders data to prevent duplicate callbacks
      const ordersDataHash = JSON.stringify(orders.map(o => ({ id: o.id, participants: o.participants.map(p => ({ vendorId: p.vendorId, hasReviewed: p.hasReviewed })) })));
      
      if (ordersDataHash !== lastOrdersData) {
        lastOrdersData = ordersDataHash;
        callback(orders);
      }
      
      isProcessing = false;
    };
    
    // Listen to orders
    const ordersUnsubscribe = onSnapshot(q, async (querySnapshot) => {
      processOrders(querySnapshot);
    }, (error) => {
      console.error('Error in onOrdersWithParticipantsSnapshot:', error);
      isProcessing = false;
    });
    
    // Also listen to all participants changes
    const participantsRef = collection(db, COLLECTIONS.PARTICIPANTS);
    const participantsUnsubscribe = onSnapshot(participantsRef, async (participantsSnapshot) => {
      
      // When participants change, refetch all orders with their participants
      const ordersSnapshot = await getDocs(q);
      await processOrders(ordersSnapshot);
    }, (error) => {
      console.error('Error in participants listener:', error);
      isProcessing = false;
    });
    
    // Return a function that unsubscribes from both listeners
    return () => {
      ordersUnsubscribe();
      participantsUnsubscribe();
    };
  },

  // Listen to participants in real-time for a specific order
  onOrderParticipantsSnapshot(orderId: string, callback: (participants: Participant[]) => void) {
    const participantsRef = collection(db, COLLECTIONS.PARTICIPANTS);
    const q = query(participantsRef, where('orderId', '==', orderId));
    
    return onSnapshot(q, (querySnapshot) => {
      const participants: Participant[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        participants.push({
          id: doc.id,
          vendorId: data.vendorId,
          vendorName: data.vendorName,
          quantity: data.quantity,
          joinedAt: data.joinedAt?.toDate?.()?.toISOString().split('T')[0] || data.joinedAt,
          vendorPhone: data.vendorPhone,
          vendorLocation: data.vendorLocation,
          hasReviewed: data.hasReviewed || false
        } as Participant);
      });
      
      callback(participants);
    }, (error) => {
      console.error('Error in onOrderParticipantsSnapshot:', error);
    });
  }
};

// Participant Service
export const participantService = {
  // Join order
  async joinOrder(orderId: string, vendorId: string, vendorName: string, quantity: number, vendorLocation?: { lat: number; lng: number }, vendorPhone?: string): Promise<void> {
    try {
      // Get the order first
      const orderRef = doc(db, COLLECTIONS.GROUP_ORDERS, orderId);
      const orderDoc = await getDoc(orderRef);
      
      if (!orderDoc.exists()) {
        throw new Error('Order not found');
      }
      
      const orderData = orderDoc.data() as GroupOrder;
      
      // Check if vendor already joined
      const participantsRef = collection(db, COLLECTIONS.PARTICIPANTS);
      const q = query(participantsRef, where('orderId', '==', orderId), where('vendorId', '==', vendorId));
      const existingParticipant = await getDocs(q);
      
      if (!existingParticipant.empty) {
        throw new Error('Vendor already joined this order');
      }
      
      // Check quantity limits
      if (orderData.totalQuantity + quantity > orderData.maxQuantity) {
        throw new Error('Quantity limit exceeded');
      }
      
      // Add participant
      const participant: Participant = {
        id: Math.random().toString(36).substr(2, 9),
        vendorId,
        vendorName,
        quantity,
        joinedAt: new Date().toISOString().split('T')[0],
        vendorPhone
      };
      
      await addDoc(collection(db, COLLECTIONS.PARTICIPANTS), {
        ...participant,
        orderId,
        vendorLocation,
        hasReviewed: false,
        joinedAt: serverTimestamp()
      });
      
      // Update order total quantity
      const newTotalQuantity = orderData.totalQuantity + quantity;
      const updates: Partial<GroupOrder> = {
        totalQuantity: newTotalQuantity
      };
      
      // Check if minimum quantity is reached
      if (newTotalQuantity >= orderData.minQuantity && orderData.status === 'open') {
        updates.status = 'accepted';
      }
      
      await groupOrderService.updateOrder(orderId, updates);
      
      // Store notification for supplier about new participant
    } catch (error) {
      console.error('Join order error:', error);
      throw error;
    }
  },

  // Update participant details (phone and location) and recalculate delivery charge
  async updateParticipantDetails(orderId: string, vendorId: string, vendorPhone: string, vendorLocation: { lat: number; lng: number }): Promise<void> {
    try {
      // Get current participant
      const participantsRef = collection(db, COLLECTIONS.PARTICIPANTS);
      const q = query(participantsRef, where('orderId', '==', orderId), where('vendorId', '==', vendorId));
      const participantSnapshot = await getDocs(q);
      
      if (participantSnapshot.empty) {
        throw new Error('Participant not found');
      }
      
      const participantDoc = participantSnapshot.docs[0];
      
      // Get the order to access supplier location and delivery charge per km
      const orderRef = doc(db, COLLECTIONS.GROUP_ORDERS, orderId);
      const orderDoc = await getDoc(orderRef);
      
      if (!orderDoc.exists()) {
        throw new Error('Order not found');
      }
      
      const orderData = orderDoc.data() as GroupOrder;
      
      // Extract supplier location from order location string
      const locationMatch = orderData.location.match(/\[([-\d.]+),([-\d.]+)\]/);
      let supplierLat: number, supplierLng: number;
      
      if (locationMatch) {
        supplierLat = parseFloat(locationMatch[1]);
        supplierLng = parseFloat(locationMatch[2]);
      } else {
        // If no coordinates in location string, use default coordinates
        supplierLat = 19.076; // Default to Mumbai
        supplierLng = 72.8777;
      }
      
      // Calculate new delivery charge based on new vendor location
      const distance = calculateDistance(
        supplierLat,
        supplierLng,
        vendorLocation.lat,
        vendorLocation.lng
      );
      
      const newDeliveryCharge = (orderData.deliveryChargePerKm || 5) * distance;
      
      // Update participant phone, location, and delivery charge
      await updateDoc(participantDoc.ref, { 
        vendorPhone,
        vendorLocation,
        deliveryCharge: newDeliveryCharge
      });
    } catch (error) {
      console.error('Update participant details error:', error);
      throw error;
    }
  },

  // Recalculate delivery charges for all participants when supplier location changes
  async recalculateDeliveryCharges(orderId: string, newSupplierLat: number, newSupplierLng: number, deliveryChargePerKm: number): Promise<void> {
    try {
      // Get all participants for this order
      const participantsRef = collection(db, COLLECTIONS.PARTICIPANTS);
      const q = query(participantsRef, where('orderId', '==', orderId));
      const participantSnapshot = await getDocs(q);
      
      if (participantSnapshot.empty) {
        return; // No participants to update
      }

      // Update each participant's delivery charge
      for (const participantDoc of participantSnapshot.docs) {
        const participantData = participantDoc.data();
        
        if (participantData.vendorLocation) {
          // Calculate new distance using Haversine formula
          const distance = calculateDistance(
            newSupplierLat, 
            newSupplierLng, 
            participantData.vendorLocation.lat, 
            participantData.vendorLocation.lng
          );
          
          const newDeliveryCharge = (deliveryChargePerKm || 5) * distance;
          
          // Update participant with new delivery charge
          await updateDoc(participantDoc.ref, { 
            deliveryCharge: newDeliveryCharge
          });
        }
      }
    } catch (error) {
      console.error('Recalculate delivery charges error:', error);
      throw error;
    }
  },

  // Update participant quantity
  async updateParticipantQuantity(orderId: string, vendorId: string, newQuantity: number): Promise<void> {
    try {
      // Get current participant
      const participantsRef = collection(db, COLLECTIONS.PARTICIPANTS);
      const q = query(participantsRef, where('orderId', '==', orderId), where('vendorId', '==', vendorId));
      const participantSnapshot = await getDocs(q);
      
      if (participantSnapshot.empty) {
        throw new Error('Participant not found');
      }
      
      const participantDoc = participantSnapshot.docs[0];
      const currentQuantity = participantDoc.data().quantity;
      const quantityDifference = newQuantity - currentQuantity;
      
      // Update participant
      await updateDoc(participantDoc.ref, { quantity: newQuantity });
      
      // Update order total quantity
      const orderRef = doc(db, COLLECTIONS.GROUP_ORDERS, orderId);
      const orderDoc = await getDoc(orderRef);
      
      if (orderDoc.exists()) {
        const orderData = orderDoc.data() as GroupOrder;
        const newTotalQuantity = orderData.totalQuantity + quantityDifference;
        
        const updates: Partial<GroupOrder> = {
          totalQuantity: newTotalQuantity
        };
        
        // Check if minimum quantity is reached
        if (newTotalQuantity >= orderData.minQuantity && orderData.status === 'open') {
          updates.status = 'accepted';
        }
        // If order was accepted and quantity changes, change status back to 'open'
        else if (orderData.status === 'accepted') {
          updates.status = 'open';
        }
        
        await groupOrderService.updateOrder(orderId, updates);
        
        // Store notification for supplier about quantity change
        const participantData = participantDoc.data();
      }
    } catch (error) {
      console.error('Update participant error:', error);
      throw error;
    }
  },

  // Mark participant as reviewed
  async markParticipantReviewed(orderId: string, vendorId: string): Promise<void> {
    try {
      
      const participantsRef = collection(db, COLLECTIONS.PARTICIPANTS);
      const q = query(
        participantsRef, 
        where('orderId', '==', orderId),
        where('vendorId', '==', vendorId)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const participantDoc = querySnapshot.docs[0];
        
        await updateDoc(doc(db, COLLECTIONS.PARTICIPANTS, participantDoc.id), {
          hasReviewed: true,
          reviewedAt: serverTimestamp()
        });
        
      } else {
        console.error('No participant found for orderId:', orderId, 'vendorId:', vendorId);
        throw new Error('Participant not found');
      }
    } catch (error) {
      console.error('Mark participant reviewed error:', error);
      throw error;
    }
  },

  // Remove participant
  async removeParticipant(orderId: string, vendorId: string): Promise<void> {
    try {
      // Get current participant
      const participantsRef = collection(db, COLLECTIONS.PARTICIPANTS);
      const q = query(participantsRef, where('orderId', '==', orderId), where('vendorId', '==', vendorId));
      const participantSnapshot = await getDocs(q);
      
      if (participantSnapshot.empty) {
        throw new Error('Participant not found');
      }
      
      const participantDoc = participantSnapshot.docs[0];
      const currentQuantity = participantDoc.data().quantity;
      
      // Remove participant
      await deleteDoc(participantDoc.ref);
      
      // Update order total quantity and status
      const orderRef = doc(db, COLLECTIONS.GROUP_ORDERS, orderId);
      const orderDoc = await getDoc(orderRef);
      
      if (orderDoc.exists()) {
        const orderData = orderDoc.data() as GroupOrder;
        const newTotalQuantity = orderData.totalQuantity - currentQuantity;
        
        const updates: Partial<GroupOrder> = {
          totalQuantity: newTotalQuantity
        };
        
        // If order was accepted and vendor cancels, change status back to 'open'
        if (orderData.status === 'accepted') {
          updates.status = 'open';
        }
        
        await groupOrderService.updateOrder(orderId, updates);
      }
    } catch (error) {
      console.error('Remove participant error:', error);
      throw error;
    }
  },

  // Get participants for an order
  async getOrderParticipants(orderId: string): Promise<Participant[]> {
    try {
      const participantsRef = collection(db, COLLECTIONS.PARTICIPANTS);
      const q = query(participantsRef, where('orderId', '==', orderId));
      const querySnapshot = await getDocs(q);
      
      const participants: Participant[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        const participant = {
          id: doc.id,
          vendorId: data.vendorId,
          vendorName: data.vendorName,
          quantity: data.quantity,
          joinedAt: data.joinedAt?.toDate?.()?.toISOString().split('T')[0] || data.joinedAt,
          vendorPhone: data.vendorPhone,
          vendorLocation: data.vendorLocation,
          hasReviewed: data.hasReviewed === true
        };
        
        participants.push(participant);
      });
      
      return participants;
    } catch (error) {
      console.error('Get participants error:', error);
      throw error;
    }
  },

  // Reset accepted orders with no participants back to open status
  async resetAcceptedOrdersWithNoParticipants(): Promise<void> {
    try {
      const ordersRef = collection(db, COLLECTIONS.GROUP_ORDERS);
      const q = query(ordersRef, where('status', '==', 'accepted'));
      const querySnapshot = await getDocs(q);
      
      for (const orderDoc of querySnapshot.docs) {
        const orderData = orderDoc.data() as GroupOrder;
        const participants = await this.getOrderParticipants(orderDoc.id);
        
        // If accepted order has no participants, reset to open
        if (participants.length === 0) {
          await groupOrderService.updateOrder(orderDoc.id, {
            status: 'open',
            totalQuantity: 0
          });
        }
      }
    } catch (error) {
      throw error;
    }
  },

  // Check and update expired orders
  async checkAndUpdateExpiredOrders(): Promise<void> {
    try {
      const ordersRef = collection(db, COLLECTIONS.GROUP_ORDERS);
      const q = query(ordersRef, where('status', 'in', ['open', 'locked']));
      const querySnapshot = await getDocs(q);
      
      const now = new Date();
      let expiredCount = 0;
      
      for (const orderDoc of querySnapshot.docs) {
        const orderData = orderDoc.data() as GroupOrder;
        const deadline = new Date(orderData.deadline);
        
        // Check if order has expired
        if (deadline < now) {
          // If order didn't meet minimum quantity, mark as expired
          if (orderData.totalQuantity < orderData.minQuantity) {
            await groupOrderService.updateOrder(orderDoc.id, {
              status: 'expired'
            });
            expiredCount++;
          }
          // If order met minimum quantity but wasn't accepted, keep as is
          // (supplier can still manually accept it)
        }
      }
    } catch (error) {
      throw error;
    }
  }
}; 

export function onParticipantsSnapshot(orderId: string, callback: (participants: Participant[]) => void) {
  const participantsRef = collection(db, COLLECTIONS.PARTICIPANTS);
  const q = query(participantsRef, where('orderId', '==', orderId));
  return onSnapshot(q, (querySnapshot) => {
    const participants: Participant[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      participants.push({
        id: doc.id,
        vendorId: data.vendorId,
        vendorName: data.vendorName,
        quantity: data.quantity,
        joinedAt: data.joinedAt?.toDate?.()?.toISOString().split('T')[0] || data.joinedAt,
        vendorPhone: data.vendorPhone,
        vendorLocation: data.vendorLocation,
        hasReviewed: data.hasReviewed || false
      });
    });
    callback(participants);
  });
}

// Review Service
export const reviewService = {
  // Submit a review
  async submitReview(reviewData: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
    try {
      const reviewsRef = collection(db, COLLECTIONS.REVIEWS);
      const reviewDoc = await addDoc(reviewsRef, {
        ...reviewData,
        createdAt: serverTimestamp()
      });

      const review: Review = {
        id: reviewDoc.id,
        ...reviewData,
        createdAt: new Date().toISOString().split('T')[0]
      };

      return review;
    } catch (error) {
      console.error('Submit review error:', error);
      throw error;
    }
  },

  // Get reviews by supplier ID
  async getReviewsBySupplier(supplierId: string): Promise<Review[]> {
    try {
      const reviewsRef = collection(db, COLLECTIONS.REVIEWS);
      const q = query(
        reviewsRef, 
        where('supplierId', '==', supplierId)
      );
      const querySnapshot = await getDocs(q);
      
      const reviews: Review[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        reviews.push({
          id: doc.id,
          orderId: data.orderId,
          supplierId: data.supplierId,
          supplierName: data.supplierName,
          vendorId: data.vendorId,
          vendorName: data.vendorName,
          orderItem: data.orderItem,
          rating: data.rating,
          comment: data.comment,
          createdAt: data.createdAt?.toDate?.()?.toISOString().split('T')[0] || data.createdAt,
          orderQuantity: data.orderQuantity,
          orderValue: data.orderValue
        });
      });
      
      // Sort reviews by createdAt in descending order (newest first)
      reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      return reviews;
    } catch (error) {
      console.error('Get reviews by supplier error:', error);
      throw error;
    }
  },

  // Get reviews by order ID
  async getReviewsByOrder(orderId: string): Promise<Review[]> {
    try {
      const reviewsRef = collection(db, COLLECTIONS.REVIEWS);
      const q = query(
        reviewsRef, 
        where('orderId', '==', orderId)
      );
      const querySnapshot = await getDocs(q);
      
      const reviews: Review[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        reviews.push({
          id: doc.id,
          orderId: data.orderId,
          supplierId: data.supplierId,
          supplierName: data.supplierName,
          vendorId: data.vendorId,
          vendorName: data.vendorName,
          orderItem: data.orderItem,
          rating: data.rating,
          comment: data.comment,
          createdAt: data.createdAt?.toDate?.()?.toISOString().split('T')[0] || data.createdAt,
          orderQuantity: data.orderQuantity,
          orderValue: data.orderValue
        });
      });
      
      // Sort reviews by createdAt in descending order (newest first)
      reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      return reviews;
    } catch (error) {
      console.error('Get reviews by order error:', error);
      throw error;
    }
  },

  // Real-time listener for reviews by supplier
  onReviewsBySupplierSnapshot(supplierId: string, callback: (reviews: Review[]) => void) {
    const reviewsRef = collection(db, COLLECTIONS.REVIEWS);
    const q = query(
      reviewsRef, 
      where('supplierId', '==', supplierId)
    );
    return onSnapshot(q, (querySnapshot) => {
      const reviews: Review[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        reviews.push({
          id: doc.id,
          orderId: data.orderId,
          supplierId: data.supplierId,
          supplierName: data.supplierName,
          vendorId: data.vendorId,
          vendorName: data.vendorName,
          orderItem: data.orderItem,
          rating: data.rating,
          comment: data.comment,
          createdAt: data.createdAt?.toDate?.()?.toISOString().split('T')[0] || data.createdAt,
          orderQuantity: data.orderQuantity,
          orderValue: data.orderValue
        });
      });
      // Sort reviews by createdAt in descending order (newest first)
      reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(reviews);
    }, (error) => {
      console.error('Review snapshot error:', error);
    });
  },

  // Delete a review
  async deleteReview(reviewId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.REVIEWS, reviewId));
    } catch (error) {
      console.error('Delete review error:', error);
      throw error;
    }
  }
}; 