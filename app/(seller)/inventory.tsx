import { CATEGORY_ICONS } from '@/lib/constants';
import { db } from '@/lib/firebaseLib';
import { useAppStore } from '@/store/app-store';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { CheckCircle, ChevronRight, DollarSign, Package, Plus, QrCode, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, Switch } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function InventoryScreen() {
  const user = useAppStore(state => state.user);
  const [listings, setListings] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Bakery');
  const [originalPrice, setOriginalPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [pickupDate, setPickupDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [message, setMessage] = useState('');
  const [isHidden, setIsHidden] = useState(false);
  const [originalItem, setOriginalItem] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isRelistMode, setIsRelistMode] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  // --- Custom Animation Engine ---
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const openModal = () => {
    setModalVisible(true);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
        speed: 14,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 150, // Backdrop fades out faster than the sheet slides
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
      resetForm();
    });
  };
  // ------------------------------------

  useEffect(() => {
    if (!user) return;
    const qListings = query(collection(db, 'listings'), where('sellerId', '==', user.uid));
    const unsubscribeListings = onSnapshot(qListings, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setListings(docs);
      setLoading(false);
    }, (error) => {
      console.error("Inventory fetch error:", error);
      setLoading(false);
    });

    const qOrders = query(collection(db, 'orders'), where('sellerId', '==', user.uid));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      docs.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setOrders(docs);
    });

    return () => {
      unsubscribeListings();
      unsubscribeOrders();
    };
  }, [user]);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      Alert.alert("Success", `Order marked as ${newStatus}`);
    } catch (error) {
      console.error("Error updating order:", error);
      Alert.alert("Error", "Could not update order status.");
    }
  };

  const handleDeleteAction = async () => {
    if (isRelistMode && editingOrderId) {
      Alert.alert(
        "Delete Order",
        "Are you sure you want to remove this order from your history?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteDoc(doc(db, 'orders', editingOrderId));
                closeModal();
              } catch (error) {
                console.error("Error deleting order:", error);
                Alert.alert("Error", "Could not delete order.");
              }
            }
          }
        ]
      );
    } else if (editingId) {
      Alert.alert(
        "Delete Listing",
        "Are you sure you want to permanently delete this listing? This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteDoc(doc(db, 'listings', editingId));
                closeModal();
              } catch (error) {
                console.error("Error deleting listing:", error);
                Alert.alert("Error", "Could not delete listing.");
              }
            }
          }
        ]
      );
    }
  };

  const handleEditPress = (item: any, isCompleted: boolean = false, orderId: string | null = null) => {
    setTitle(item.title);
    setDescription(item.description);
    setCategory(item.category);
    setOriginalPrice(item.oldPrice.replace('$', ''));
    setDiscountPrice(item.price.replace('$', ''));
    
    // Restore the date if we saved it previously, otherwise fallback to current date
    if (item.pickupTimestamp) {
      setPickupDate(new Date(item.pickupTimestamp));
    } else {
      setPickupDate(new Date());
    }
    
    setMessage(item.message || '');
    setIsHidden(item.status === 'hidden');
    setOriginalItem({
      title: item.title,
      description: item.description,
      category: item.category,
      originalPrice: item.oldPrice.replace('$', ''),
      discountPrice: item.price.replace('$', ''),
      pickupDate: item.pickupTimestamp ? new Date(item.pickupTimestamp) : new Date(),
      message: item.message || '',
      isHidden: item.status === 'hidden',
    });
    setEditingId(item.id);
    setIsRelistMode(isCompleted);
    setEditingOrderId(orderId);
    openModal(); // Trigger the smooth animation
  };

  const handleSaveListing = async () => {
    if (!title || !originalPrice || !discountPrice) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        title,
        description,
        category,
        price: `$${parseFloat(discountPrice).toFixed(2)}`,
        oldPrice: `$${parseFloat(originalPrice).toFixed(2)}`,
        discount: `${Math.round((1 - parseFloat(discountPrice) / parseFloat(originalPrice)) * 100)}% OFF`,
        time: `${pickupDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${pickupDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
        pickupTimestamp: pickupDate.getTime(),
        message,
        quantity: 1,
      };

      if (isHidden) {
        payload.status = 'hidden';
      } else {
        payload.status = 'active';
      }

      if (editingId) {
        await updateDoc(doc(db, 'listings', editingId), payload);
      } else {
        payload.sellerId = user.uid;
        payload.status = 'active';
        payload.createdAt = serverTimestamp();
        payload.image = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=500&auto=format&fit=crop';
        payload.store = "Your Store";
        payload.rating = "4.8";
        payload.distance = "0.2 mi";
        payload.badges = [{ text: "Fresh Today", type: "green" }];

        await addDoc(collection(db, 'listings'), payload);
      }
      closeModal(); // Trigger the smooth close animation
    } catch (error) {
      console.error("Error saving listing:", error);
      Alert.alert("Error", "Could not save listing. Please try again.");
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('Bakery');
    setOriginalPrice('');
    setDiscountPrice('');
    setPickupDate(new Date());
    setMessage('');
    setIsHidden(false);
    setOriginalItem(null);
    setEditingId(null);
    setIsRelistMode(false);
    setEditingOrderId(null);
    setSubmitting(false);
  };

  const hasChanges = useMemo(() => {
    if (!editingId) return true;
    if (isRelistMode) return true;
    if (!originalItem) return true;
    
    return (
      title !== originalItem.title ||
      description !== originalItem.description ||
      category !== originalItem.category ||
      originalPrice !== originalItem.originalPrice ||
      discountPrice !== originalItem.discountPrice ||
      pickupDate.getTime() !== originalItem.pickupDate?.getTime() ||
      message !== originalItem.message ||
      isHidden !== originalItem.isHidden
    );
  }, [title, description, category, originalPrice, discountPrice, pickupDate, message, isHidden, editingId, originalItem, isRelistMode]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-6">

        {/* Header */}
        <View className="flex-row items-center justify-between mb-8">
          <View>
            <Text className="text-brandPrimary font-semibold text-xs tracking-widest uppercase mb-1">Store Inventory</Text>
            <Text className="text-3xl font-bold text-gray-900">Listings ({listings.filter(l => l.status === 'active' || l.status === 'hidden').length})</Text>
          </View>
          <Pressable
            onPress={openModal} // Changed to openModal
            className="w-12 h-12 bg-brandPrimary rounded-2xl items-center justify-center shadow-lg shadow-brandPrimary/20"
          >
            <Plus size={24} color="white" strokeWidth={2.5} />
          </Pressable>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#1B7A49" size="large" />
          </View>
        ) : (listings.length > 0 || orders.length > 0) ? (
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">


            {listings.filter(l => l.status === 'active' || l.status === 'hidden').length > 0 && (
              <View>
                
                {listings.filter(l => l.status === 'active' || l.status === 'hidden').map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => handleEditPress(item)}
                    className="bg-white rounded-3xl p-4 mb-4 flex-row border border-gray-100 shadow-sm active:opacity-70"
                  >
                    <View className="w-20 h-20 bg-brandPrimary-soft rounded-2xl items-center justify-center overflow-hidden">
                      <Text className="text-3xl">{CATEGORY_ICONS[item.category] || '🏷️'}</Text>
                    </View>
                    <View className="flex-1 ml-4 justify-center">
                      <Text className="text-lg font-bold text-gray-900 mb-1">{item.title}</Text>
                      <View className="flex-row items-center gap-2">
                        <View className={`px-2 py-0.5 rounded-md border ${item.status === 'hidden' ? 'bg-gray-100 border-gray-200' : 'bg-brandPrimary-soft border-brandPrimary/20'}`}>
                          <Text className={`text-[10px] font-bold ${item.status === 'hidden' ? 'text-gray-500' : 'text-brandPrimary'}`}>
                            {item.status === 'hidden' ? 'Hidden' : 'Active'}
                          </Text>
                        </View>
                        <Text className="text-brandPrimary font-bold">{item.price}</Text>
                        <Text className="text-gray-400 line-through text-xs">{item.oldPrice}</Text>
                      </View>
                    </View>
                    <View className="justify-center">
                      <ChevronRight size={20} color="#D1D5DB" />
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
            <View className="h-10" />
          </ScrollView>
        ) : (
          <View className="flex-1 items-center justify-center pb-12">
            <View className="w-24 h-24 bg-brandPrimary-soft rounded-[40px] items-center justify-center mb-6">
              <Package size={48} color="#1B7A49" />
            </View>
            <Text className="text-2xl font-bold text-gray-900 mb-3">Your store is empty</Text>
            <Text className="text-gray-500 text-center mb-10 px-10 leading-relaxed">
              Start your rescue mission! List your surplus food items here to reach eco-conscious buyers nearby.
            </Text>
            <Pressable
              onPress={openModal} // Changed to openModal
              className="bg-brandPrimary py-4 px-10 rounded-full shadow-md active:opacity-90"
            >
              <Text className="text-white font-bold text-lg">Add First Listing</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Add Listing Custom Modal */}
      <Modal
        animationType="none"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end">

          {/* Animated dark transparent backdrop */}
          <Animated.View
            style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)', opacity: backdropAnim }}
          >
            <Pressable style={{ flex: 1 }} onPress={closeModal} />
          </Animated.View>

          {/* The Animated Form Sheet */}
          <Animated.View
            style={{ transform: [{ translateY: slideAnim }] }}
            className="bg-background rounded-t-[32px] px-6 pt-8 pb-10 max-h-[90%] shadow-2xl"
          >
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-gray-900">{editingId ? "Edit Listing" : "New Listing"}</Text>
              <View className="flex-row items-center gap-3">
                <Pressable
                  onPress={() => setIsHidden(!isHidden)}
                  className={`px-3 py-1.5 rounded-full flex-row items-center border ${
                    isHidden 
                      ? 'bg-gray-50 border-gray-200' 
                      : 'bg-brandPrimary-soft border-brandPrimary/20'
                  }`}
                >
                  <View className={`w-2 h-2 rounded-full mr-1.5 ${isHidden ? 'bg-gray-400' : 'bg-brandPrimary'}`} />
                  <Text className={`text-xs font-bold ${isHidden ? 'text-gray-500' : 'text-brandPrimary'}`}>
                    {isHidden ? 'Hidden' : 'Active'}
                  </Text>
                </Pressable>
                <Pressable onPress={closeModal} className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                  <X size={20} color="#374151" />
                </Pressable>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
              <View className="space-y-5">
                <View>
                  <Text className="text-gray-700 font-bold mb-2 ml-1">Title</Text>
                  <TextInput
                    className="bg-white px-4 py-4 rounded-2xl border border-gray-100 text-gray-900"
                    placeholder="e.g. Sourdough Loaf (Fresh)"
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>

                <View className="mt-4">
                  <Text className="text-gray-700 font-bold mb-2 ml-1">Description</Text>
                  <TextInput
                    className="bg-white px-4 py-4 rounded-2xl border border-gray-100 text-gray-900 h-24"
                    placeholder="Tell buyers about this item..."
                    value={description}
                    onChangeText={setDescription}
                    multiline
                  />
                </View>

                <View className="mt-4">
                  <Text className="text-gray-700 font-bold mb-2 ml-1">Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                    {Object.keys(CATEGORY_ICONS).map((cat) => (
                      <Pressable
                        key={cat}
                        onPress={() => setCategory(cat)}
                        className={`mr-3 px-4 py-2 rounded-xl flex-row items-center border ${category === cat ? 'bg-brandPrimary border-brandPrimary' : 'bg-white border-gray-100'}`}
                      >
                        <Text className="mr-2 text-sm">{CATEGORY_ICONS[cat]}</Text>
                        <Text className={`font-bold text-sm ${category === cat ? 'text-white' : 'text-gray-600'}`}>{cat}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                <View className="flex-row gap-4 mt-4">
                  <View className="flex-1">
                    <Text className="text-gray-700 font-bold mb-2 ml-1">Original Price</Text>
                    <View className="bg-white rounded-2xl border border-gray-100 flex-row items-center px-4 py-4">
                      <DollarSign size={16} color="#9CA3AF" />
                      <TextInput
                        className="flex-1 ml-2 text-gray-900"
                        placeholder="0.00"
                        keyboardType="numeric"
                        value={originalPrice}
                        onChangeText={setOriginalPrice}
                      />
                    </View>
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-700 font-bold mb-2 ml-1">Discount Price</Text>
                    <View className="bg-white rounded-2xl border border-gray-100 flex-row items-center px-4 py-4">
                      <DollarSign size={16} color="#1B7A49" />
                      <TextInput
                        className="flex-1 ml-2 text-gray-900"
                        placeholder="0.00"
                        keyboardType="numeric"
                        value={discountPrice}
                        onChangeText={setDiscountPrice}
                      />
                    </View>
                  </View>
                </View>

                <View className="mt-4">
                  <Text className="text-gray-700 font-bold mb-2 ml-1">Pickup Time & Date</Text>
                  <View className="flex-row gap-3">
                    <Pressable 
                      onPress={() => setShowDatePicker(true)}
                      className="flex-1 bg-white px-4 py-4 rounded-2xl border border-gray-100 items-center justify-center"
                    >
                      <Text className="text-gray-900 font-medium">
                        {pickupDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                      </Text>
                    </Pressable>
                    <Pressable 
                      onPress={() => setShowTimePicker(true)}
                      className="flex-1 bg-white px-4 py-4 rounded-2xl border border-gray-100 items-center justify-center"
                    >
                      <Text className="text-gray-900 font-medium">
                        {pickupDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* --- ANDROID: Uses the native OS dialog overlay automatically --- */}
                {Platform.OS === 'android' && showDatePicker && (
                  <DateTimePicker
                    value={pickupDate}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setShowDatePicker(false);
                      if (date) {
                        const newDate = new Date(pickupDate);
                        newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                        setPickupDate(newDate);
                      }
                    }}
                  />
                )}

                {Platform.OS === 'android' && showTimePicker && (
                  <DateTimePicker
                    value={pickupDate}
                    mode="time"
                    display="default"
                    onChange={(event, date) => {
                      setShowTimePicker(false);
                      if (date) {
                        const newDate = new Date(pickupDate);
                        newDate.setHours(date.getHours(), date.getMinutes(), 0, 0);
                        setPickupDate(newDate);
                      }
                    }}
                  />
                )}

                {/* --- IOS: Requires a Modal wrapper for the popup experience --- */}
                {Platform.OS === 'ios' && (showDatePicker || showTimePicker) && (
                  <Modal transparent={true} animationType="fade" visible={true}>
                    <View className="flex-1 justify-end bg-black/40">
                      <View className="bg-white rounded-t-3xl pb-8">
                        
                        {/* iOS Modal Header with Done Button */}
                        <View className="flex-row justify-between items-center border-b border-gray-100 px-6 py-4">
                          <Text className="text-gray-900 font-bold text-lg">
                            Select {showDatePicker ? 'Date' : 'Time'}
                          </Text>
                          <Pressable 
                            onPress={() => {
                              setShowDatePicker(false);
                              setShowTimePicker(false);
                            }}
                          >
                            <Text className="text-brandPrimary font-bold text-lg">Done</Text>
                          </Pressable>
                        </View>

                        {/* The iOS Spinner */}
                        <View className="w-full items-center justify-center">
                          <DateTimePicker
                            value={pickupDate}
                            mode={showDatePicker ? "date" : "time"}
                            display="spinner"
                            textColor="#000000" /* Prevents invisible text if user device is in Dark Mode */
                            style={{ alignSelf: 'center' }}
                            onChange={(event, date) => {
                              // Note: We DO NOT close the modal here on iOS. 
                              // We let the user spin the wheel and tap "Done" when finished.
                              if (date) {
                                const newDate = new Date(pickupDate);
                                if (showDatePicker) {
                                  newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                                } else {
                                  newDate.setHours(date.getHours(), date.getMinutes(), 0, 0);
                                }
                                setPickupDate(newDate);
                              }
                            }}
                          />
                        </View>
                      </View>
                    </View>
                  </Modal>
                )}

                {/* 
                <View className="mt-4">
                  <Text className="text-gray-700 font-bold mb-2 ml-1">Note for Buyer (Optional)</Text>
                  <TextInput
                    className="bg-white px-4 py-4 rounded-2xl border border-gray-100 text-gray-900 h-24"
                    placeholder="Add a special note or pickup instructions..."
                    value={message}
                    onChangeText={setMessage}
                    multiline
                  />
                </View>
                */}


                {/* Display pending orders for this item here */}
                {editingId && orders.some(o => o.itemId === editingId && (o.status === 'ordered' || o.status === 'ready')) && (
                  <View className="mt-6 p-4 bg-brandPrimary-soft rounded-2xl border border-brandPrimary/20">
                    <Text className="text-brandPrimary font-bold text-lg mb-3">Manage Orders</Text>
                    {orders.filter(o => o.itemId === editingId && (o.status === 'ordered' || o.status === 'ready')).map(order => {
                      const isOrdered = order.status === 'ordered';
                      return (
                        <View key={order.id} className="bg-white rounded-xl p-3 mb-2 shadow-sm border border-gray-100 flex-row justify-between items-center">
                          <View>
                            <Text className="font-bold text-gray-900 text-sm">Order #{order.id.substring(0, 8).toUpperCase()}</Text>
                            <View className="flex-row items-center mt-1">
                              <Text className="text-brandPrimary text-[10px] font-bold mr-2">Status: {isOrdered ? 'Ordered' : 'Ready for pickup'}</Text>
                              {(order.quantity && order.quantity > 1) && (
                                <Text className="text-gray-600 text-[10px] font-bold">Qty: {order.quantity}</Text>
                              )}
                            </View>
                          </View>
                          <Pressable
                            onPress={() => handleUpdateOrderStatus(order.id, isOrdered ? 'ready' : 'completed')}
                            className="bg-brandPrimary px-3 py-2 rounded-lg flex-row items-center"
                          >
                            {isOrdered ? <QrCode size={12} color="white" className="mr-1" /> : <CheckCircle size={12} color="white" className="mr-1" />}
                            <Text className="text-white font-bold text-[11px]">{isOrdered ? 'Mark Ready' : 'Mark Completed'}</Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Relist and Save Changes are hidden for completed orders */}
              {hasChanges && !isRelistMode && (
                <Pressable
                  onPress={handleSaveListing}
                  disabled={submitting}
                  className={`mt-8 mb-4 py-5 rounded-full items-center shadow-lg shadow-brandPrimary/20 ${submitting ? 'bg-brandPrimary-soft' : 'bg-brandPrimary'}`}
                >
                  {submitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold text-xl">
                      {editingId ? "Save Changes" : "Create Listing"}
                    </Text>
                  )}
                </Pressable>
              )}

              {/* Delete Order button is also hidden for completed orders */}
              {editingId && !isRelistMode && (
                <Pressable
                  onPress={handleDeleteAction}
                  className={`mb-8 py-4 rounded-full items-center bg-red-50 border border-red-100 ${!hasChanges ? 'mt-8' : ''}`}
                >
                  <View className="flex-row items-center">
                    <Trash2 size={18} color="#EF4444" className="mr-2" />
                    <Text className="text-red-500 font-bold text-lg">Delete Listing</Text>
                  </View>
                </Pressable>
              )}
            </ScrollView>

          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}