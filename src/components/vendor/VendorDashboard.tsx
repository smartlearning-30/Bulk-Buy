import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useGroupOrders } from '@/hooks/useGroupOrders';
import { GroupOrder } from '@/types';
import { ShoppingCart, Users, Calendar, MapPin, Package, TrendingDown, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const VendorDashboard = () => {
  const { user } = useAuth();
  const { orders, joinOrder, getVendorOrders, isLoading } = useGroupOrders();
  const [joinQuantities, setJoinQuantities] = useState<{ [key: string]: number }>({});

  const availableOrders = orders.filter(order => 
    order.status === 'open' && 
    !order.participants.some(p => p.vendorId === user?.id)
  );

  const myOrders = user ? getVendorOrders(user.id) : [];

  const handleJoinOrder = async (order: GroupOrder) => {
    if (!user) return;
    
    const quantity = joinQuantities[order.id] || 10;
    
    if (quantity <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity",
        variant: "destructive"
      });
      return;
    }

    if (order.totalQuantity + quantity > order.maxQuantity) {
      toast({
        title: "Quantity Limit Exceeded",
        description: `Maximum quantity is ${order.maxQuantity}${order.unit}`,
        variant: "destructive"
      });
      return;
    }

    try {
      await joinOrder(order.id, user.id, user.name, quantity);
      toast({
        title: "Successfully Joined!",
        description: `You've joined the group order for ${order.item}`,
        variant: "default"
      });
      setJoinQuantities(prev => ({ ...prev, [order.id]: 0 }));
    } catch (error) {
      toast({
        title: "Failed to Join",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'warning';
      case 'locked': return 'success';
      case 'completed': return 'secondary';
      default: return 'default';
    }
  };

  const calculateSavings = (originalPrice: number, bulkPrice: number) => {
    return Math.round(((originalPrice - bulkPrice) / originalPrice) * 100);
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Stats Overview */}
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

      {/* Available Group Orders */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Available Group Orders</h2>
        {availableOrders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No group orders available right now.</p>
              <p className="text-sm text-muted-foreground mt-2">Check back later for new deals!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {availableOrders.map((order) => (
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

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{order.totalQuantity}/{order.minQuantity} {order.unit}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{order.deadline}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{order.location}</span>
                    </div>
                  </div>

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
                      onClick={() => handleJoinOrder(order)}
                      disabled={isLoading || !joinQuantities[order.id] || joinQuantities[order.id] <= 0}
                      className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Joining...
                        </>
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
      </div>

      {/* My Orders */}
      {myOrders.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">My Orders</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {myOrders.map((order) => {
              const myParticipation = order.participants.find(p => p.vendorId === user?.id);
              return (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{order.item}</CardTitle>
                        <CardDescription>by {order.supplierName}</CardDescription>
                      </div>
                      <Badge variant={getStatusColor(order.status)}>
                        {order.status.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Your Quantity:</span>
                        <span className="font-medium">{myParticipation?.quantity} {order.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Cost:</span>
                        <span className="font-medium">₹{(myParticipation?.quantity || 0) * order.bulkPrice}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Savings:</span>
                        <span className="font-medium text-success">
                          ₹{((myParticipation?.quantity || 0) * (order.originalPrice - order.bulkPrice)).toFixed(0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="font-medium">
                          {order.totalQuantity >= order.minQuantity ? 'Minimum reached!' : `Need ${order.minQuantity - order.totalQuantity} more ${order.unit}`}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorDashboard;