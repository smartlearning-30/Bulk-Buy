import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useFirebaseOrders } from '@/hooks/useFirebaseOrders';
import { GroupOrder } from '@/types';
import { calculateDistance } from '@/lib/utils';
import { ShoppingCart, Users, Calendar, MapPin, Package, TrendingDown, Loader2, Search, Filter, RefreshCw, PieChart, Activity, Phone, Mail, Truck, Receipt, Edit, X, Navigation, CheckCircle, Download, Star, Route, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { MapContainer, TileLayer, Marker, useMapEvents, Polyline, Popup } from 'react-leaflet';
import L, { LatLngExpression, Icon, Map as LeafletMap, DivIcon } from 'leaflet';
import { userService } from '@/services/firebaseService';

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
const GreenIcon = createDivIcon('#10b981', 'V'); // Green for vendor

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

// Success Stories Component
const SuccessStories = () => (
  <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200">
    <h3 className="text-lg font-semibold mb-4 text-green-800">Success Stories</h3>
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
          <TrendingDown className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <p className="font-medium text-green-800">Raj Chaat Corner saved ₹300 on onions</p>
          <p className="text-sm text-green-600">Joined group order with 5 other vendors</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <Users className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <p className="font-medium text-blue-800">Mumbai Street Foods saved ₹450 on potatoes</p>
          <p className="text-sm text-blue-600">Bulk purchase with 3 other vendors</p>
        </div>
      </div>
    </div>
  </div>
);

const VendorDashboard = () => {
  const { user } = useFirebaseAuth();
  console.log('VendorDashboard: Current user:', user);
  console.log('VendorDashboard: User ID:', user?.id);
  console.log('VendorDashboard: User email:', user?.email);
  const { orders, joinOrder, updateParticipantQuantity, updateParticipantDetails, removeParticipant, isLoading, generateDemoData, getRemainingQuantity, isOrderAvailable, markParticipantReviewed } = useFirebaseOrders();




  const [joinQuantities, setJoinQuantities] = useState<{ [key: string]: number }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<GroupOrder | null>(null);
  const [editQuantity, setEditQuantity] = useState(0);
  const [editPhone, setEditPhone] = useState('');
  const [editLocation, setEditLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<GroupOrder | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<GroupOrder | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState<GroupOrder | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [joiningOrder, setJoiningOrder] = useState<GroupOrder | null>(null);
  const [joinQuantity, setJoinQuantity] = useState(0);
  const [vendorPhone, setVendorPhone] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isDeliveryTrackingModalOpen, setIsDeliveryTrackingModalOpen] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState<GroupOrder | null>(null);
  const [deliveryRoute, setDeliveryRoute] = useState<any[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);

  const availableOrders = orders.filter(order => {
    // Only show open orders (exclude expired, cancelled, etc.)
    if (order.status !== 'open') return false;
    
    // Check if current vendor has already participated
    const hasParticipated = order.participants.some(p => p.vendorId === user?.id);
    
    // If vendor hasn't participated, show the order
    if (!hasParticipated) return true;
    
    // If vendor has participated, only show if there's still remaining quantity
    const remainingQuantity = order.maxQuantity - order.totalQuantity;
    return remainingQuantity > 0;
  });







  const filteredOrders = availableOrders.filter(order => {
    // Extract city name from location (remove coordinates)
    const cityName = order.location.replace(/\s*\[[\d.-]+,[\d.-]+\]\s*/, '').trim();
    
    const matchesSearch = order.item.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = locationFilter === '' || cityName.toLowerCase().includes(locationFilter.toLowerCase());
    
    // Debug logging
    if (locationFilter) {
      console.log(`Order: ${order.item}, Location: "${order.location}" -> City: "${cityName}", Matches: ${matchesLocation}`);
    }
    
    return matchesSearch && matchesLocation;
  });

  // Filter orders for current vendor using real-time data
  const myOrders = orders.filter(order => 
    order.participants.some(p => p.vendorId === user?.id)
  );

  // Location helper function
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

  const handleJoinOrderClick = (order: GroupOrder) => {
    const quantity = joinQuantities[order.id] || 10;
    console.log('Joining order:', order);
    console.log('Order location:', order.location);
    setJoiningOrder(order);
    setJoinQuantity(quantity);
    setIsLocationModalOpen(true);
  };

  const handleJoinOrder = async () => {
    if (!user || !joiningOrder) return;
    
    if (joinQuantity <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity",
        variant: "destructive"
      });
      return;
    }

    if (joiningOrder.totalQuantity + joinQuantity > joiningOrder.maxQuantity) {
      toast({
        title: "Quantity Limit Exceeded",
        description: `Maximum quantity is ${joiningOrder.maxQuantity}${joiningOrder.unit}`,
        variant: "destructive"
      });
      return;
    }

    if (!selectedLocation) {
      toast({
        title: "Location Required",
        description: "Please select your delivery location",
        variant: "destructive"
      });
      return;
    }

    if (!vendorPhone.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter your phone number for supplier coordination",
        variant: "destructive"
      });
      return;
    }

    if (vendorPhone.length !== 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Phone number must be exactly 10 digits",
        variant: "destructive"
      });
      return;
    }

    setIsJoining(true);
    try {
      await joinOrder(joiningOrder.id, user.id, user.name, joinQuantity, selectedLocation, vendorPhone);
      toast({
        title: "Successfully Joined!",
        description: `You've joined the group order for ${joiningOrder.item}`,
        variant: "default"
      });
      setJoinQuantities(prev => ({ ...prev, [joiningOrder.id]: 0 }));
      setIsLocationModalOpen(false);
      setJoiningOrder(null);
      setJoinQuantity(0);
      setSelectedLocation(null);
      setVendorPhone('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Please try again";
      toast({
        title: "Failed to Join",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsJoining(false);
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

  // Force refresh available orders after cancellation
  const forceRefreshAvailableOrders = () => {
    // Trigger a re-render to update the available orders list
    // Since we're using real-time Firebase updates, this ensures the UI updates immediately
    setSearchTerm(prev => prev);
    setLocationFilter(prev => prev);
  };

  const handleEditOrder = (order: GroupOrder) => {
    const myParticipation = order.participants.find(p => p.vendorId === user?.id);
    if (myParticipation) {
      setEditingOrder(order);
      setEditQuantity(myParticipation.quantity);
      setEditPhone(myParticipation.vendorPhone || '');
      setEditLocation(myParticipation.vendorLocation || null);
      setIsEditModalOpen(true);
    }
  };

  const handleViewReceipt = (order: GroupOrder) => {
    setReceiptOrder(order);
    setIsReceiptModalOpen(true);
  };

  const handleWriteReview = (order: GroupOrder) => {
    setReviewOrder(order);
    setReviewRating(5);
    setReviewComment('');
    setIsReviewModalOpen(true);
  };

  const handleTrackDelivery = async (order: GroupOrder) => {
    if (!user) return;
    
    const myParticipation = order.participants.find(p => p.vendorId === user.id);
    if (!myParticipation || !myParticipation.vendorLocation) {
      toast({
        title: "Location Required",
        description: "Please set your delivery location first",
        variant: "destructive"
      });
      return;
    }

    setTrackingOrder(order);
    setIsDeliveryTrackingModalOpen(true);
    setIsLoadingRoute(true);

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
      const vendorLocation = myParticipation.vendorLocation;

      // Calculate route using OSRM (Open Source Routing Machine)
      const routeUrl = `https://router.project-osrm.org/route/v1/driving/${supplierLng},${supplierLat};${vendorLocation.lng},${vendorLocation.lat}?overview=full&geometries=geojson`;
      
      const response = await fetch(routeUrl);
      const routeData = await response.json();

      if (routeData.routes && routeData.routes.length > 0) {
        setDeliveryRoute(routeData.routes[0].geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]));
      } else {
        // Fallback: create a simple straight line route
        setDeliveryRoute([supplierLocation, vendorLocation]);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      toast({
        title: "Route Error",
        description: "Failed to load delivery route",
        variant: "destructive"
      });
      // Fallback: create a simple straight line route
      const locationMatch = order.location.match(/\[([\d.-]+),([\d.-]+)\]/);
      if (locationMatch) {
        const supplierLat = parseFloat(locationMatch[1]);
        const supplierLng = parseFloat(locationMatch[2]);
        const supplierLocation = { lat: supplierLat, lng: supplierLng };
        const vendorLocation = myParticipation.vendorLocation;
        setDeliveryRoute([supplierLocation, vendorLocation]);
      }
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewOrder || !user || !reviewComment.trim()) {
      toast({
        title: "Review Required",
        description: "Please write a review comment",
        variant: "destructive"
      });
      return;
    }

    setIsSubmittingReview(true);
    try {
      // Here you would typically save the review to Firebase
      // For now, we'll simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mark this vendor as having reviewed in the orders state
      markParticipantReviewed(reviewOrder.id, user.id);
      
      toast({
        title: "Review Submitted!",
        description: "Thank you for your feedback",
        variant: "default"
      });
      
      setIsReviewModalOpen(false);
      setReviewOrder(null);
      setReviewRating(5);
      setReviewComment('');
    } catch (error) {
      toast({
        title: "Failed to Submit Review",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleUpdateOrder = async () => {
    if (!editingOrder || !user) return;

    if (editQuantity <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity",
        variant: "destructive"
      });
      return;
    }

    if (!editPhone.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter your phone number for supplier coordination",
        variant: "destructive"
      });
      return;
    }

    if (editPhone.length !== 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Phone number must be exactly 10 digits",
        variant: "destructive"
      });
      return;
    }

    if (!editLocation) {
      toast({
        title: "Location Required",
        description: "Please select your delivery location",
        variant: "destructive"
      });
      return;
    }

    const currentParticipation = editingOrder.participants.find(p => p.vendorId === user.id);
    if (!currentParticipation) return;

    const quantityDifference = editQuantity - currentParticipation.quantity;
    const newTotalQuantity = editingOrder.totalQuantity + quantityDifference;

    if (newTotalQuantity > editingOrder.maxQuantity) {
      toast({
        title: "Quantity Limit Exceeded",
        description: `Total quantity cannot exceed ${editingOrder.maxQuantity} ${editingOrder.unit}`,
        variant: "destructive"
      });
      return;
    }

    setIsEditing(true);
    try {
      // Update the participant quantity in Firebase
      await updateParticipantQuantity(editingOrder.id, user.id, editQuantity);
      
      // Update participant phone and location in Firebase (delivery charge will be recalculated automatically)
      await updateParticipantDetails(editingOrder.id, user.id, editPhone, editLocation);
      
      toast({
        title: "Order Updated with Recalculated Delivery Charge!",
        description: `Successfully updated order details and recalculated delivery charge based on new location`,
        variant: "default"
      });
      
      setIsEditModalOpen(false);
      setEditingOrder(null);
      setEditQuantity(0);
      setEditPhone('');
      setEditLocation(null);
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

  const handleCancelOrder = async () => {
    if (!editingOrder || !user) return;

    setIsEditing(true);
    try {
      // Remove the participant from the order in Firebase
      await removeParticipant(editingOrder.id, user.id);
      
      // Wait a moment for the real-time update to process
      setTimeout(() => {
        // Force refresh available orders
        forceRefreshAvailableOrders();
      }, 1000);
      
      toast({
        title: "Order Cancelled!",
        description: "Successfully cancelled your participation. The order is now available for other vendors.",
        variant: "default"
      });
      
      setIsEditModalOpen(false);
      setEditingOrder(null);
      setEditQuantity(0);
    } catch (error) {
      toast({
        title: "Failed to Cancel Order",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteOrder = async (order: GroupOrder) => {
    setDeletingOrder(order);
  };

  const confirmDeleteOrder = async () => {
    if (!deletingOrder || !user) return;

    setIsDeleting(true);
    try {
      // Remove the participant from the order in Firebase
      await removeParticipant(deletingOrder.id, user.id);
      
      toast({
        title: "Order Deleted!",
        description: "Successfully removed order from your history",
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'warning';
      case 'completed': return 'secondary';
      case 'cancelled': return 'destructive';
      case 'expired': return 'destructive';
      default: return 'default';
    }
  };

  const calculateSavings = (originalPrice: number, bulkPrice: number) => {
    return Math.round(((originalPrice - bulkPrice) / originalPrice) * 100);
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-foreground">Vendor Dashboard</h1>
        </div>
        <div className="flex gap-2">
          {/* Refresh button moved to Available Orders tab */}
        </div>
      </div>

      {/* Success Stories */}
      <SuccessStories />

      {/* Tabbed Dashboard */}
      <Tabs defaultValue="available" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Available Orders
          </TabsTrigger>
          <TabsTrigger value="myorders" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            My Orders
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{availableOrders.length}</p>
                    <p className="text-sm text-muted-foreground">Available Orders</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{myOrders.length}</p>
                    <p className="text-sm text-muted-foreground">My Orders</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {myOrders.reduce((acc, order) => {
                        const myParticipation = order.participants.find(p => p.vendorId === user?.id);
                        if (myParticipation) {
                          const savings = (order.originalPrice - order.bulkPrice) * myParticipation.quantity;
                          return acc + savings;
                        }
                        return acc;
                      }, 0).toFixed(0)}₹
                    </p>
                    <p className="text-sm text-muted-foreground">Total Savings</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Additional Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Order Participation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Active Orders</span>
                    <Badge variant="outline">{myOrders.filter(o => o.status === 'open').length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Completed Orders</span>
                    <Badge variant="outline">{myOrders.filter(o => o.status === 'completed').length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Items Ordered</span>
                    <Badge variant="outline">
                      {myOrders.reduce((acc, order) => {
                        const myParticipation = order.participants.find(p => p.vendorId === user?.id);
                        return acc + (myParticipation?.quantity || 0);
                      }, 0)} kg
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" />
                  Savings Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">This Month</span>
                    <span className="font-bold text-primary">
                      ₹{myOrders.reduce((acc, order) => {
                        const myParticipation = order.participants.find(p => p.vendorId === user?.id);
                        if (myParticipation) {
                          const savings = (order.originalPrice - order.bulkPrice) * myParticipation.quantity;
                          return acc + savings;
                        }
                        return acc;
                      }, 0).toFixed(0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average per Order</span>
                    <span className="font-bold text-secondary">
                      ₹{myOrders.length > 0 ? (myOrders.reduce((acc, order) => {
                        const myParticipation = order.participants.find(p => p.vendorId === user?.id);
                        if (myParticipation) {
                          const savings = (order.originalPrice - order.bulkPrice) * myParticipation.quantity;
                          return acc + savings;
                        }
                        return acc;
                      }, 0) / myOrders.length).toFixed(0) : '0'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Orders Joined</span>
                    <span className="font-bold text-green-600">{myOrders.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Available Orders Tab */}
        <TabsContent value="available" className="space-y-6">
          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex-1 relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Filter by city name (e.g., Hyderabad, Mumbai)..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="pl-10"
              />
              {locationFilter && (
                <button
                  onClick={() => setLocationFilter('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  title="Clear location filter"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {locationFilter && (
                <p className="text-xs text-muted-foreground mt-1">
                  Filtering orders by city: "{locationFilter}"
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Available Group Orders</h2>
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Badge variant="outline" className="text-sm">
                {filteredOrders.length} Orders Available
              </Badge>
            </div>
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
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No group orders available right now.</p>
              <p className="text-sm text-muted-foreground mt-2">Try refreshing to see available orders!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl text-foreground">{order.item}</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        by {order.supplierName}
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
                      <p className="text-sm text-muted-foreground">Regular Price</p>
                      <p className="text-lg line-through text-muted-foreground">₹{order.originalPrice}</p>
                      <p className="text-xs text-success font-medium">
                        {calculateSavings(order.originalPrice, order.bulkPrice)}% savings
                      </p>
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
                      <span>{order.totalQuantity}/{order.minQuantity} {order.unit}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <OrderCountdown deadline={order.deadline} />
                    </div>
                                            <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span className="text-xs text-muted-foreground">Supplier:</span>
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

                  {/* Show if vendor has already participated */}
                  {order.participants.some(p => p.vendorId === user?.id) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <div className="text-blue-600">ℹ️</div>
                        <div className="text-sm">
                          <p className="font-medium text-blue-800">You've already joined this order</p>
                          <p className="text-blue-700 mt-1">Use "Edit Order" in My Orders to increase your quantity.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Quantity"
                        min="1"
                        max={order.maxQuantity - order.totalQuantity}
                        value={joinQuantities[order.id] || ''}
                        onChange={(e) => setJoinQuantities(prev => ({
                          ...prev,
                          [order.id]: parseInt(e.target.value) || 0
                        }))}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground">{order.unit}</span>
                    </div>
                    
                    <Button 
                      onClick={() => handleJoinOrderClick(order)}
                      disabled={
                        isLoading || 
                        !joinQuantities[order.id] || 
                        joinQuantities[order.id] <= 0 ||
                        order.participants.some(p => p.vendorId === user?.id)
                      }
                      className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Joining...
                        </>
                      ) : order.participants.some(p => p.vendorId === user?.id) ? (
                        'Already Joined'
                      ) : (
                        'Join Group Order'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </TabsContent>

        {/* My Orders Tab */}
        <TabsContent value="myorders" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">My Orders</h2>
            <Badge variant="outline" className="text-sm">
              {myOrders.length} Orders Joined
            </Badge>
          </div>

          {myOrders.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">You haven't joined any group orders yet.</p>
                <p className="text-sm text-muted-foreground mt-2">Browse available orders to start saving money!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {myOrders.map((order) => {
                const myParticipation = order.participants.find(p => p.vendorId === user?.id);
                return (
                  <Card key={order.id} className="border-l-4 border-l-primary">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            {order.item}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <span>by {order.supplierName}</span>
                            <span>•</span>
                            <span>Joined {myParticipation?.joinedAt}</span>
                            {order.contactPhone && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {order.contactPhone}
                                </span>
                              </>
                            )}
                          </CardDescription>
                        </div>
                        <Badge variant={getStatusColor(order.status)}>
                          {order.status.toUpperCase()}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-accent rounded-lg p-3">
                          <p className="text-sm text-accent-foreground">Your Quantity</p>
                          <p className="text-xl font-bold text-primary">{myParticipation?.quantity} {order.unit}</p>
                        </div>
                        <div className="bg-muted rounded-lg p-3">
                          <p className="text-sm text-muted-foreground">Total Cost</p>
                          <p className="text-lg font-bold text-foreground">₹{(myParticipation?.quantity || 0) * order.bulkPrice}</p>
                        </div>
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-green-800">Your Savings:</span>
                          <span className="font-bold text-green-600">
                            ₹{((myParticipation?.quantity || 0) * (order.originalPrice - order.bulkPrice)).toFixed(0)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Order Progress</span>
                          <span>{order.totalQuantity}/{order.minQuantity} {order.unit}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min((order.totalQuantity / order.minQuantity) * 100, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {order.totalQuantity >= order.minQuantity ? '✅ Minimum quantity reached!' : `${order.minQuantity - order.totalQuantity} more ${order.unit} needed`}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <OrderCountdown deadline={order.deadline} />
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span className="text-xs text-muted-foreground">Supplier:</span>
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

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {order.contactPhone ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex items-center gap-2"
                              >
                                <Phone className="w-4 h-4" />
                                Contact Supplier
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem asChild>
                                <a href={`tel:${order.contactPhone}`} className="flex items-center gap-2">
                                  <Phone className="w-4 h-4" />
                                  Call Supplier
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  navigator.clipboard.writeText(order.contactPhone);
                                  toast({
                                    title: "Phone Number Copied!",
                                    description: `Supplier's phone number copied to clipboard: ${order.contactPhone}`,
                                    variant: "default"
                                  });
                                }}
                                className="flex items-center gap-2"
                              >
                                📋 Copy Number
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-2"
                            disabled
                          >
                            <Phone className="w-4 h-4" />
                            No Contact
                          </Button>
                        )}
                        {/* Only show Edit Order if not completed */}
                        {order.status !== 'completed' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-2"
                            onClick={() => handleEditOrder(order)}
                          >
                            <Edit className="w-4 h-4" />
                            Edit Order
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex items-center gap-2"
                          onClick={() => handleTrackDelivery(order)}
                        >
                          <Truck className="w-4 h-4" />
                          Track Delivery
                        </Button>
                        {order.status === 'accepted' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-2"
                            onClick={() => handleViewReceipt(order)}
                          >
                            <Receipt className="w-4 h-4" />
                            View Receipt
                          </Button>
                        )}
                        {order.status === 'completed' && !order.participants.find(p => p.vendorId === user?.id)?.hasReviewed && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-2"
                            onClick={() => handleWriteReview(order)}
                          >
                            <Star className="w-4 h-4" />
                            Write Review
                          </Button>
                        )}
                        {order.status === 'completed' && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex items-center gap-2"
                              onClick={() => handleDeleteOrder(order)}
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Order Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Order Details
            </DialogTitle>
            <DialogDescription>
              Modify your order quantity, contact details, and delivery location
            </DialogDescription>
          </DialogHeader>
          
          {editingOrder && (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-2">{editingOrder.item}</h4>
                <p className="text-sm text-muted-foreground mb-2">by {editingOrder.supplierName}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Bulk Price:</span>
                    <span className="font-medium ml-1">₹{editingOrder.bulkPrice}/{editingOrder.unit}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Original Price:</span>
                    <span className="font-medium ml-1">₹{editingOrder.originalPrice}/{editingOrder.unit}</span>
                  </div>
                </div>
              </div>

              {/* Quantity Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Quantity ({editingOrder.unit})</label>
                <Input
                  type="number"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(parseInt(e.target.value) || 0)}
                  min="1"
                  max={editingOrder.maxQuantity}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Current total: {editingOrder.totalQuantity} {editingOrder.unit} • 
                  Max allowed: {editingOrder.maxQuantity} {editingOrder.unit}
                </p>
              </div>

              {/* Phone Number Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Phone Number *</label>
                <Input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => {
                    // Only allow digits and limit to 10 characters
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setEditPhone(value);
                  }}
                  placeholder="Enter 10-digit mobile number"
                  className="w-full"
                  required
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground">
                  Enter 10-digit mobile number
                </p>
                {editPhone && editPhone.length !== 10 && (
                  <p className="text-xs text-red-500">
                    Phone number must be exactly 10 digits
                  </p>
                )}
              </div>

              {/* Location Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Delivery Location *</label>
                <UseMyLocationButton onSetLocation={setEditLocation} />
                <div className="rounded-lg border overflow-hidden" style={{ position: 'relative' }}>
                  <MapContainer
                    center={(editLocation || DEFAULT_CENTER) as LatLngExpression}
                    zoom={editLocation ? 14 : 10}
                    style={MAP_CONTAINER_STYLE}
                    ref={mapRef}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {editLocation && (
                      <Marker position={editLocation as LatLngExpression} icon={GreenIcon} />
                    )}
                    <LocationPicker value={editLocation} onChange={setEditLocation} />
                  </MapContainer>
                </div>
                {editLocation && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {editLocation.lat.toFixed(6)}, {editLocation.lng.toFixed(6)}
                  </p>
                )}
              </div>

              {/* Cost Calculation */}
              <div className="bg-primary/5 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Cost:</span>
                  <span className="font-bold">₹{(editQuantity * editingOrder.bulkPrice).toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Your Savings:</span>
                  <span className="font-bold text-green-600">
                    ₹{(editQuantity * (editingOrder.originalPrice - editingOrder.bulkPrice)).toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleUpdateOrder}
                  disabled={isEditing}
                  className="flex-1 bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90"
                >
                  {isEditing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Order'
                  )}
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleCancelOrder}
                  disabled={isEditing}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel Order
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Location Selection Modal */}
      <Dialog open={isLocationModalOpen} onOpenChange={setIsLocationModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              Select Your Location
            </DialogTitle>
            <DialogDescription>
              Choose your delivery location to calculate delivery charges and join the group order
            </DialogDescription>
          </DialogHeader>
          
          {joiningOrder && (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-2">{joiningOrder.item}</h4>
                <p className="text-sm text-muted-foreground mb-2">by {joiningOrder.supplierName}</p>
                {joiningOrder.contactPhone && (
                  <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    Supplier: 
                    <a 
                      href={`tel:${joiningOrder.contactPhone}`}
                      className="text-primary hover:underline cursor-pointer"
                    >
                      {joiningOrder.contactPhone}
                    </a>
                  </p>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Bulk Price:</span>
                    <span className="font-medium ml-1">₹{joiningOrder.bulkPrice}/{joiningOrder.unit}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Delivery Rate:</span>
                    <span className="font-medium ml-1">₹{joiningOrder.deliveryChargePerKm || 5}/km</span>
                  </div>
                </div>
              </div>

              {/* Quantity Input */}
              <div className="space-y-2">
                <Label htmlFor="joinQuantity">Your Quantity ({joiningOrder.unit})</Label>
                <Input
                  id="joinQuantity"
                  type="number"
                  value={joinQuantity}
                  onChange={(e) => setJoinQuantity(parseInt(e.target.value) || 0)}
                  min="1"
                  max={joiningOrder.maxQuantity - joiningOrder.totalQuantity}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Available: {joiningOrder.maxQuantity - joiningOrder.totalQuantity} {joiningOrder.unit}
                </p>
              </div>

              {/* Phone Number Input */}
              <div className="space-y-2">
                <Label htmlFor="vendorPhone">Your Phone Number *</Label>
                <Input
                  id="vendorPhone"
                  type="tel"
                  value={vendorPhone}
                  onChange={(e) => {
                    // Only allow digits and limit to 10 characters
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setVendorPhone(value);
                  }}
                  placeholder="Enter 10-digit mobile number"
                  className="w-full"
                  required
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground">
                  Enter 10-digit mobile number
                </p>
                {vendorPhone && vendorPhone.length !== 10 && (
                  <p className="text-xs text-red-500">
                    Phone number must be exactly 10 digits
                  </p>
                )}
              </div>

              {/* Location Selection */}
              <div className="space-y-2">
                <Label>Select Your Delivery Location *</Label>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
                  <div className="flex items-start gap-2">
                    <div className="text-amber-600 mt-0.5">📍</div>
                    <div className="text-sm">
                      <p className="font-medium text-amber-800">Location selection is required</p>
                      <p className="text-amber-700 mt-1">This helps calculate delivery charges and coordinate with the supplier.</p>
                    </div>
                  </div>
                </div>
                <UseMyLocationButton onSetLocation={setSelectedLocation} />
                <div className="rounded-lg border overflow-hidden" style={{ position: 'relative' }}>
                  <MapContainer
                    ref={mapRef}
                    center={(selectedLocation || DEFAULT_CENTER) as LatLngExpression}
                    zoom={selectedLocation ? 14 : 10}
                    style={MAP_CONTAINER_STYLE}
                    key={selectedLocation ? `${selectedLocation.lat}-${selectedLocation.lng}` : 'default'}
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution="&copy; OpenStreetMap contributors"
                    />
                    <LocationPicker value={selectedLocation} onChange={setSelectedLocation} />
                    {selectedLocation && (
                      <Marker position={selectedLocation as LatLngExpression} icon={GreenIcon} />
                    )}
                  </MapContainer>
                </div>
                {selectedLocation && (
                  <div className="flex items-center gap-2 text-xs text-green-600 mt-2">
                    <span>✅</span>
                    <span>Location selected: Lat: {selectedLocation.lat.toFixed(5)}, Lng: {selectedLocation.lng.toFixed(5)}</span>
                  </div>
                )}
                {!selectedLocation && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                    <MapPin className="w-4 h-4" />
                    <span>Click on the map or use "Use My Current Location" to select delivery location</span>
                  </div>
                )}
              </div>

              {/* Cost Calculation */}
              <div className="bg-primary/5 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Order Cost:</span>
                  <span className="font-bold">₹{(joinQuantity * joiningOrder.bulkPrice).toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Distance to Supplier:</span>
                  <span className="font-medium text-muted-foreground">
                    {(() => {
                      if (!selectedLocation || !joiningOrder) return 'Select location';
                      
                      // Extract supplier location coordinates from order.location
                      const coordMatch = joiningOrder.location.match(/\[([\d.-]+),([\d.-]+)\]/);
                      if (!coordMatch) return 'Location not set';
                      
                      const supplierLat = parseFloat(coordMatch[1]);
                      const supplierLng = parseFloat(coordMatch[2]);
                      
                      // Calculate distance between vendor and supplier
                      const distance = calculateDistance(
                        selectedLocation.lat,
                        selectedLocation.lng,
                        supplierLat,
                        supplierLng
                      );
                      
                      return `${distance} km`;
                    })()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Estimated Delivery:</span>
                  <span className="font-bold text-blue-600">
                    ₹{(() => {
                      if (!selectedLocation || !joiningOrder) return 0;
                      
                      // Extract supplier location coordinates from order.location
                      const coordMatch = joiningOrder.location.match(/\[([\d.-]+),([\d.-]+)\]/);
                      if (!coordMatch) return 0;
                      
                      const supplierLat = parseFloat(coordMatch[1]);
                      const supplierLng = parseFloat(coordMatch[2]);
                      
                      // Calculate distance between vendor and supplier
                      const distance = calculateDistance(
                        selectedLocation.lat,
                        selectedLocation.lng,
                        supplierLat,
                        supplierLng
                      );
                      
                      return (joiningOrder.deliveryChargePerKm || 5) * distance;
                    })()}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>Total Estimated Cost:</span>
                  <span className="font-bold text-primary">
                    ₹{(() => {
                      if (!selectedLocation || !joiningOrder) return (joinQuantity * joiningOrder.bulkPrice).toFixed(0);
                      
                      // Extract supplier location coordinates from order.location
                      const coordMatch = joiningOrder.location.match(/\[([\d.-]+),([\d.-]+)\]/);
                      if (!coordMatch) return (joinQuantity * joiningOrder.bulkPrice).toFixed(0);
                      
                      const supplierLat = parseFloat(coordMatch[1]);
                      const supplierLng = parseFloat(coordMatch[2]);
                      
                      // Calculate distance between vendor and supplier
                      const distance = calculateDistance(
                        selectedLocation.lat,
                        selectedLocation.lng,
                        supplierLat,
                        supplierLng
                      );
                      
                      const deliveryCharge = (joiningOrder.deliveryChargePerKm || 5) * distance;
                      const orderCost = joinQuantity * joiningOrder.bulkPrice;
                      
                      return (orderCost + deliveryCharge).toFixed(0);
                    })()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Your Savings:</span>
                  <span className="font-bold text-green-600">
                    ₹{(joinQuantity * (joiningOrder.originalPrice - joiningOrder.bulkPrice)).toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleJoinOrder}
                  disabled={isJoining || !selectedLocation || joinQuantity <= 0}
                  className="flex-1 bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    'Join Group Order'
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setIsLocationModalOpen(false);
                    setJoiningOrder(null);
                    setJoinQuantity(0);
                    setSelectedLocation(null);
                  }}
                  disabled={isJoining}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Order Receipt
            </DialogTitle>
            <DialogDescription>
              Your order receipt for accepted orders
            </DialogDescription>
          </DialogHeader>
          {receiptOrder && user && (() => {
            const myParticipation = receiptOrder.participants.find(p => p.vendorId === user.id);
            if (!myParticipation) return null;
            // Calculate delivery charge
            let deliveryCharge = 0;
            if (myParticipation.vendorLocation) {
              const coordMatch = receiptOrder.location.match(/\[([\d.-]+),([\d.-]+)\]/);
              if (coordMatch) {
                const supplierLat = parseFloat(coordMatch[1]);
                const supplierLng = parseFloat(coordMatch[2]);
                const distance = calculateDistance(
                  myParticipation.vendorLocation.lat,
                  myParticipation.vendorLocation.lng,
                  supplierLat,
                  supplierLng
                );
                deliveryCharge = (receiptOrder.deliveryChargePerKm || 5) * distance;
              }
            }
            const orderCost = myParticipation.quantity * receiptOrder.bulkPrice;
            const totalCost = orderCost + deliveryCharge;
            const savings = myParticipation.quantity * (receiptOrder.originalPrice - receiptOrder.bulkPrice);
            return (
              <div className="space-y-4">
                {/* Order Info */}
                <div className="bg-muted/30 rounded-lg p-4">
                  <h4 className="font-medium text-foreground mb-2">{receiptOrder.item}</h4>
                  <p className="text-sm text-muted-foreground mb-2">by {receiptOrder.supplierName}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Bulk Price:</span>
                      <span className="font-medium ml-1">₹{receiptOrder.bulkPrice}/{receiptOrder.unit}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Original Price:</span>
                      <span className="font-medium ml-1">₹{receiptOrder.originalPrice}/{receiptOrder.unit}</span>
                    </div>
                  </div>
                </div>
                {/* Participation Info */}
                <div className="bg-muted/10 rounded-lg p-4">
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="font-medium">Vendor:</span>
                    <span className="text-foreground">{myParticipation.vendorName}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="font-medium">Quantity:</span>
                    <span className="text-foreground">{myParticipation.quantity} {receiptOrder.unit}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="font-medium">Unit Price:</span>
                    <span className="text-foreground">₹{receiptOrder.bulkPrice}/{receiptOrder.unit}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="font-medium">Order Cost:</span>
                    <span className="text-foreground">₹{orderCost.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="font-medium">Delivery Charge:</span>
                    <span className="text-foreground">₹{deliveryCharge.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold border-t pt-2 mt-2">
                    <span>Total Amount:</span>
                    <span className="text-primary">₹{totalCost.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-600">Savings:</span>
                    <span className="text-green-600 font-medium">₹{savings.toFixed(0)}</span>
                  </div>
                </div>
                {/* Order Status */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Order Accepted</span>
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    Your order has been accepted and is being processed for delivery.
                  </p>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Review Modal */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Write a Review
            </DialogTitle>
            <DialogDescription>
              Share your experience with this order and supplier
            </DialogDescription>
          </DialogHeader>
          
          {reviewOrder && user && (() => {
            const myParticipation = reviewOrder.participants.find(p => p.vendorId === user.id);
            if (!myParticipation) return null;

            return (
              <div className="space-y-4">
                {/* Order Info */}
                <div className="bg-muted/30 rounded-lg p-4">
                  <h4 className="font-medium text-foreground mb-2">{reviewOrder.item}</h4>
                  <p className="text-sm text-muted-foreground">by {reviewOrder.supplierName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Quantity: {myParticipation.quantity} {reviewOrder.unit}
                  </p>
                </div>

                {/* Rating */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Rating *</Label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className={`text-2xl transition-colors ${
                          star <= reviewRating 
                            ? 'text-yellow-400 hover:text-yellow-500' 
                            : 'text-gray-300 hover:text-gray-400'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {reviewRating === 1 && 'Poor'}
                    {reviewRating === 2 && 'Fair'}
                    {reviewRating === 3 && 'Good'}
                    {reviewRating === 4 && 'Very Good'}
                    {reviewRating === 5 && 'Excellent'}
                  </p>
                </div>

                {/* Review Comment */}
                <div className="space-y-2">
                  <Label htmlFor="reviewComment" className="text-sm font-medium">Review Comment *</Label>
                  <textarea
                    id="reviewComment"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share your experience with this order. How was the quality, delivery, and overall service?"
                    className="w-full min-h-[100px] p-3 border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    maxLength={500}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Share your honest feedback to help other vendors</span>
                    <span>{reviewComment.length}/500</span>
                  </div>
                </div>

                {/* Review Guidelines */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="font-medium text-sm text-blue-800 mb-2">Review Guidelines</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Be honest and specific about your experience</li>
                    <li>• Mention product quality, delivery time, and service</li>
                    <li>• Avoid personal attacks or inappropriate language</li>
                    <li>• Your review helps other vendors make informed decisions</li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={handleSubmitReview}
                    disabled={isSubmittingReview || !reviewComment.trim()}
                    className="flex-1"
                  >
                    {isSubmittingReview ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Review'
                    )}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setIsReviewModalOpen(false);
                      setReviewOrder(null);
                      setReviewRating(5);
                      setReviewComment('');
                    }}
                    disabled={isSubmittingReview}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Delivery Tracking Modal */}
      <Dialog open={isDeliveryTrackingModalOpen} onOpenChange={setIsDeliveryTrackingModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Route className="w-5 h-5" />
              Track Delivery Route
            </DialogTitle>
            <DialogDescription>
              View the delivery route from supplier to your location
            </DialogDescription>
          </DialogHeader>
          
          {trackingOrder && user && (() => {
            // Extract supplier location
            const locationMatch = trackingOrder.location.match(/\[([\d.-]+),([\d.-]+)\]/);
            if (!locationMatch) return null;

            const supplierLat = parseFloat(locationMatch[1]);
            const supplierLng = parseFloat(locationMatch[2]);
            const supplierLocation = { lat: supplierLat, lng: supplierLng };

            // Gather all locations: supplier + all vendors with a location
            const allLocations = [
              { ...supplierLocation, label: 'Supplier', color: 'red' },
              ...trackingOrder.participants
                .filter(p => p.vendorLocation)
                .map(p => ({
                  ...p.vendorLocation,
                  label: p.vendorName,
                  color: p.vendorId === user.id ? 'green' : 'blue'
                }))
            ];

            // Calculate center point for map (average of all locations)
            const avgLat = allLocations.reduce((sum, loc) => sum + loc.lat, 0) / allLocations.length;
            const avgLng = allLocations.reduce((sum, loc) => sum + loc.lng, 0) / allLocations.length;

            return (
              <div className="space-y-4">
                {/* Order Info */}
                <div className="bg-muted/30 rounded-lg p-4">
                  <h4 className="font-medium text-foreground mb-2">{trackingOrder.item}</h4>
                  <p className="text-sm text-muted-foreground mb-2">by {trackingOrder.supplierName}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Your Quantity:</span>
                      <span className="font-medium ml-1">{trackingOrder.participants.find(p => p.vendorId === user.id)?.quantity} {trackingOrder.unit}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={getStatusColor(trackingOrder.status)} className="ml-1">
                        {trackingOrder.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Route Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="font-medium text-red-800">Supplier Location</span>
                      </div>
                      <p className="text-sm text-red-700">{trackingOrder.location.replace(/\s*\[[\d.-]+,[\d.-]+\]\s*/, '').trim()}</p>
                      <p className="text-xs text-red-600">Lat: {supplierLat.toFixed(4)}, Lng: {supplierLng.toFixed(4)}</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="font-medium text-green-800">Your Delivery Location</span>
                      </div>
                      <p className="text-sm text-green-700">Your registered delivery address</p>
                      <p className="text-xs text-green-600">Lat: {trackingOrder.participants.find(p => p.vendorId === user.id)?.vendorLocation?.lat?.toFixed(4)}, Lng: {trackingOrder.participants.find(p => p.vendorId === user.id)?.vendorLocation?.lng?.toFixed(4)}</p>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Route className="w-4 h-4 text-orange-600" />
                        <span className="font-medium text-orange-800">Route Information</span>
                      </div>
                      {/* Optionally, show distance from supplier to each vendor */}
                      {allLocations.slice(1).map((loc, idx) => (
                        <p key={idx} className="text-sm text-orange-700">
                          {loc.label}: {calculateDistance(supplierLat, supplierLng, loc.lat, loc.lng).toFixed(1)} km
                        </p>
                      ))}
                    </div>
                  </div>
                  {/* Map */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Delivery Route Map</Label>
                    {isLoadingRoute ? (
                      <div className="w-full h-[300px] bg-muted rounded-lg flex items-center justify-center">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Loading route...</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-[300px] rounded-lg overflow-hidden border">
                        <MapContainer
                          center={[avgLat, avgLng]}
                          zoom={10}
                          style={{ height: '100%', width: '100%' }}
                        >
                          <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          />
                          {allLocations.filter(loc => loc.lat && loc.lng && !isNaN(loc.lat) && !isNaN(loc.lng)).map((loc, idx) => (
                            <Marker
                              key={idx}
                              position={[loc.lat, loc.lng]}
                              icon={createDivIcon(loc.color, loc.label[0])}
                            >
                              <Popup>{loc.label}</Popup>
                            </Marker>
                          ))}
                        </MapContainer>
                      </div>
                    )}
                  </div>
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
              Are you sure you want to delete this order from your history? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {deletingOrder && (
            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <h4 className="font-medium text-destructive mb-2">{deletingOrder.item}</h4>
                <p className="text-sm text-muted-foreground">
                  by {deletingOrder.supplierName} • {deletingOrder.status.toUpperCase()}
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

export default VendorDashboard;