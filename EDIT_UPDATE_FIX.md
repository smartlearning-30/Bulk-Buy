# Edit Order Update Button and Map Fix

## 🐛 **Problems Identified**

1. **Update Order Button Not Working**: The "Update Order" button in the edit modal was not actually updating orders in Firebase
2. **Map Not Showing in Edit Form**: The edit modal was missing the map component for location selection

## ✅ **Solutions Implemented**

### 1. **Fixed Update Order Button**

**Problem**: The `handleUpdateOrder` function was only simulating the update instead of calling Firebase.

**Solution**: 
- Added `updateOrder` function to `useFirebaseOrders` hook
- Updated `handleUpdateOrder` to use real Firebase update
- Added proper error handling and loading states

```typescript
// Added to useFirebaseOrders hook
const updateOrder = async (orderId: string, updates: Partial<GroupOrder>) => {
  setIsLoading(true);
  try {
    await groupOrderService.updateOrder(orderId, updates);
  } catch (error) {
    console.error('Error updating order:', error);
    throw error;
  } finally {
    setIsLoading(false);
  }
};

// Updated handleUpdateOrder function
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
    
    toast({
      title: "Order Updated!",
      description: `Successfully updated order for ${newOrder.item}`,
      variant: "default"
    });
    
    // Reset form and close modal
    setIsEditModalOpen(false);
    setEditingOrder(null);
    // ... reset other state
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
```

### 2. **Added Map to Edit Modal**

**Problem**: The edit modal only had a simple text input for location, missing the interactive map.

**Solution**: 
- Added complete map component to edit modal
- Added location coordinate extraction from existing orders
- Added "Use My Location" button
- Added location validation and feedback

```typescript
// Enhanced handleEditOrder function
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
    // ... all fields
    location: locationName,
  });
  
  // Set the location coordinates for the map
  setLocationLatLng(coordinates);
  setIsEditModalOpen(true);
};
```

**Map Component Added to Edit Modal**:
```typescript
<div className="space-y-2">
  <Label>Pick Location on Map *</Label>
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
    <div className="flex items-start gap-2">
      <div className="text-amber-600 mt-0.5">⚠️</div>
      <div className="text-sm">
        <p className="font-medium text-amber-800">Location selection is mandatory</p>
        <p className="text-amber-700 mt-1">You must select a delivery location on the map to update this group order.</p>
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
        <Marker position={locationLatLng as LatLngExpression} icon={DefaultIcon} />
      )}
    </MapContainer>
  </div>
  {locationLatLng && (
    <p className="text-xs text-green-600 font-medium">
      ✅ Location selected: {locationLatLng.lat.toFixed(6)}, {locationLatLng.lng.toFixed(6)}
    </p>
  )}
</div>
```

## 🔧 **Features Added**

### **Real Firebase Updates**
- ✅ Orders are actually updated in Firebase database
- ✅ Real-time updates work immediately
- ✅ Proper error handling and user feedback
- ✅ Loading states during update

### **Interactive Map in Edit Modal**
- ✅ Click to select location on map
- ✅ "Use My Location" button for GPS
- ✅ Visual marker showing selected location
- ✅ Coordinate display
- ✅ Automatic coordinate extraction from existing orders
- ✅ Location validation and warnings

### **Enhanced User Experience**
- ✅ Form validation before update
- ✅ Success/error toast notifications
- ✅ Loading spinner during update
- ✅ Automatic form reset after update
- ✅ Coordinate preservation and restoration

## 📁 **Files Modified**

- `src/hooks/useFirebaseOrders.ts` - Added `updateOrder` function
- `src/components/supplier/SupplierDashboard.tsx` - Fixed update functionality and added map

## 🎯 **How to Test**

### **Test Update Functionality:**
1. Create an order as a supplier
2. Click "Edit Order" on the order card
3. Modify any field (item name, price, etc.)
4. Click "Update Order"
5. ✅ Verify the order updates immediately in the dashboard

### **Test Map Functionality:**
1. Click "Edit Order" on any order
2. ✅ Verify map loads with existing location (if coordinates exist)
3. Click on map to select new location
4. Click "Use My Location" to use GPS
5. ✅ Verify coordinates display below map
6. Update the order
7. ✅ Verify new location is saved

## 🚀 **Result**

Both the update button and map functionality are now fully working! 🎉

- ✅ **Update Order Button**: Actually updates orders in Firebase
- ✅ **Map in Edit Modal**: Interactive location selection with coordinates
- ✅ **Real-time Updates**: Changes appear immediately across all users
- ✅ **Error Handling**: Proper validation and error messages 