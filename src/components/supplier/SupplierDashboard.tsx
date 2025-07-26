import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useGroupOrders } from '@/hooks/useGroupOrders';
import { CreateOrderData } from '@/types';
import { Plus, Package, Users, TrendingUp, Calendar, MapPin, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const SupplierDashboard = () => {
  const { user } = useAuth();
  const { createOrder, getSupplierOrders, isLoading } = useGroupOrders();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newOrder, setNewOrder] = useState<CreateOrderData>({
    item: '',
    description: '',
    bulkPrice: 0,
    originalPrice: 0,
    minQuantity: 0,
    maxQuantity: 0,
    unit: 'kg',
    deadline: '',
    location: ''
  });

  const myOrders = user ? getSupplierOrders(user.id) : [];

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    if (!newOrder.item || !newOrder.description || newOrder.bulkPrice <= 0 || newOrder.originalPrice <= 0 || newOrder.minQuantity <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields with valid values",
        variant: "destructive"
      });
      return;
    }

    if (newOrder.bulkPrice >= newOrder.originalPrice) {
      toast({
        title: "Price Error",
        description: "Bulk price must be less than original price",
        variant: "destructive"
      });
      return;
    }

    try {
      await createOrder(newOrder, user.id, user.name);
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
        location: ''
      });
    } catch (error) {
      toast({
        title: "Failed to Create Order",
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

  const totalRevenue = myOrders.reduce((acc, order) => {
    return acc + (order.totalQuantity * order.bulkPrice);
  }, 0);

  const totalVendors = myOrders.reduce((acc, order) => {
    return acc + order.participants.length;
  }, 0);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{myOrders.length}</p>
                <p className="text-sm text-muted-foreground">Total Orders</p>
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
                <p className="text-2xl font-bold text-foreground">{totalVendors}</p>
                <p className="text-sm text-muted-foreground">Total Vendors</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">₹{totalRevenue.toFixed(0)}</p>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {myOrders.filter(order => order.status === 'open').length}
                </p>
                <p className="text-sm text-muted-foreground">Active Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create New Order Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">My Group Orders</h2>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90">
              <Plus className="w-4 h-4 mr-2" />
              Create New Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Group Order</DialogTitle>
              <DialogDescription>
                Set up a new bulk buying opportunity for vendors
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="item">Item Name</Label>
                <Input
                  id="item"
                  value={newOrder.item}
                  onChange={(e) => setNewOrder({...newOrder, item: e.target.value})}
                  placeholder="e.g., Onions, Potatoes"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newOrder.description}
                  onChange={(e) => setNewOrder({...newOrder, description: e.target.value})}
                  placeholder="Describe the quality and specifications"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="originalPrice">Regular Price (₹)</Label>
                  <Input
                    id="originalPrice"
                    type="number"
                    value={newOrder.originalPrice || ''}
                    onChange={(e) => setNewOrder({...newOrder, originalPrice: parseFloat(e.target.value) || 0})}
                    placeholder="40"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bulkPrice">Bulk Price (₹)</Label>
                  <Input
                    id="bulkPrice"
                    type="number"
                    value={newOrder.bulkPrice || ''}
                    onChange={(e) => setNewOrder({...newOrder, bulkPrice: parseFloat(e.target.value) || 0})}
                    placeholder="30"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    value={newOrder.unit}
                    onChange={(e) => setNewOrder({...newOrder, unit: e.target.value})}
                    placeholder="kg"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minQuantity">Min Qty</Label>
                  <Input
                    id="minQuantity"
                    type="number"
                    value={newOrder.minQuantity || ''}
                    onChange={(e) => setNewOrder({...newOrder, minQuantity: parseInt(e.target.value) || 0})}
                    placeholder="100"
                    min="1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxQuantity">Max Qty</Label>
                  <Input
                    id="maxQuantity"
                    type="number"
                    value={newOrder.maxQuantity || ''}
                    onChange={(e) => setNewOrder({...newOrder, maxQuantity: parseInt(e.target.value) || 0})}
                    placeholder="500"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={newOrder.location}
                  onChange={(e) => setNewOrder({...newOrder, location: e.target.value})}
                  placeholder="e.g., Mumbai Central Market"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={newOrder.deadline}
                  onChange={(e) => setNewOrder({...newOrder, deadline: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Order'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Orders List */}
      {myOrders.length === 0 ? (
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
            <Card key={order.id} className="hover:shadow-lg transition-shadow">
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

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{order.participants.length} vendors</span>
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SupplierDashboard;