import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useFirebaseOrders } from '@/hooks/useFirebaseOrders';
import { participantService, groupOrderService, userService, onParticipantsSnapshot } from '@/services/firebaseService';
import { CreateOrderData, GroupOrder } from '@/types';
import { calculateDistance } from '@/lib/utils';
import { Plus, Package, Users, TrendingUp, Calendar, MapPin, Loader2, RefreshCw, BarChart3, ShoppingCart, Phone, Mail, User, Clock, PieChart, Activity, CheckCircle, Edit, X, Star, Route, Navigation, Truck, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MapContainer, TileLayer, Marker, useMapEvents, Polyline } from 'react-leaflet';
import L, { LatLngExpression, Icon, Map as LeafletMap, DivIcon } from 'leaflet';

const DEFAULT_CENTER = { lat: 19.076, lng: 72.8777 }; // Mumbai as default
const MAP_CONTAINER_STYLE = { width: '100%', height: '250px', borderRadius: '12px' };

// Custom marker icons using divIcon for better control
const createDivIcon = (color: string, label: string) => new DivIcon({
  className: 'custom-marker',
  html: `<div style="
    background-color: ${color};
    width: 30px;
    height: 30px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 10px;
    font-weight: bold;
    text-transform: uppercase;
  ">${label}</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30]
});

const RedIcon = createDivIcon('#ef4444', 'S'); // Red for supplier
const GreenIcon = createDivIcon('#10b981', 'V1'); // Green for vendor 1
const BlueIcon = createDivIcon('#3b82f6', 'V2'); // Blue for vendor 2
const OrangeIcon = createDivIcon('#f97316', 'V3'); // Orange for vendor 3
const PurpleIcon = createDivIcon('#8b5cf6', 'V4'); // Purple for vendor 4
const YellowIcon = createDivIcon('#f59e0b', 'V5'); // Yellow for vendor 5

function LocationPicker({ value, onChange }: { value: { lat: number; lng: number } | null, onChange: (val: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// Countdown Timer Component
const OrderCountdown = ({ deadline }: { deadline: string }) => {
  const [timeLeft, setTimeLeft] = useState('');

  React.useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const deadlineTime = new Date(deadline).getTime();
      const difference = deadlineTime - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        setTimeLeft(`${days}d ${hours}h left`);
      } else {
        setTimeLeft('Expired');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline]);

  return <span className="text-sm text-muted-foreground">{timeLeft}</span>;
};

// Analytics Component
const AnalyticsCard = ({ title, value, icon: Icon, color }: { 
  title: string; 
  value: string | number; 
  icon: any; 
  color: string;
}) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const SupplierDashboard = () => {
  const { user } = useFirebaseAuth();
  console.log('SupplierDashboard: Current user:', user);
  console.log('SupplierDashboard: User ID:', user?.id);
  console.log('SupplierDashboard: User email:', user?.email);
  const { orders, createOrder, updateOrder, isLoading } = useFirebaseOrders();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<GroupOrder | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState<GroupOrder | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingOrder, setProcessingOrder] = useState<GroupOrder | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completingOrder, setCompletingOrder] = useState<GroupOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState<GroupOrder | null>(null);
  const [reviewProductFilter, setReviewProductFilter] = useState('');
  const [reviewRatingFilter, setReviewRatingFilter] = useState<number | null>(null);
  const [newOrder, setNewOrder] = useState<CreateOrderData>({
    item: '',
    description: '',
    bulkPrice: 0,
    originalPrice: 0,
    minQuantity: 0,
    maxQuantity: 0,
    unit: 'kg',
    deadline: '',
    location: '',
    deliveryChargePerKm: 0,
    contactPhone: ''
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [locationLatLng, setLocationLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [isDeliveryTrackingModalOpen, setIsDeliveryTrackingModalOpen] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState<GroupOrder | null>(null);
  const [deliveryRoutes, setDeliveryRoutes] = useState<{ [vendorId: string]: any[] }>({});
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);



  // Filter orders for current supplier using real-time data
  const myOrders = orders.filter(order => order.supplierId === user?.id);

  // Helper function to generate realistic review comments
  const generateReviewComment = (item: string, quantity: number, unit: string) => {
    const comments = [
      `Great quality ${item.toLowerCase()}! Fresh and delivered on time. The bulk price was excellent and saved me money. Will definitely order again.`,
      `Good ${item.toLowerCase()}, reasonable price. Delivery was smooth and the quantity was perfect for my needs. Satisfied with the service.`,
      `Amazing ${item.toLowerCase()}! Very fresh and the price was unbeatable. Perfect for my business. Highly recommended!`,
      `Excellent ${item.toLowerCase()} quality. The ${quantity} ${unit} was exactly what I needed. Fast delivery and good communication.`,
      `Very satisfied with the ${item.toLowerCase()}. Good quality, fair price, and timely delivery. Will be ordering more soon.`
    ];
    
    return comments[Math.floor(Math.random() * comments.length)];
  };

  // Generate reviews from completed orders with vendor data
  const reviews = React.useMemo(() => {
    const reviewData: Array<{
      id: string;
      orderId: string;
      orderItem: string;
      vendorName: string;
      vendorId: string;
      rating: number;
      comment: string;
      createdAt: string;
      orderQuantity: string;
      orderValue: string;
    }> = [];

    // Get completed orders for this supplier
    const completedOrders = myOrders.filter(order => order.status === 'completed');
    
    completedOrders.forEach((order, index) => {
      // For each participant in the order, create a review
      order.participants.forEach((participant, participantIndex) => {
        // Generate a unique review for each vendor
        const reviewId = `${order.id}-${participant.vendorId}`;
        
        // Generate realistic review data based on the order
        const review = {
          id: reviewId,
          orderId: order.id,
          orderItem: order.item,
          vendorName: participant.vendorName,
          vendorId: participant.vendorId,
          rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars for demo
          comment: generateReviewComment(order.item, participant.quantity, order.unit),
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Random date within last 7 days
          orderQuantity: `${participant.quantity} ${order.unit}`,
          orderValue: `₹${(participant.quantity * order.bulkPrice).toFixed(0)}`
        };
        
        reviewData.push(review);
      });
    });

    // Remove duplicate reviews by orderId and vendorId
    const uniqueReviews = new Map();
    reviewData.forEach((review) => {
      const key = `${review.orderId}-${review.vendorId}`;
      if (!uniqueReviews.has(key)) {
        uniqueReviews.set(key, review);
      }
    });
    return Array.from(uniqueReviews.values());
  }, [myOrders]);

  // Filter reviews based on product name and rating
  const filteredReviews = React.useMemo(() => {
    return reviews.filter(review => {
      const matchesProduct = reviewProductFilter === '' || 
        review.orderItem.toLowerCase().includes(reviewProductFilter.toLowerCase());
      
      const matchesRating = reviewRatingFilter === null || 
        review.rating === reviewRatingFilter;
      
      return matchesProduct && matchesRating;
    });
  }, [reviews, reviewProductFilter, reviewRatingFilter]);

  // Get unique product names for filter dropdown
  const uniqueProducts = React.useMemo(() => {
    const products = [...new Set(reviews.map(review => review.orderItem))];
    return products.sort();
  }, [reviews]);

  function UseMyLocationButton({ onSetLocation }: { onSetLocation: (latlng: { lat: number; lng: number }) => void }) {
    return (
      <button
        type="button"
        onClick={() => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                onSetLocation(latlng);
                // Center the map
                if (mapRef.current) {
                  mapRef.current.setView(latlng, 15);
                }
              },
              () => {
                alert('Unable to retrieve your location.');
              }
            );
          } else {
            alert('Geolocation is not supported by your browser.');
          }
        }}
        style={{
          marginBottom: 8,
          background: 'white',
          border: '1px solid #ccc',
          borderRadius: 6,
          padding: '6px 12px',
          cursor: 'pointer',
          fontSize: 14,
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
        }}
      >
        📍 Use My Current Location
      </button>
    );
  }

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!newOrder.item.trim()) {
      errors.item = 'Item name is required';
    }

    if (!newOrder.description.trim()) {
      errors.description = 'Description is required';
    }

    if (newOrder.bulkPrice <= 0) {
      errors.bulkPrice = 'Bulk price must be greater than 0';
    }

    if (newOrder.originalPrice <= 0) {
      errors.originalPrice = 'Original price must be greater than 0';
    }

    if (newOrder.bulkPrice >= newOrder.originalPrice) {
      errors.bulkPrice = 'Bulk price must be less than original price';
    }

    if (newOrder.minQuantity <= 0) {
      errors.minQuantity = 'Minimum quantity must be greater than 0';
    }

    if (newOrder.maxQuantity <= newOrder.minQuantity) {
      errors.maxQuantity = 'Maximum quantity must be greater than minimum quantity';
    }

    if (!newOrder.location.trim()) {
      errors.location = 'Location is required';
    }

    if (!newOrder.contactPhone.trim()) {
      errors.contactPhone = 'Contact phone number is required';
    } else if (newOrder.contactPhone.length !== 10) {
      errors.contactPhone = 'Phone number must be exactly 10 digits';
    } else if (!/^\d{10}$/.test(newOrder.contactPhone)) {
      errors.contactPhone = 'Phone number must contain only digits';
    }

    if (newOrder.deliveryChargePerKm < 0) {
      errors.deliveryChargePerKm = 'Delivery charge cannot be negative';
    }

    if (!newOrder.deadline) {
      errors.deadline = 'Deadline is required';
    }

    if (!locationLatLng) {
      errors.map = 'Location selection is mandatory. Please click on the map or use "Use My Current Location" button to select a delivery location.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive"
      });
      return;
    }

    try {
      // Add lat/lng to location string for now (mock backend)
      const locationString = `${newOrder.location} [${locationLatLng?.lat},${locationLatLng?.lng}]`;
      await createOrder({ ...newOrder, location: locationString }, user.id, user.name);
      toast({
        title: "Group Order Created!",
        description: `Successfully created order for ${newOrder.item}`,
        variant: "default"
      });
      setIsCreateModalOpen(false);
      setNewOrder({
        item: '',
        description: '',
        bulkPrice: 0,
        originalPrice: 0,
        minQuantity: 0,
        maxQuantity: 0,
        unit: 'kg',
        deadline: '',
        location: '',
        deliveryChargePerKm: 0,
        contactPhone: ''
      });
      setFormErrors({});
      setLocationLatLng(null);
    } catch (error) {
      toast({
        title: "Failed to Create Order",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleRefresh = () => {
    // Real-time listener will automatically update orders
    toast({
      title: "Refreshed",
      description: "Orders are updated in real-time",
      variant: "default"
    });
  };

  const handleResetAcceptedOrders = async () => {
    try {
      console.log('Starting manual reset of accepted orders...');
      await participantService.resetAcceptedOrdersWithNoParticipants();
      console.log('Manual reset completed successfully');
      toast({
        title: "Orders Reset!",
        description: "Accepted orders with no participants have been reset to open status",
        variant: "default"
      });
    } catch (error) {
      console.error('Reset failed with error:', error);
      toast({
        title: "Reset Failed",
        description: `Failed to reset orders: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const handleEditOrder = (order: GroupOrder) => {
    setEditingOrder(order);
    
    // Extract location name and coordinates from the location string
    let locationName = order.location;
    let coordinates = null;
    
    // Check if location contains coordinates in format "Location [lat,lng]"
    const coordMatch = order.location.match(/\[([\d.-]+),([\d.-]+)\]/);
    if (coordMatch) {
      locationName = order.location.replace(/\s*\[[\d.-]+,[\d.-]+\]\s*/, '').trim();
      coordinates = {
        lat: parseFloat(coordMatch[1]),
        lng: parseFloat(coordMatch[2])
      };
    }
    
    // Populate the form with current order data
    setNewOrder({
      item: order.item,
      description: order.description,
      bulkPrice: order.bulkPrice,
      originalPrice: order.originalPrice,
      minQuantity: order.minQuantity,
      maxQuantity: order.maxQuantity,
      unit: order.unit,
      deadline: order.deadline,
      location: locationName,
      deliveryChargePerKm: order.deliveryChargePerKm,
      contactPhone: order.contactPhone
    });
    
    // Set the location coordinates for the map
    setLocationLatLng(coordinates);
    setIsEditModalOpen(true);
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingOrder || !user) return;

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive"
      });
      return;
    }

    setIsEditing(true);
    try {
      // Prepare the location string with coordinates
      const locationString = locationLatLng 
        ? `${newOrder.location} [${locationLatLng.lat},${locationLatLng.lng}]`
        : newOrder.location;

      // Check if location has changed
      const locationChanged = editingOrder.location !== locationString;
      const deliveryChargeChanged = editingOrder.deliveryChargePerKm !== newOrder.deliveryChargePerKm;

      // Prepare the updates
      const updates: Partial<GroupOrder> = {
        item: newOrder.item,
        description: newOrder.description,
        bulkPrice: newOrder.bulkPrice,
        originalPrice: newOrder.originalPrice,
        minQuantity: newOrder.minQuantity,
        maxQuantity: newOrder.maxQuantity,
        unit: newOrder.unit,
        deadline: newOrder.deadline,
        location: locationString,
        deliveryChargePerKm: newOrder.deliveryChargePerKm,
        contactPhone: newOrder.contactPhone
      };

      // Update the order in Firebase
      await updateOrder(editingOrder.id, updates);

      // If location or delivery charge changed, recalculate for all participants
      if ((locationChanged || deliveryChargeChanged) && editingOrder.participants.length > 0) {
        const newSupplierLat = locationLatLng?.lat;
        const newSupplierLng = locationLatLng?.lng;

        if (newSupplierLat && newSupplierLng) {
          // Recalculate delivery charges for all participants
          await participantService.recalculateDeliveryCharges(
            editingOrder.id,
            newSupplierLat,
            newSupplierLng,
            newOrder.deliveryChargePerKm || 5
          );

          toast({
            title: "Order Updated with Recalculated Delivery Charges!",
            description: `Updated order and recalculated delivery charges for ${editingOrder.participants.length} participants`,
            variant: "default"
          });
        }
      } else {
        toast({
          title: "Order Updated!",
          description: `Successfully updated order for ${newOrder.item}`,
          variant: "default"
        });
      }
      
      setIsEditModalOpen(false);
      setEditingOrder(null);
      setNewOrder({
        item: '',
        description: '',
        bulkPrice: 0,
        originalPrice: 0,
        minQuantity: 0,
        maxQuantity: 0,
        unit: 'kg',
        deadline: '',
        location: '',
        deliveryChargePerKm: 0,
        contactPhone: ''
      });
      setFormErrors({});
      setLocationLatLng(null);
    } catch (error) {
      toast({
        title: "Failed to Update Order",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsEditing(false);
    }
  };

  const handleCancelOrder = async (order: GroupOrder) => {
    setCancellingOrder(order);
  };

  const confirmCancelOrder = async () => {
    if (!cancellingOrder || !user) return;

    setIsCancelling(true);
    try {
      // Update order status to 'cancelled' and remove all participants
      await updateOrder(cancellingOrder.id, { 
        status: 'cancelled',
        totalQuantity: 0
      });

      // Remove all participants from this order
      for (const participant of cancellingOrder.participants) {
        try {
          await participantService.removeParticipant(cancellingOrder.id, participant.vendorId);
        } catch (error) {
          console.error('Error removing participant:', error);
        }
      }
      
      toast({
        title: "Order Cancelled!",
        description: `Successfully cancelled order for ${cancellingOrder.item}`,
        variant: "default"
      });
      
      setCancellingOrder(null);
    } catch (error) {
      toast({
        title: "Failed to Cancel Order",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleProcessOrder = async (order: GroupOrder) => {
    setProcessingOrder(order);
  };

  const confirmProcessOrder = async () => {
    if (!processingOrder || !user) return;
    setIsProcessing(true);
    try {
      await updateOrder(processingOrder.id, {
        status: 'accepted'
      });
      
      const hasReachedMinimum = processingOrder.totalQuantity >= processingOrder.minQuantity;
      const message = hasReachedMinimum 
        ? `Successfully accepted order for ${processingOrder.item}. Vendors will be notified.`
        : `Successfully processed order early for ${processingOrder.item} with ${processingOrder.totalQuantity}/${processingOrder.minQuantity} ${processingOrder.unit}. Vendors will be notified.`;
      
      toast({ 
        title: hasReachedMinimum ? "Order Accepted!" : "Order Processed Early!", 
        description: message, 
        variant: "default" 
      });
      setProcessingOrder(null);
    } catch (error) {
      toast({ title: "Failed to Process Order", description: "Please try again", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteOrder = async (order: GroupOrder) => {
    setCompletingOrder(order);
  };

  const confirmCompleteOrder = async () => {
    if (!completingOrder || !user) return;
    setIsCompleting(true);
    try {
      await updateOrder(completingOrder.id, {
        status: 'completed'
      });
      toast({ 
        title: "Order Completed!", 
        description: `Successfully completed order for ${completingOrder.item}. Vendors will be notified.`, 
        variant: "default" 
      });
      setCompletingOrder(null);
    } catch (error) {
      toast({ title: "Failed to Complete Order", description: "Please try again", variant: "destructive" });
    } finally {
      setIsCompleting(false);
    }
  };

  const handleDeleteOrder = async (order: GroupOrder) => {
    setDeletingOrder(order);
  };

  const confirmDeleteOrder = async () => {
    if (!deletingOrder || !user) return;

    setIsDeleting(true);
    try {
      await groupOrderService.deleteOrder(deletingOrder.id);
      
      toast({
        title: "Order Deleted!",
        description: `Successfully deleted order for ${deletingOrder.item}`,
        variant: "default"
      });
      
      setDeletingOrder(null);
    } catch (error) {
      toast({
        title: "Failed to Delete Order",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTrackDeliveries = async (order: GroupOrder) => {
    if (!user) return;
    
    // Check if order has participants
    if (order.participants.length === 0) {
      toast({
        title: "No Participants",
        description: "This order has no participants yet",
        variant: "destructive"
      });
      return;
    }

    setTrackingOrder(order);
    setIsDeliveryTrackingModalOpen(true);
    setIsLoadingRoutes(true);

    try {
      // Extract supplier location from order.location (format: "City [lat,lng]")
      const locationMatch = order.location.match(/\[([\d.-]+),([\d.-]+)\]/);
      if (!locationMatch) {
        toast({
          title: "Invalid Supplier Location",
          description: "Supplier location data is missing",
          variant: "destructive"
        });
        return;
      }

      const supplierLat = parseFloat(locationMatch[1]);
      const supplierLng = parseFloat(locationMatch[2]);
      const supplierLocation = { lat: supplierLat, lng: supplierLng };

      const routes: { [vendorId: string]: any[] } = {};

      // Calculate routes for each participant
      for (const participant of order.participants) {
        if (participant.vendorLocation) {
          try {
            // Calculate route using OSRM (Open Source Routing Machine)
            const routeUrl = `https://router.project-osrm.org/route/v1/driving/${supplierLng},${supplierLat};${participant.vendorLocation.lng},${participant.vendorLocation.lat}?overview=full&geometries=geojson`;
            
            const response = await fetch(routeUrl);
            const routeData = await response.json();

            if (routeData.routes && routeData.routes.length > 0) {
              routes[participant.vendorId] = routeData.routes[0].geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]);
            } else {
              // Fallback: create a simple straight line route
              routes[participant.vendorId] = [supplierLocation, participant.vendorLocation];
            }
          } catch (error) {
            console.error(`Error fetching route for vendor ${participant.vendorName}:`, error);
            // Fallback: create a simple straight line route
            routes[participant.vendorId] = [supplierLocation, participant.vendorLocation];
          }
        }
      }

      setDeliveryRoutes(routes);
    } catch (error) {
      console.error('Error fetching routes:', error);
      toast({
        title: "Route Error",
        description: "Failed to load delivery routes",
        variant: "destructive"
      });
    } finally {
      setIsLoadingRoutes(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'warning';
      case 'accepted': return 'default';
      case 'completed': return 'secondary';
      case 'cancelled': return 'destructive';
      case 'expired': return 'destructive';
      default: return 'default';
    }
  };

  const totalRevenue = myOrders.reduce((acc, order) => {
    return acc + (order.totalQuantity * order.bulkPrice);
  }, 0);

  const totalVendors = myOrders.reduce((acc, order) => {
    return acc + order.participants.length;
  }, 0);

  const activeOrders = myOrders.filter(order => order.status === 'open').length;
  const completedOrders = myOrders.filter(order => order.status === 'completed').length;

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
    setNewOrder({
      item: '',
      description: '',
      bulkPrice: 0,
      originalPrice: 0,
      minQuantity: 0,
      maxQuantity: 0,
      unit: 'kg',
      deadline: '',
      location: '',
      deliveryChargePerKm: 0,
      contactPhone: ''
    });
    setFormErrors({});
    setLocationLatLng(null);
  };

  useEffect(() => {
    if (!isDeliveryTrackingModalOpen || !trackingOrder) return;
    const unsubscribe = onParticipantsSnapshot(trackingOrder.id, (participants) => {
      setTrackingOrder((prev) => prev ? { ...prev, participants } : prev);
    });
    return () => unsubscribe();
  }, [isDeliveryTrackingModalOpen, trackingOrder?.id]);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header with Create Order Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Supplier Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your group orders and track vendor participation</p>
        </div>
        <div className="flex gap-2 items-center">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={handleResetAcceptedOrders}
            className="flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Reset Accepted Orders
          </Button>
          <Button 
            variant="outline" 
            onClick={async () => {
              try {
                await participantService.checkAndUpdateExpiredOrders();
                toast({
                  title: "Expired Orders Checked",
                  description: "Successfully checked and updated expired orders",
                  variant: "default"
                });
              } catch (error) {
                toast({
                  title: "Error",
                  description: "Failed to check expired orders",
                  variant: "destructive"
                });
              }
            }}
            className="flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            Check Expired Orders
          </Button>
          <Button 
            variant="outline" 
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create New Order
          </Button>
        </div>
      </div>

      {/* Tabbed Dashboard */}
      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            My Orders
          </TabsTrigger>
          <TabsTrigger value="received" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Orders Received
          </TabsTrigger>
          <TabsTrigger value="accepted" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Orders Accepted
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Orders Completed
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            Reviews
          </TabsTrigger>
        </TabsList>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <AnalyticsCard
              title="Total Orders"
              value={myOrders.length}
              icon={Package}
              color="bg-primary/10"
            />
            <AnalyticsCard
              title="Total Vendors"
              value={totalVendors}
              icon={Users}
              color="bg-success/10"
            />
            <AnalyticsCard
              title="Total Revenue"
              value={`₹${totalRevenue.toFixed(0)}`}
              icon={TrendingUp}
              color="bg-secondary/10"
            />
            <AnalyticsCard
              title="Active Orders"
              value={activeOrders}
              icon={BarChart3}
              color="bg-warning/10"
            />
          </div>
          
          {/* Additional Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Order Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Open Orders</span>
                    <Badge variant="outline">{activeOrders}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Completed Orders</span>
                    <Badge variant="outline">{completedOrders}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Revenue Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">This Month</span>
                    <span className="font-bold text-primary">₹{totalRevenue.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average per Order</span>
                    <span className="font-bold text-secondary">₹{myOrders.length > 0 ? (totalRevenue / myOrders.length).toFixed(0) : '0'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Vendors</span>
                    <span className="font-bold text-green-600">{totalVendors}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* My Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-foreground">My Group Orders</h2>
            <Badge variant="outline" className="text-sm">
              {myOrders.length} Orders
            </Badge>
          </div>

          {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-8 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : myOrders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">You haven't created any group orders yet.</p>
            <p className="text-sm text-muted-foreground mt-2">Create your first bulk deal to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {myOrders.map((order) => (
            <Card key={order.id} className={`hover:shadow-lg transition-shadow ${
              order.status === 'cancelled' ? 'border-l-4 border-l-destructive opacity-75' : ''
            }`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl text-foreground">{order.item}</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Created on {order.createdAt}
                    </CardDescription>
                  </div>
                  <Badge variant={getStatusColor(order.status)}>
                    {order.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{order.description}</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-accent rounded-lg p-3">
                    <p className="text-sm text-accent-foreground">Bulk Price</p>
                    <p className="text-2xl font-bold text-primary">₹{order.bulkPrice}</p>
                    <p className="text-xs text-muted-foreground">per {order.unit}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">Quantity Progress</p>
                    <p className="text-lg font-bold text-foreground">
                      {order.totalQuantity}/{order.minQuantity}
                    </p>
                    <p className="text-xs text-muted-foreground">{order.unit} ordered</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{order.totalQuantity}/{order.minQuantity} {order.unit}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((order.totalQuantity / order.minQuantity) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{order.participants.length} vendors</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <OrderCountdown deadline={order.deadline} />
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs text-muted-foreground">Supplier Location:</span>
                    <span>{order.location.replace(/\s*\[[\d.-]+,[\d.-]+\]\s*/, '').trim()}</span>
                    {(() => {
                      const coordMatch = order.location.match(/\[([\d.-]+),([\d.-]+)\]/);
                      if (coordMatch) {
                        const lat = coordMatch[1];
                        const lng = coordMatch[2];
                        const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                        return (
                          <a
                            href={mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-xs underline ml-1"
                            title="View supplier location on map"
                          >
                            📍 View Map
                          </a>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {order.participants.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Participating Vendors:</p>
                    <div className="space-y-1">
                      {order.participants.map((participant) => (
                        <div key={participant.id} className="flex justify-between text-xs bg-muted rounded p-2">
                          <span className="text-muted-foreground">{participant.vendorName}</span>
                          <span className="font-medium">{participant.quantity} {order.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-secondary/10 rounded-lg p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Revenue:</span>
                    <span className="font-bold text-secondary">₹{(order.totalQuantity * order.bulkPrice).toFixed(0)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEditOrder(order)}
                    className="flex items-center gap-2"
                    disabled={order.status === 'cancelled' || order.status === 'completed'}
                  >
                    <Edit className="w-4 h-4" />
                    Edit Order
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleCancelOrder(order)}
                    className="flex items-center gap-2"
                    disabled={order.status === 'cancelled'}
                  >
                    <X className="w-4 h-4" />
                    Cancel Order
                  </Button>
                  {(order.status === 'cancelled' || order.status === 'completed') && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDeleteOrder(order)}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

              </TabsContent>

        {/* Orders Received Tab */}
        <TabsContent value="received" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Orders Received</h2>
            <Badge variant="outline" className="text-sm">
              {myOrders.filter(order => order.status === 'open' && order.participants.length > 0).length} Orders with Participants
            </Badge>
          </div>

          {myOrders.filter(order => order.status === 'open' && order.participants.length > 0).length === 0 ? (
                          <Card>
                <CardContent className="p-8 text-center">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No open orders with participants.</p>
                  <p className="text-sm text-muted-foreground mt-2">Orders with vendors will appear here once they join your open group orders.</p>
                </CardContent>
              </Card>
          ) : (
            <div className="space-y-6">
              {myOrders
                .filter(order => order.status === 'open' && order.participants.length > 0)
                .map((order) => (
                  <Card key={order.id} className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl text-foreground flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-blue-600" />
                            {order.item}
                          </CardTitle>
                          <CardDescription className="text-muted-foreground">
                            {order.participants.length} vendor{order.participants.length !== 1 ? 's' : ''} joined • 
                            Total Quantity: {order.totalQuantity} {order.unit} • 
                            Status: <Badge variant={getStatusColor(order.status)} className="ml-1">{order.status.toUpperCase()}</Badge>
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">₹{order.bulkPrice}</p>
                          <p className="text-sm text-muted-foreground">per {order.unit}</p>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">{order.description}</p>
                      
                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Order Progress</span>
                          <span>{order.totalQuantity}/{order.minQuantity} {order.unit}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              order.totalQuantity >= order.minQuantity ? 'bg-green-500' : 
                              order.totalQuantity >= order.minQuantity * 0.8 ? 'bg-orange-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min((order.totalQuantity / order.minQuantity) * 100, 100)}%` }}
                          />
                        </div>
                        <p className={`text-xs font-medium ${
                          order.totalQuantity >= order.minQuantity ? 'text-green-600' : 
                          order.totalQuantity >= order.minQuantity * 0.8 ? 'text-orange-600' : 'text-blue-600'
                        }`}>
                          {order.totalQuantity >= order.minQuantity 
                            ? '✅ Minimum quantity reached!' 
                            : order.totalQuantity >= order.minQuantity * 0.8
                            ? `🟠 Close to minimum! ${order.minQuantity - order.totalQuantity} more ${order.unit} needed`
                            : `${order.minQuantity - order.totalQuantity} more ${order.unit} needed`
                          }
                        </p>
                      </div>

                      {/* Vendor Details */}
                      {order.participants.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            <h4 className="font-medium text-foreground">Participating Vendors:</h4>
                          </div>
                          
                          <div className="grid gap-3">
                            {order.participants.map((participant) => (
                              <Card key={participant.id} className="bg-blue-50 border border-blue-200">
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-blue-600" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-foreground">{participant.vendorName}</p>
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                          <div className="flex items-center gap-1">
                                            <ShoppingCart className="w-3 h-3" />
                                            <span>{participant.quantity} {order.unit}</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            <span>Joined {participant.joinedAt}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="text-right">
                                      <p className="font-bold text-blue-600">₹{(participant.quantity * order.bulkPrice).toFixed(0)}</p>
                                      <p className="text-xs text-muted-foreground">Order Value</p>
                                    </div>
                                  </div>
                                  
                                  {/* Contact Info */}
                                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-blue-200">
                                    {participant.vendorPhone ? (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Phone className="w-3 h-3" />
                                        <span>{participant.vendorPhone}</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Phone className="w-3 h-3" />
                                        <span>No phone number</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <User className="w-3 h-3" />
                                      <span>{participant.vendorName}</span>
                                    </div>
                                    {participant.vendorLocation ? (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <MapPin className="w-3 h-3" />
                                        <span>Vendor Location:</span>
                                        <span>Lat: {participant.vendorLocation.lat.toFixed(4)}, Lng: {participant.vendorLocation.lng.toFixed(4)}</span>
                                        <a
                                          href={`https://www.google.com/maps?q=${participant.vendorLocation.lat},${participant.vendorLocation.lng}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 underline ml-1"
                                          title="View vendor delivery location on map"
                                        >
                                          📍
                                        </a>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <MapPin className="w-3 h-3" />
                                        <span>No vendor location set</span>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Order Summary */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Total Revenue</p>
                            <p className="text-xl font-bold text-blue-600">₹{(order.totalQuantity * order.bulkPrice).toFixed(0)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Vendor Savings</p>
                            <p className="text-xl font-bold text-primary">₹{((order.originalPrice - order.bulkPrice) * order.totalQuantity).toFixed(0)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {/* Process Order Button - Show when close to minimum but not reached */}
                        {order.totalQuantity < order.minQuantity && order.totalQuantity >= order.minQuantity * 0.8 && (
                          <Button 
                            onClick={() => handleProcessOrder(order)}
                            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Process Order ({order.totalQuantity}/{order.minQuantity} {order.unit})
                          </Button>
                        )}
                        
                        <Button 
                          onClick={() => handleTrackDeliveries(order)}
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                        >
                          <Truck className="w-4 h-4" />
                          Track Deliveries ({order.participants.length})
                        </Button>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
                              <Phone className="w-4 h-4" />
                              Contact Vendors ({order.participants.length})
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Phone className="w-5 h-5" />
                                Vendor Contact Information
                              </DialogTitle>
                              <DialogDescription>
                                Contact details for vendors participating in "{order.item}" order
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              {order.participants.map((participant) => (
                                <Card key={participant.id} className="border-l-4 border-l-blue-500">
                                  <CardContent className="p-4">
                                    <div className="flex items-center gap-3 mb-3">
                                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-blue-600" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-foreground">{participant.vendorName}</p>
                                        <p className="text-sm text-muted-foreground">
                                          {participant.quantity} {order.unit} • Joined {participant.joinedAt}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      {participant.vendorPhone ? (
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-blue-600" />
                                            <span className="text-sm font-medium">Phone:</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <a 
                                              href={`tel:${participant.vendorPhone}`}
                                              className="text-sm text-primary hover:underline cursor-pointer"
                                            >
                                              {participant.vendorPhone}
                                            </a>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="sm">
                                                  Contact
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent>
                                                <DropdownMenuItem asChild>
                                                  <a href={`tel:${participant.vendorPhone}`} className="flex items-center gap-2">
                                                    <Phone className="w-4 h-4" />
                                                    Call Vendor
                                                  </a>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                  onClick={() => {
                                                    navigator.clipboard.writeText(participant.vendorPhone!);
                                                    toast({
                                                      title: "Phone Number Copied!",
                                                      description: `${participant.vendorName}'s phone number copied to clipboard`,
                                                      variant: "default"
                                                    });
                                                  }}
                                                  className="flex items-center gap-2"
                                                >
                                                  📋 Copy Number
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                          <Phone className="w-4 h-4" />
                                          <span>No phone number available</span>
                                        </div>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <OrderCountdown deadline={order.deadline} />
                        </Button>
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span className="text-xs text-muted-foreground">Delivery:</span>
                          {(() => {
                            console.log('Order location in supplier dashboard:', order.location);
                            return order.location.replace(/\s*\[[\d.-]+,[\d.-]+\]\s*/, '').trim();
                          })()}
                          {(() => {
                            const coordMatch = order.location.match(/\[([\d.-]+),([\d.-]+)\]/);
                            if (coordMatch) {
                              const lat = coordMatch[1];
                              const lng = coordMatch[2];
                              const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                              return (
                                <a
                                  href={mapUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-xs underline ml-1"
                                  title="View delivery location on map"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  📍
                                </a>
                              );
                            }
                            return null;
                          })()}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        {/* Orders Accepted Tab */}
        <TabsContent value="accepted" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Orders Accepted</h2>
            <Badge variant="outline" className="text-sm">
              {myOrders.filter(order => order.status === 'accepted').length} Orders Accepted
            </Badge>
          </div>

          {myOrders.filter(order => order.status === 'accepted').length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No orders have been accepted yet.</p>
                <p className="text-sm text-muted-foreground mt-2">Orders will appear here once you accept them from the "Orders Received" tab.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {myOrders
                .filter(order => order.status === 'accepted')
                .map((order) => (
                  <Card key={order.id} className="border-l-4 border-l-green-500">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl text-foreground flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            {order.item}
                          </CardTitle>
                          <CardDescription className="text-muted-foreground">
                            ✅ Order accepted • 
                            {order.participants.length} vendor{order.participants.length !== 1 ? 's' : ''} joined • 
                            Total Quantity: {order.totalQuantity} {order.unit} • 
                            Status: <Badge variant="default" className="ml-1">ACCEPTED</Badge>
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">₹{order.bulkPrice}</p>
                          <p className="text-sm text-muted-foreground">per {order.unit}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">{order.description}</p>
                      {/* Success Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Order Progress</span>
                          <span className="text-green-600 font-medium">✅ {order.totalQuantity}/{order.minQuantity} {order.unit}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min((order.totalQuantity / order.minQuantity) * 100, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-green-600 font-medium">
                          ✅ Order ready for processing! Minimum quantity achieved.
                        </p>
                      </div>
                      {/* Track Delivery Button */}
                      <div className="flex justify-end">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex items-center gap-2"
                          onClick={() => handleTrackDeliveries(order)}
                        >
                          <Truck className="w-4 h-4" />
                          Track Delivery
                        </Button>
                      </div>
                      {/* Vendor Details */}
                      {order.participants.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            <h4 className="font-medium text-foreground">Participating Vendors:</h4>
                          </div>
                          
                          <div className="grid gap-3">
                            {order.participants.map((participant) => (
                              <Card key={participant.id} className="bg-green-50 border border-green-200">
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-green-600" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-foreground">{participant.vendorName}</p>
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                          <div className="flex items-center gap-1">
                                            <ShoppingCart className="w-3 h-3" />
                                            <span>{participant.quantity} {order.unit}</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            <span>Joined {participant.joinedAt}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="text-right">
                                      <p className="font-bold text-green-600">₹{(participant.quantity * order.bulkPrice).toFixed(0)}</p>
                                      <p className="text-xs text-muted-foreground">Order Value</p>
                                    </div>
                                  </div>
                                  
                                  {/* Contact Info */}
                                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-green-200">
                                    {participant.vendorPhone ? (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Phone className="w-3 h-3" />
                                        <span>{participant.vendorPhone}</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Phone className="w-3 h-3" />
                                        <span>No phone number</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <User className="w-3 h-3" />
                                      <span>{participant.vendorName}</span>
                                    </div>
                                    {participant.vendorLocation ? (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <MapPin className="w-3 h-3" />
                                        <span>Vendor Location:</span>
                                        <span>Lat: {participant.vendorLocation.lat.toFixed(4)}, Lng: {participant.vendorLocation.lng.toFixed(4)}</span>
                                        <a
                                          href={`https://www.google.com/maps?q=${participant.vendorLocation.lat},${participant.vendorLocation.lng}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 underline ml-1"
                                          title="View vendor delivery location on map"
                                        >
                                          📍
                                        </a>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <MapPin className="w-3 h-3" />
                                        <span>No vendor location set</span>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Order Summary */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Total Revenue</p>
                            <p className="text-xl font-bold text-green-600">₹{(order.totalQuantity * order.bulkPrice).toFixed(0)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Vendor Savings</p>
                            <p className="text-xl font-bold text-primary">₹{((order.originalPrice - order.bulkPrice) * order.totalQuantity).toFixed(0)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button 
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleCompleteOrder(order)}
                        >
                          <CheckCircle className="w-4 h-4" />
                          Complete Order
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              Contact All Vendors ({order.participants.length})
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Phone className="w-5 h-5" />
                                Vendor Contact Information
                              </DialogTitle>
                              <DialogDescription>
                                Contact details for vendors participating in "{order.item}" order
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              {order.participants.map((participant) => (
                                <Card key={participant.id} className="border-l-4 border-l-green-500">
                                  <CardContent className="p-4">
                                    <div className="flex items-center gap-3 mb-3">
                                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-green-600" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-foreground">{participant.vendorName}</p>
                                        <p className="text-sm text-muted-foreground">
                                          {participant.quantity} {order.unit} • Joined {participant.joinedAt}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      {participant.vendorPhone ? (
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-green-600" />
                                            <span className="text-sm font-medium">Phone:</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <a 
                                              href={`tel:${participant.vendorPhone}`}
                                              className="text-sm text-primary hover:underline cursor-pointer"
                                            >
                                              {participant.vendorPhone}
                                            </a>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="sm">
                                                  Contact
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent>
                                                <DropdownMenuItem asChild>
                                                  <a href={`tel:${participant.vendorPhone}`} className="flex items-center gap-2">
                                                    <Phone className="w-4 h-4" />
                                                    Call Vendor
                                                  </a>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                  onClick={() => {
                                                    navigator.clipboard.writeText(participant.vendorPhone!);
                                                    toast({
                                                      title: "Phone Number Copied!",
                                                      description: `${participant.vendorName}'s phone number copied to clipboard`,
                                                      variant: "default"
                                                    });
                                                  }}
                                                  className="flex items-center gap-2"
                                                >
                                                  📋 Copy Number
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                          <Phone className="w-4 h-4" />
                                          <span>No phone number available</span>
                                        </div>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <OrderCountdown deadline={order.deadline} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        {/* Orders Completed Tab */}
        <TabsContent value="completed" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Orders Completed</h2>
            <Badge variant="outline" className="text-sm">
              {completedOrders} Orders Completed
            </Badge>
          </div>

          {completedOrders === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No orders have been completed yet.</p>
                <p className="text-sm text-muted-foreground mt-2">Orders will appear here once you complete them from the "Orders Accepted" tab.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {myOrders
                .filter(order => order.status === 'completed')
                .map((order) => (
                  <Card key={order.id} className="border-l-4 border-l-secondary">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl text-foreground flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-secondary" />
                            {order.item}
                          </CardTitle>
                          <CardDescription className="text-muted-foreground">
                            ✅ Order completed • 
                            {order.participants.length} vendor{order.participants.length !== 1 ? 's' : ''} participated • 
                            Total Quantity: {order.totalQuantity} {order.unit} • 
                            Status: <Badge variant="secondary" className="ml-1">COMPLETED</Badge>
                          </CardDescription>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <div>
                            <p className="text-2xl font-bold text-secondary">₹{order.bulkPrice}</p>
                            <p className="text-sm text-muted-foreground">per {order.unit}</p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex items-center gap-2"
                            onClick={() => handleDeleteOrder(order)}
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">{order.description}</p>
                      
                      {/* Completion Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Order Progress</span>
                          <span className="text-secondary font-medium">✅ {order.totalQuantity}/{order.minQuantity} {order.unit}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-secondary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min((order.totalQuantity / order.minQuantity) * 100, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-secondary font-medium">
                          ✅ Order successfully completed! Transaction finalized.
                        </p>
                      </div>

                      {/* Vendor Details */}
                      {order.participants.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            <h4 className="font-medium text-foreground">Participating Vendors:</h4>
                          </div>
                          
                          <div className="grid gap-3">
                            {order.participants.map((participant) => (
                              <Card key={participant.id} className="bg-secondary/5 border border-secondary/20">
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-secondary" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-foreground">{participant.vendorName}</p>
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                          <div className="flex items-center gap-1">
                                            <ShoppingCart className="w-3 h-3" />
                                            <span>{participant.quantity} {order.unit}</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            <span>Joined {participant.joinedAt}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="text-right">
                                      <p className="text-sm font-medium text-foreground">₹{(order.bulkPrice * participant.quantity).toFixed(0)}</p>
                                      <p className="text-xs text-muted-foreground">Total Value</p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              Contact All Vendors ({order.participants.length})
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Phone className="w-5 h-5" />
                                Vendor Contact Information
                              </DialogTitle>
                              <DialogDescription>
                                Contact details for vendors who participated in "{order.item}" order
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              {order.participants.map((participant) => (
                                <Card key={participant.id} className="border-l-4 border-l-secondary">
                                  <CardContent className="p-4">
                                    <div className="flex items-center gap-3 mb-3">
                                      <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-secondary" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-foreground">{participant.vendorName}</p>
                                        <p className="text-sm text-muted-foreground">
                                          {participant.quantity} {order.unit} • Joined {participant.joinedAt}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      {participant.vendorPhone ? (
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-secondary" />
                                            <span className="text-sm font-medium">Phone:</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <a 
                                              href={`tel:${participant.vendorPhone}`}
                                              className="text-sm text-primary hover:underline cursor-pointer"
                                            >
                                              {participant.vendorPhone}
                                            </a>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="sm">
                                                  Contact
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent>
                                                <DropdownMenuItem asChild>
                                                  <a href={`tel:${participant.vendorPhone}`} className="flex items-center gap-2">
                                                    <Phone className="w-4 h-4" />
                                                    Call Vendor
                                                  </a>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                  onClick={() => {
                                                    navigator.clipboard.writeText(participant.vendorPhone!);
                                                    toast({
                                                      title: "Phone Number Copied!",
                                                      description: `${participant.vendorName}'s phone number copied to clipboard`,
                                                      variant: "default"
                                                    });
                                                  }}
                                                  className="flex items-center gap-2"
                                                >
                                                  📋 Copy Number
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                          <Phone className="w-4 h-4" />
                                          <span>No phone number available</span>
                                        </div>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <OrderCountdown deadline={order.deadline} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Product Reviews</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-sm font-medium">
                  {reviews.length > 0 
                    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
                    : '0.0'
                  } / 5.0
                </span>
              </div>
              <Badge variant="outline" className="text-sm">
                {reviews.length} Review{reviews.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>

          {/* Filter Controls */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Product Filter */}
                <div className="flex-1">
                  <Label htmlFor="product-filter" className="text-sm font-medium mb-2 block">
                    Filter by Product
                  </Label>
                  <select
                    id="product-filter"
                    value={reviewProductFilter}
                    onChange={(e) => setReviewProductFilter(e.target.value)}
                    className="w-full p-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">All Products</option>
                    {uniqueProducts.map((product) => (
                      <option key={product} value={product}>
                        {product}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rating Filter */}
                <div className="flex-1">
                  <Label htmlFor="rating-filter" className="text-sm font-medium mb-2 block">
                    Filter by Rating
                  </Label>
                  <select
                    id="rating-filter"
                    value={reviewRatingFilter || ''}
                    onChange={(e) => setReviewRatingFilter(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full p-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">All Ratings</option>
                    <option value="5">5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="2">2 Stars</option>
                    <option value="1">1 Star</option>
                  </select>
                </div>

                {/* Clear Filters Button */}
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setReviewProductFilter('');
                      setReviewRatingFilter(null);
                    }}
                    disabled={!reviewProductFilter && reviewRatingFilter === null}
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Clear Filters
                  </Button>
                </div>
              </div>

              {/* Filter Summary */}
              {(reviewProductFilter || reviewRatingFilter !== null) && (
                <div className="mt-3 p-2 bg-muted/30 rounded-md">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredReviews.length} of {reviews.length} reviews
                    {reviewProductFilter && ` • Product: ${reviewProductFilter}`}
                    {reviewRatingFilter !== null && ` • Rating: ${reviewRatingFilter} star${reviewRatingFilter !== 1 ? 's' : ''}`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {filteredReviews.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {reviews.length === 0 ? 'No reviews yet.' : 'No reviews match your filters.'}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {reviews.length === 0 
                    ? 'Reviews will appear here once vendors complete their orders and leave feedback.'
                    : 'Try adjusting your filters to see more reviews.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredReviews.map((review) => (
                <Card key={review.id} className="border-l-4 border-l-yellow-400">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg text-foreground">{review.orderItem}</CardTitle>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= review.rating 
                                    ? 'text-yellow-400 fill-current' 
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <CardDescription className="text-muted-foreground">
                          Review by <span className="font-medium text-foreground">{review.vendorName}</span> • 
                          Order: {review.orderQuantity} • Value: {review.orderValue} • 
                          {new Date(review.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Review Comment */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-gray-800 leading-relaxed">
                        "{review.comment}"
                      </p>
                    </div>

                    {/* Review Stats */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-lg font-bold text-foreground">{review.rating}/5</p>
                        <p className="text-xs text-muted-foreground">Rating</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-lg font-bold text-foreground">{review.orderQuantity}</p>
                        <p className="text-xs text-muted-foreground">Order Size</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-lg font-bold text-foreground">{review.orderValue}</p>
                        <p className="text-xs text-muted-foreground">Order Value</p>
                      </div>
                    </div>

                    {/* Review Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-muted">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span>Vendor: {review.vendorName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(review.createdAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Review Summary */}
          {filteredReviews.length > 0 && (
            <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">
                  Review Summary
                  {(reviewProductFilter || reviewRatingFilter !== null) && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      (Filtered Results)
                    </span>
                  )}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-5 h-5 ${
                            star <= (filteredReviews.reduce((sum, review) => sum + review.rating, 0) / filteredReviews.length)
                              ? 'text-yellow-400 fill-current' 
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {filteredReviews.length > 0 
                        ? (filteredReviews.reduce((sum, review) => sum + review.rating, 0) / filteredReviews.length).toFixed(1)
                        : '0.0'
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">Average Rating</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{filteredReviews.length}</p>
                    <p className="text-sm text-muted-foreground">
                      {reviewProductFilter || reviewRatingFilter !== null ? 'Filtered' : 'Total'} Reviews
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {filteredReviews.filter(review => review.rating >= 4).length}
                    </p>
                    <p className="text-sm text-muted-foreground">Positive Reviews (4+ stars)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Cancel Order Confirmation Dialog */}
      <Dialog open={!!cancellingOrder} onOpenChange={() => setCancellingOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <X className="w-5 h-5" />
              Cancel Order
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this order? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {cancellingOrder && (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-2">{cancellingOrder.item}</h4>
                <p className="text-sm text-muted-foreground mb-2">by {cancellingOrder.supplierName}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Quantity:</span>
                    <span className="font-medium ml-1">{cancellingOrder.totalQuantity} {cancellingOrder.unit}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Participants:</span>
                    <span className="font-medium ml-1">{cancellingOrder.participants.length} vendors</span>
                  </div>
                </div>
              </div>

              {/* Warning Message */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <div className="text-amber-600 mt-0.5">⚠️</div>
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">This will:</p>
                    <ul className="text-amber-700 mt-1 space-y-1">
                      <li>• Cancel the entire group order</li>
                      <li>• Remove all participating vendors</li>
                      <li>• Set order status to "cancelled"</li>
                      <li>• This action cannot be undone</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={confirmCancelOrder}
                  disabled={isCancelling}
                  className="flex-1 bg-destructive hover:bg-destructive/90"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    'Cancel Order'
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setCancellingOrder(null)}
                  disabled={isCancelling}
                >
                  Keep Order
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Process Order Confirmation Dialog */}
      <Dialog open={!!processingOrder} onOpenChange={() => setProcessingOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              Accept Order
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to accept this order? This will mark it as accepted and ready for processing.
            </DialogDescription>
          </DialogHeader>
          
          {processingOrder && (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-2">{processingOrder.item}</h4>
                <p className="text-sm text-muted-foreground mb-2">by {processingOrder.supplierName}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Quantity:</span>
                    <span className="font-medium ml-1">{processingOrder.totalQuantity} {processingOrder.unit}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Participants:</span>
                    <span className="font-medium ml-1">{processingOrder.participants.length} vendors</span>
                  </div>
                </div>
              </div>

              {/* Success Message */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <div className="text-green-600 mt-0.5">✅</div>
                  <div className="text-sm">
                    <p className="font-medium text-green-800">This will:</p>
                    <ul className="text-green-700 mt-1 space-y-1">
                      <li>• Mark the order as "accepted"</li>
                      <li>• Notify all participating vendors</li>
                      <li>• Move the order to accepted status</li>
                      <li>• Vendors can see the order is accepted</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={confirmProcessOrder}
                  disabled={isProcessing}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Accept Order'
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setProcessingOrder(null)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Complete Order Confirmation Dialog */}
      <Dialog open={!!completingOrder} onOpenChange={() => setCompletingOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <CheckCircle className="w-5 h-5" />
              Complete Order
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to complete this order? This will mark it as completed and finalize the transaction.
            </DialogDescription>
          </DialogHeader>
          
          {completingOrder && (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-2">{completingOrder.item}</h4>
                <p className="text-sm text-muted-foreground mb-2">by {completingOrder.supplierName}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Quantity:</span>
                    <span className="font-medium ml-1">{completingOrder.totalQuantity} {completingOrder.unit}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Participants:</span>
                    <span className="font-medium ml-1">{completingOrder.participants.length} vendors</span>
                  </div>
                </div>
              </div>

              {/* Success Message */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <div className="text-blue-600 mt-0.5">✅</div>
                  <div className="text-sm">
                    <p className="font-medium text-blue-800">This will:</p>
                    <ul className="text-blue-700 mt-1 space-y-1">
                      <li>• Mark the order as "completed"</li>
                      <li>• Finalize the transaction</li>
                      <li>• Notify all participating vendors</li>
                      <li>• Move the order to completed status</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={confirmCompleteOrder}
                  disabled={isCompleting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isCompleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    'Complete Order'
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setCompletingOrder(null)}
                  disabled={isCompleting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Order Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Order Details</DialogTitle>
            <DialogDescription>
              Update your group order information
            </DialogDescription>
          </DialogHeader>
          
          {editingOrder && (
            <form onSubmit={handleUpdateOrder} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-item">Item Name</Label>
                <Input
                  id="edit-item"
                  value={newOrder.item}
                  onChange={(e) => setNewOrder({...newOrder, item: e.target.value})}
                  placeholder="e.g., Onions, Potatoes"
                  className={formErrors.item ? 'border-red-500' : ''}
                />
                {formErrors.item && (
                  <p className="text-sm text-red-500">{formErrors.item}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={newOrder.description}
                  onChange={(e) => setNewOrder({...newOrder, description: e.target.value})}
                  placeholder="Describe the quality and specifications"
                  rows={3}
                  className={formErrors.description ? 'border-red-500' : ''}
                />
                {formErrors.description && (
                  <p className="text-sm text-red-500">{formErrors.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-bulkPrice">Bulk Price (₹)</Label>
                  <Input
                    id="edit-bulkPrice"
                    type="number"
                    value={newOrder.bulkPrice || ''}
                    onChange={(e) => setNewOrder({...newOrder, bulkPrice: parseFloat(e.target.value) || 0})}
                    placeholder="25"
                    min="0"
                    step="0.01"
                    className={formErrors.bulkPrice ? 'border-red-500' : ''}
                  />
                  {formErrors.bulkPrice && (
                    <p className="text-sm text-red-500">{formErrors.bulkPrice}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-originalPrice">Regular Price (₹)</Label>
                  <Input
                    id="edit-originalPrice"
                    type="number"
                    value={newOrder.originalPrice || ''}
                    onChange={(e) => setNewOrder({...newOrder, originalPrice: parseFloat(e.target.value) || 0})}
                    placeholder="40"
                    min="0"
                    step="0.01"
                    className={formErrors.originalPrice ? 'border-red-500' : ''}
                  />
                  {formErrors.originalPrice && (
                    <p className="text-sm text-red-500">{formErrors.originalPrice}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-minQuantity">Minimum Quantity</Label>
                  <Input
                    id="edit-minQuantity"
                    type="number"
                    value={newOrder.minQuantity || ''}
                    onChange={(e) => setNewOrder({...newOrder, minQuantity: parseInt(e.target.value) || 0})}
                    placeholder="100"
                    min="1"
                    className={formErrors.minQuantity ? 'border-red-500' : ''}
                  />
                  {formErrors.minQuantity && (
                    <p className="text-sm text-red-500">{formErrors.minQuantity}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-maxQuantity">Maximum Quantity</Label>
                  <Input
                    id="edit-maxQuantity"
                    type="number"
                    value={newOrder.maxQuantity || ''}
                    onChange={(e) => setNewOrder({...newOrder, maxQuantity: parseInt(e.target.value) || 0})}
                    placeholder="500"
                    min="1"
                    className={formErrors.maxQuantity ? 'border-red-500' : ''}
                  />
                  {formErrors.maxQuantity && (
                    <p className="text-sm text-red-500">{formErrors.maxQuantity}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-unit">Unit</Label>
                  <Input
                    id="edit-unit"
                    value={newOrder.unit}
                    onChange={(e) => setNewOrder({...newOrder, unit: e.target.value})}
                    placeholder="kg, pieces, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-deadline">Deadline</Label>
                  <Input
                    id="edit-deadline"
                    type="date"
                    value={newOrder.deadline}
                    onChange={(e) => setNewOrder({...newOrder, deadline: e.target.value})}
                    className={formErrors.deadline ? 'border-red-500' : ''}
                  />
                  {formErrors.deadline && (
                    <p className="text-sm text-red-500">{formErrors.deadline}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-location">Location Name/Address</Label>
                <Input
                  id="edit-location"
                  value={newOrder.location}
                  onChange={(e) => setNewOrder({...newOrder, location: e.target.value})}
                  placeholder="e.g., Mumbai Central Market"
                  className={formErrors.location ? 'border-red-500' : ''}
                />
                {formErrors.location && (
                  <p className="text-sm text-red-500">{formErrors.location}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Pick Location on Map *</Label>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
                  <div className="flex items-start gap-2">
                    <div className="text-amber-600 mt-0.5">⚠️</div>
                    <div className="text-sm">
                      <p className="font-medium text-amber-800">Location selection is mandatory</p>
                      <p className="text-amber-700 mt-1">You must select a delivery location on the map to update this group order. Vendors need this information to calculate delivery charges.</p>
                    </div>
                  </div>
                </div>
                <UseMyLocationButton onSetLocation={setLocationLatLng} />
                <div className="rounded-lg border overflow-hidden" style={{ position: 'relative' }}>
                  <MapContainer
                    ref={mapRef}
                    center={(locationLatLng || DEFAULT_CENTER) as LatLngExpression}
                    zoom={locationLatLng ? 14 : 10}
                    style={MAP_CONTAINER_STYLE}
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution="&copy; OpenStreetMap contributors"
                    />
                                                                      <LocationPicker value={locationLatLng} onChange={setLocationLatLng} />
                          {locationLatLng && (
                            <Marker position={locationLatLng as LatLngExpression} icon={RedIcon} />
                          )}
                  </MapContainer>
                </div>
                {locationLatLng && (
                  <p className="text-xs text-green-600 font-medium">
                    ✅ Location selected: {locationLatLng.lat.toFixed(6)}, {locationLatLng.lng.toFixed(6)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-deliveryCharge">Delivery Charge (₹/km)</Label>
                  <Input
                    id="edit-deliveryCharge"
                    type="number"
                    value={newOrder.deliveryChargePerKm || ''}
                    onChange={(e) => setNewOrder({...newOrder, deliveryChargePerKm: parseFloat(e.target.value) || 0})}
                    placeholder="5"
                    min="0"
                    step="0.01"
                    className={formErrors.deliveryChargePerKm ? 'border-red-500' : ''}
                  />
                  {formErrors.deliveryChargePerKm && (
                    <p className="text-sm text-red-500">{formErrors.deliveryChargePerKm}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-contactPhone">Contact Phone</Label>
                  <Input
                    id="edit-contactPhone"
                    type="tel"
                    value={newOrder.contactPhone}
                    onChange={(e) => {
                      // Only allow digits and limit to 10 characters
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setNewOrder({...newOrder, contactPhone: value});
                    }}
                    placeholder="Enter 10-digit mobile number"
                    className={formErrors.contactPhone ? 'border-red-500' : ''}
                    maxLength={10}
                  />
                  {formErrors.contactPhone && (
                    <p className="text-sm text-red-500">{formErrors.contactPhone}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Enter 10-digit mobile number
                  </p>
                  {newOrder.contactPhone && newOrder.contactPhone.length !== 10 && (
                    <p className="text-xs text-red-500">
                      Phone number must be exactly 10 digits
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  disabled={isEditing}
                  className="flex-1"
                >
                  {isEditing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Order'
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Process Order Confirmation Dialog */}
      <Dialog open={!!processingOrder} onOpenChange={() => setProcessingOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <CheckCircle className="w-5 h-5" />
              Process Order Early
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to process this order before reaching the minimum quantity?
            </DialogDescription>
          </DialogHeader>
          
          {processingOrder && (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-medium text-orange-800 mb-2">{processingOrder.item}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-orange-700">Current Quantity:</span>
                    <span className="font-medium ml-1 text-orange-800">{processingOrder.totalQuantity} {processingOrder.unit}</span>
                  </div>
                  <div>
                    <span className="text-orange-700">Minimum Required:</span>
                    <span className="font-medium ml-1 text-orange-800">{processingOrder.minQuantity} {processingOrder.unit}</span>
                  </div>
                  <div>
                    <span className="text-orange-700">Missing:</span>
                    <span className="font-medium ml-1 text-orange-800">{processingOrder.minQuantity - processingOrder.totalQuantity} {processingOrder.unit}</span>
                  </div>
                  <div>
                    <span className="text-orange-700">Revenue:</span>
                    <span className="font-medium ml-1 text-orange-800">₹{(processingOrder.totalQuantity * processingOrder.bulkPrice).toFixed(0)}</span>
                  </div>
                </div>
              </div>

              {/* Warning Message */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <div className="text-amber-600 mt-0.5">⚠️</div>
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">Processing order early</p>
                    <p className="text-amber-700 mt-1">
                      This order has not reached the minimum quantity of {processingOrder.minQuantity} {processingOrder.unit}. 
                      Processing it early means you'll proceed with {processingOrder.totalQuantity} {processingOrder.unit} instead.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={confirmProcessOrder}
                  disabled={isProcessing}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Yes, Process Order'
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setProcessingOrder(null)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delivery Tracking Modal */}
      <Dialog open={isDeliveryTrackingModalOpen} onOpenChange={setIsDeliveryTrackingModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Route className="w-5 h-5" />
              Track All Delivery Routes
            </DialogTitle>
            <DialogDescription>
              View delivery routes from your location to all participating vendors
            </DialogDescription>
          </DialogHeader>
          
          {trackingOrder && user && (() => {
            // Extract supplier location
            const locationMatch = trackingOrder.location.match(/\[([\d.-]+),([\d.-]+)\]/);
            if (!locationMatch) return null;

            const supplierLat = parseFloat(locationMatch[1]);
            const supplierLng = parseFloat(locationMatch[2]);
            const supplierLocation = { lat: supplierLat, lng: supplierLng };

            // Calculate center point for map (average of all locations)
            const allLocations = [supplierLocation, ...trackingOrder.participants.map(p => p.vendorLocation).filter(Boolean)];
            const centerLat = allLocations.reduce((sum, loc) => sum + loc.lat, 0) / allLocations.length;
            const centerLng = allLocations.reduce((sum, loc) => sum + loc.lng, 0) / allLocations.length;

            return (
              <div className="space-y-4">
                {/* Order Info */}
                <div className="bg-muted/30 rounded-lg p-4">
                  <h4 className="font-medium text-foreground mb-2">{trackingOrder.item}</h4>
                  <p className="text-sm text-muted-foreground mb-2">by {trackingOrder.supplierName}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Vendors:</span>
                      <span className="font-medium ml-1">{trackingOrder.participants.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Quantity:</span>
                      <span className="font-medium ml-1">{trackingOrder.totalQuantity} {trackingOrder.unit}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={getStatusColor(trackingOrder.status)} className="ml-1">
                        {trackingOrder.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Revenue:</span>
                      <span className="font-medium ml-1">₹{(trackingOrder.totalQuantity * trackingOrder.bulkPrice).toFixed(0)}</span>
                    </div>
                  </div>
                </div>

                {/* Route Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="font-medium text-red-800">Your Location (Supplier)</span>
                      </div>
                                              <p className="text-sm text-red-700">{trackingOrder.location.replace(/\s*\[[\d.-]+,[\d.-]+\]\s*/, '').trim()}</p>
                        <p className="text-xs text-red-600">Lat: {supplierLat.toFixed(4)}, Lng: {supplierLng.toFixed(4)}</p>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="font-medium text-green-800">Delivery Destinations</span>
                      </div>
                      <p className="text-sm text-green-700">{trackingOrder.participants.length} vendor locations</p>
                      <p className="text-xs text-green-600">All routes calculated and displayed on map</p>
                    </div>

                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Route className="w-4 h-4 text-orange-600" />
                        <span className="font-medium text-orange-800">Route Summary</span>
                      </div>
                      <div className="space-y-1 text-sm text-orange-700">
                        {trackingOrder.participants.map((participant, index) => {
                          if (!participant.vendorLocation) return null;
                          const distance = calculateDistance(supplierLat, supplierLng, participant.vendorLocation.lat, participant.vendorLocation.lng);
                          return (
                            <div key={participant.id} className="flex justify-between">
                              <span>{participant.vendorName}:</span>
                              <span>{distance.toFixed(1)} km</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Map */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Delivery Routes Map</Label>
                    {isLoadingRoutes ? (
                      <div className="w-full h-[400px] bg-muted rounded-lg flex items-center justify-center">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Loading routes...</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-[400px] rounded-lg overflow-hidden border">
                        <MapContainer
                          center={[centerLat, centerLng]}
                          zoom={10}
                          style={{ width: '100%', height: '100%' }}
                        >
                          <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          />
                          
                          {/* Supplier Marker */}
                          <Marker position={[supplierLat, supplierLng]} icon={RedIcon} />
                          
                          {/* Vendor Markers and Routes */}
                          {trackingOrder.participants.map((participant, index) => {
                            if (!participant.vendorLocation) return null;
                            
                            const vendorIcons = [GreenIcon, BlueIcon, OrangeIcon, PurpleIcon, YellowIcon, RedIcon];
                            const vendorIcon = vendorIcons[index % vendorIcons.length];
                            const colors = ['#10b981', '#3b82f6', '#f97316', '#8b5cf6', '#f59e0b', '#ef4444'];
                            const color = colors[index % colors.length];
                            
                            return (
                              <React.Fragment key={participant.id}>
                                {/* Vendor Marker */}
                                <Marker position={[participant.vendorLocation.lat, participant.vendorLocation.lng]} icon={vendorIcon} />
                                
                                {/* Route Line */}
                                {deliveryRoutes[participant.vendorId] && (
                                  <Polyline
                                    positions={deliveryRoutes[participant.vendorId]}
                                    color={color}
                                    weight={3}
                                    opacity={0.8}
                                  />
                                )}
                              </React.Fragment>
                            );
                          })}
                        </MapContainer>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vendor Details Table */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Vendor Details</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 text-sm font-medium">Vendor</th>
                          <th className="text-left p-3 text-sm font-medium">Quantity</th>
                          <th className="text-left p-3 text-sm font-medium">Distance</th>
                          <th className="text-left p-3 text-sm font-medium">Delivery Time</th>
                          <th className="text-left p-3 text-sm font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trackingOrder.participants.map((participant, index) => {
                          if (!participant.vendorLocation) return null;
                          const distance = calculateDistance(supplierLat, supplierLng, participant.vendorLocation.lat, participant.vendorLocation.lng);
                          const deliveryTime = Math.ceil(distance / 30); // 30 km/h average
                          
                          return (
                            <tr key={participant.id} className="border-t">
                              <td className="p-3">
                                <div>
                                  <p className="font-medium text-sm">{participant.vendorName}</p>
                                  <p className="text-xs text-muted-foreground">{participant.vendorPhone || 'No phone'}</p>
                                </div>
                              </td>
                              <td className="p-3 text-sm">{participant.quantity} {trackingOrder.unit}</td>
                              <td className="p-3 text-sm">{distance.toFixed(1)} km</td>
                              <td className="p-3 text-sm">~{deliveryTime} hour{deliveryTime !== 1 ? 's' : ''}</td>
                              <td className="p-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const url = `https://www.google.com/maps/dir/${supplierLat},${supplierLng}/${participant.vendorLocation.lat},${participant.vendorLocation.lng}`;
                                    window.open(url, '_blank');
                                  }}
                                  className="text-xs"
                                >
                                  <Navigation className="w-3 h-3 mr-1" />
                                  Route
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      // Open all routes in Google Maps
                      const urls = trackingOrder.participants.map(participant => {
                        if (!participant.vendorLocation) return null;
                        return `https://www.google.com/maps/dir/${supplierLat},${supplierLng}/${participant.vendorLocation.lat},${participant.vendorLocation.lng}`;
                      }).filter(Boolean);
                      
                      // Open first route in new tab
                      if (urls.length > 0) {
                        window.open(urls[0], '_blank');
                      }
                    }}
                    className="flex-1"
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Open Routes in Google Maps
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setIsDeliveryTrackingModalOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete Order Confirmation Dialog */}
      <Dialog open={!!deletingOrder} onOpenChange={() => setDeletingOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete Order
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this order? This action cannot be undone and will remove all associated data.
            </DialogDescription>
          </DialogHeader>
          
          {deletingOrder && (
            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <h4 className="font-medium text-destructive mb-2">{deletingOrder.item}</h4>
                <p className="text-sm text-muted-foreground">
                  Status: {deletingOrder.status.toUpperCase()} • {deletingOrder.participants.length} participants
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="destructive" 
                  onClick={confirmDeleteOrder}
                  disabled={isDeleting}
                  className="flex-1"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Order
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setDeletingOrder(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierDashboard;