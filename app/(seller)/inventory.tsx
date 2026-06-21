import { CATEGORY_ICONS } from '@/lib/constants';
import { db } from '@/lib/firebaseLib';
import { moderateScale, scale, verticalScale } from '@/lib/responsive';
import { useAppStore } from '@/store/app-store';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { CheckCircle, ChevronRight, DollarSign, Package, Plus, QrCode, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
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
  const [expiryDate, setExpiryDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showExpiryDatePicker, setShowExpiryDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [message, setMessage] = useState('');
  const [stockCount, setStockCount] = useState('1');
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

    if (item.expiryTimestamp) {
      setExpiryDate(new Date(item.expiryTimestamp));
    } else {
      setExpiryDate(new Date());
    }

    setMessage(item.message || '');
    setStockCount(item.quantity !== undefined ? item.quantity.toString() : '1');
    setIsHidden(item.status === 'hidden');
    setOriginalItem({
      title: item.title,
      description: item.description,
      category: item.category,
      originalPrice: item.oldPrice.replace('$', ''),
      discountPrice: item.price.replace('$', ''),
      pickupDate: item.pickupTimestamp ? new Date(item.pickupTimestamp) : new Date(),
      expiryDate: item.expiryTimestamp ? new Date(item.expiryTimestamp) : new Date(),
      message: item.message || '',
      stockCount: item.quantity !== undefined ? item.quantity.toString() : '1',
      isHidden: item.status === 'hidden',
    });
    setEditingId(item.id);
    setIsRelistMode(isCompleted);
    setEditingOrderId(orderId);
    openModal(); // Trigger the smooth animation
  };

  const handleSaveListing = async () => {
    if (!title || !originalPrice || !discountPrice || !stockCount) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const parsedStock = parseInt(stockCount, 10);
      const payload: any = {
        title,
        description,
        category,
        price: `$${parseFloat(discountPrice).toFixed(2)}`,
        oldPrice: `$${parseFloat(originalPrice).toFixed(2)}`,
        discount: `${Math.round((1 - parseFloat(discountPrice) / parseFloat(originalPrice)) * 100)}% OFF`,
        time: `${pickupDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${pickupDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
        pickupTimestamp: pickupDate.getTime(),
        expiryTimestamp: expiryDate.getTime(),
        message,
        quantity: isNaN(parsedStock) ? 1 : Math.max(0, parsedStock),
      };

      if (isHidden) {
        payload.status = 'hidden';
      } else {
        payload.status = 'active';
      }

      if (editingId) {
        await updateDoc(doc(db, 'listings', editingId), payload);
      } else {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        let storeName = "Your Store";

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData.storeName) storeName = userData.storeName;
          if (userData.latitude !== undefined && userData.longitude !== undefined) {
            payload.latitude = userData.latitude;
            payload.longitude = userData.longitude;
          }
        }

        payload.sellerId = user.uid;
        payload.status = 'active';
        payload.createdAt = serverTimestamp();
        payload.image = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=500&auto=format&fit=crop';
        payload.store = storeName;
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
    setExpiryDate(new Date());
    setMessage('');
    setStockCount('1');
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
      expiryDate.getTime() !== originalItem.expiryDate?.getTime() ||
      message !== originalItem.message ||
      stockCount !== originalItem.stockCount ||
      isHidden !== originalItem.isHidden
    );
  }, [title, description, category, originalPrice, discountPrice, pickupDate, expiryDate, message, stockCount, isHidden, editingId, originalItem, isRelistMode]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View style={{ paddingHorizontal: scale(24), paddingTop: verticalScale(24) }} className="flex-1">

        {/* Header */}
        <View style={{ marginBottom: verticalScale(32) }} className="flex-row items-center justify-between">
          <View>
            <Text style={{ fontSize: moderateScale(11), marginBottom: verticalScale(4), letterSpacing: 1 }} className="text-brandPrimary font-semibold uppercase">Store Inventory</Text>
            <Text style={{ fontSize: moderateScale(28) }} className="font-bold text-gray-900">Listings ({listings.filter(l => l.status === 'active' || l.status === 'hidden').length})</Text>
          </View>
          <Pressable
            onPress={openModal} // Changed to openModal
            style={{ width: scale(48), height: scale(48), borderRadius: scale(16) }}
            className="bg-brandPrimary items-center justify-center shadow-lg shadow-brandPrimary/20"
          >
            <Plus size={scale(24)} color="white" strokeWidth={2.5} />
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
                    style={{ padding: scale(16), marginBottom: verticalScale(16), borderRadius: scale(24) }}
                    className="bg-white flex-row border border-gray-100 shadow-sm active:opacity-70"
                  >
                    <View style={{ width: scale(80), height: scale(80), borderRadius: scale(16) }} className="bg-brandPrimary-soft items-center justify-center overflow-hidden">
                      <Text style={{ fontSize: moderateScale(28) }}>{CATEGORY_ICONS[item.category] || '🏷️'}</Text>
                    </View>
                    <View style={{ marginLeft: scale(16) }} className="flex-1 justify-center">
                      <Text style={{ fontSize: moderateScale(16), marginBottom: verticalScale(4) }} className="font-bold text-gray-900">{item.title}</Text>
                      <View style={{ gap: scale(8) }} className="flex-row items-center">
                        <View style={{ paddingHorizontal: scale(8), paddingVertical: verticalScale(2), borderRadius: scale(6) }} className={`border ${item.status === 'hidden' ? 'bg-gray-100 border-gray-200' : 'bg-brandPrimary-soft border-brandPrimary/20'}`}>
                          <Text style={{ fontSize: moderateScale(10) }} className={`font-bold ${item.status === 'hidden' ? 'text-gray-500' : 'text-brandPrimary'}`}>
                            {item.status === 'hidden' ? 'Hidden' : 'Active'}
                          </Text>
                        </View>
                        <Text style={{ fontSize: moderateScale(13) }} className="text-brandPrimary font-bold">{item.price}</Text>
                        <Text style={{ fontSize: moderateScale(11) }} className="text-gray-400 line-through">{item.oldPrice}</Text>
                      </View>
                      <Text style={{ fontSize: moderateScale(11), marginTop: verticalScale(4) }} className="text-gray-500">Stock: {item.quantity ?? 1}</Text>
                    </View>
                    <View className="justify-center">
                      <ChevronRight size={scale(20)} color="#D1D5DB" />
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
            <View style={{ height: verticalScale(40) }} />
          </ScrollView>
        ) : (
          <View style={{ paddingBottom: verticalScale(48) }} className="flex-1 items-center justify-center">
            <View style={{ width: scale(96), height: scale(96), borderRadius: scale(40), marginBottom: verticalScale(24) }} className="bg-brandPrimary-soft items-center justify-center">
              <Package size={scale(48)} color="#1B7A49" />
            </View>
            <Text style={{ fontSize: moderateScale(22), marginBottom: verticalScale(12) }} className="font-bold text-gray-900">Your store is empty</Text>
            <Text style={{ fontSize: moderateScale(15), marginBottom: verticalScale(40), paddingHorizontal: scale(40) }} className="text-gray-500 text-center leading-relaxed">
              Start your rescue mission! List your surplus food items here to reach eco-conscious buyers nearby.
            </Text>
            <Pressable
              onPress={openModal} // Changed to openModal
              style={{ paddingVertical: verticalScale(16), paddingHorizontal: scale(40), borderRadius: scale(9999) }}
              className="bg-brandPrimary shadow-md active:opacity-90"
            >
              <Text style={{ fontSize: moderateScale(16) }} className="text-white font-bold">Add First Listing</Text>
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
            style={{ transform: [{ translateY: slideAnim }], paddingHorizontal: scale(24), paddingTop: verticalScale(32), paddingBottom: verticalScale(40), maxHeight: '90%', borderTopLeftRadius: scale(32), borderTopRightRadius: scale(32) }}
            className="bg-background shadow-2xl"
          >
            <View style={{ marginBottom: verticalScale(24) }} className="flex-row justify-between items-center">
              <Text style={{ fontSize: moderateScale(22) }} className="font-bold text-gray-900">{editingId ? "Edit Listing" : "New Listing"}</Text>
              <View style={{ gap: scale(12) }} className="flex-row items-center">
                <Pressable
                  onPress={() => setIsHidden(!isHidden)}
                  style={{ paddingHorizontal: scale(12), paddingVertical: verticalScale(6), borderRadius: scale(9999) }}
                  className={`flex-row items-center border ${isHidden
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-brandPrimary-soft border-brandPrimary/20'
                    }`}
                >
                  <View style={{ width: scale(8), height: scale(8), borderRadius: scale(4), marginRight: scale(6) }} className={`${isHidden ? 'bg-gray-400' : 'bg-brandPrimary'}`} />
                  <Text style={{ fontSize: moderateScale(11) }} className={`font-bold ${isHidden ? 'text-gray-500' : 'text-brandPrimary'}`}>
                    {isHidden ? 'Hidden' : 'Active'}
                  </Text>
                </Pressable>
                <Pressable onPress={closeModal} style={{ width: scale(40), height: scale(40), borderRadius: scale(20) }} className="bg-gray-100 items-center justify-center">
                  <X size={scale(20)} color="#374151" />
                </Pressable>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
              <View style={{ gap: verticalScale(16) }}>
                <View>
                  <Text style={{ fontSize: moderateScale(13), marginBottom: verticalScale(8), marginLeft: scale(4) }} className="text-gray-700 font-bold">Title</Text>
                  <TextInput
                    style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(16), borderRadius: scale(16), fontSize: moderateScale(15) }}
                    className="bg-white border border-gray-100 text-gray-900"
                    placeholder="e.g. Sourdough Loaf (Fresh)"
                    placeholderTextColor="#6B7280"
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>

                <View>
                  <Text style={{ fontSize: moderateScale(13), marginBottom: verticalScale(8), marginLeft: scale(4) }} className="text-gray-700 font-bold">Description</Text>
                  <TextInput
                    style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(16), borderRadius: scale(16), fontSize: moderateScale(15), height: verticalScale(96) }}
                    className="bg-white border border-gray-100 text-gray-900"
                    placeholder="Tell buyers about this item..."
                    placeholderTextColor="#6B7280"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                  />
                </View>

                <View>
                  <Text style={{ fontSize: moderateScale(13), marginBottom: verticalScale(8), marginLeft: scale(4) }} className="text-gray-700 font-bold">Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                    {Object.keys(CATEGORY_ICONS).map((cat) => (
                      <Pressable
                        key={cat}
                        onPress={() => setCategory(cat)}
                        style={{ marginRight: scale(12), paddingHorizontal: scale(16), paddingVertical: verticalScale(8), borderRadius: scale(12) }}
                        className={`flex-row items-center border ${category === cat ? 'bg-brandPrimary border-brandPrimary' : 'bg-white border-gray-100'}`}
                      >
                        <Text style={{ fontSize: moderateScale(13), marginRight: scale(8) }}>{CATEGORY_ICONS[cat]}</Text>
                        <Text style={{ fontSize: moderateScale(13) }} className={`font-bold ${category === cat ? 'text-white' : 'text-gray-600'}`}>{cat}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                <View style={{ gap: scale(16) }} className="flex-row">
                  <View className="flex-1">
                    <Text style={{ fontSize: moderateScale(13), marginBottom: verticalScale(8), marginLeft: scale(4) }} className="text-gray-700 font-bold">Original Price</Text>
                    <View style={{ borderRadius: scale(16), paddingHorizontal: scale(16), paddingVertical: verticalScale(16) }} className="bg-white border border-gray-100 flex-row items-center">
                      <DollarSign size={scale(16)} color="#9CA3AF" />
                      <TextInput
                        style={{ fontSize: moderateScale(15), marginLeft: scale(8) }}
                        className="flex-1 text-gray-900"
                        placeholder="0.00"
                        placeholderTextColor="#6B7280"
                        keyboardType="numeric"
                        value={originalPrice}
                        onChangeText={setOriginalPrice}
                      />
                    </View>
                  </View>
                  <View className="flex-1">
                    <Text style={{ fontSize: moderateScale(13), marginBottom: verticalScale(8), marginLeft: scale(4) }} className="text-gray-700 font-bold">Discount Price</Text>
                    <View style={{ borderRadius: scale(16), paddingHorizontal: scale(16), paddingVertical: verticalScale(16) }} className="bg-white border border-gray-100 flex-row items-center">
                      <DollarSign size={scale(16)} color="#1B7A49" />
                      <TextInput
                        style={{ fontSize: moderateScale(15), marginLeft: scale(8) }}
                        className="flex-1 text-gray-900"
                        placeholder="0.00"
                        placeholderTextColor="#6B7280"
                        keyboardType="numeric"
                        value={discountPrice}
                        onChangeText={setDiscountPrice}
                      />
                    </View>
                  </View>
                </View>

                <View>
                  <Text style={{ fontSize: moderateScale(13), marginBottom: verticalScale(8), marginLeft: scale(4) }} className="text-gray-700 font-bold">Stock Quantity</Text>
                  <View style={{ borderRadius: scale(16), paddingHorizontal: scale(16), paddingVertical: verticalScale(16) }} className="bg-white border border-gray-100 flex-row items-center">
                    <Package size={scale(16)} color="#9CA3AF" />
                    <TextInput
                      style={{ fontSize: moderateScale(15), marginLeft: scale(8) }}
                      className="flex-1 text-gray-900"
                      placeholder="1"
                      placeholderTextColor="#6B7280"
                      keyboardType="numeric"
                      value={stockCount}
                      onChangeText={setStockCount}
                    />
                  </View>
                </View>

                <View>
                  <Text style={{ fontSize: moderateScale(13), marginBottom: verticalScale(8), marginLeft: scale(4) }} className="text-gray-700 font-bold">Pickup Time & Date</Text>
                  <View style={{ gap: scale(12) }} className="flex-row">
                    <Pressable
                      onPress={() => setShowDatePicker(true)}
                      style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(16), borderRadius: scale(16) }}
                      className="flex-1 bg-white border border-gray-100 items-center justify-center"
                    >
                      <Text style={{ fontSize: moderateScale(15) }} className="text-gray-900 font-medium">
                        {pickupDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setShowTimePicker(true)}
                      style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(16), borderRadius: scale(16) }}
                      className="flex-1 bg-white border border-gray-100 items-center justify-center"
                    >
                      <Text style={{ fontSize: moderateScale(15) }} className="text-gray-900 font-medium">
                        {pickupDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View>
                  <Text style={{ fontSize: moderateScale(13), marginBottom: verticalScale(8), marginLeft: scale(4) }} className="text-gray-700 font-bold">Expiry Date</Text>
                  <View style={{ gap: scale(12) }} className="flex-row">
                    <Pressable
                      onPress={() => setShowExpiryDatePicker(true)}
                      style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(16), borderRadius: scale(16) }}
                      className="flex-1 bg-white border border-gray-100 items-center justify-center"
                    >
                      <Text style={{ fontSize: moderateScale(15) }} className="text-gray-900 font-medium">
                        {expiryDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
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

                {Platform.OS === 'android' && showExpiryDatePicker && (
                  <DateTimePicker
                    value={expiryDate}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setShowExpiryDatePicker(false);
                      if (date) {
                        const newDate = new Date(expiryDate);
                        newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                        setExpiryDate(newDate);
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
                {Platform.OS === 'ios' && (showDatePicker || showTimePicker || showExpiryDatePicker) && (
                  <Modal transparent={true} animationType="fade" visible={true}>
                    <View className="flex-1 justify-end bg-black/40">
                      <View className="bg-white rounded-t-3xl pb-8">

                        {/* iOS Modal Header with Done Button */}
                        <View className="flex-row justify-between items-center border-b border-gray-100 px-6 py-4">
                          <Text className="text-gray-900 font-bold text-lg">
                            Select {showDatePicker ? 'Pickup Date' : showExpiryDatePicker ? 'Expiry Date' : 'Time'}
                          </Text>
                          <Pressable
                            onPress={() => {
                              setShowDatePicker(false);
                              setShowTimePicker(false);
                              setShowExpiryDatePicker(false);
                            }}
                          >
                            <Text className="text-brandPrimary font-bold text-lg">Done</Text>
                          </Pressable>
                        </View>

                        {/* The iOS Spinner */}
                        <View className="w-full items-center justify-center">
                          <DateTimePicker
                            value={showExpiryDatePicker ? expiryDate : pickupDate}
                            mode={(showDatePicker || showExpiryDatePicker) ? "date" : "time"}
                            display="spinner"
                            textColor="#000000" /* Prevents invisible text if user device is in Dark Mode */
                            style={{ alignSelf: 'center' }}
                            onChange={(event, date) => {
                              // Note: We DO NOT close the modal here on iOS. 
                              // We let the user spin the wheel and tap "Done" when finished.
                              if (date) {
                                if (showExpiryDatePicker) {
                                  const newDate = new Date(expiryDate);
                                  newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                                  setExpiryDate(newDate);
                                } else {
                                  const newDate = new Date(pickupDate);
                                  if (showDatePicker) {
                                    newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                                  } else {
                                    newDate.setHours(date.getHours(), date.getMinutes(), 0, 0);
                                  }
                                  setPickupDate(newDate);
                                }
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
                  <View style={{ padding: scale(16), borderRadius: scale(16) }} className="bg-brandPrimary-soft border border-brandPrimary/20">
                    <Text style={{ fontSize: moderateScale(16), marginBottom: verticalScale(12) }} className="text-brandPrimary font-bold">Manage Orders</Text>
                    {orders.filter(o => o.itemId === editingId && (o.status === 'ordered' || o.status === 'ready')).map(order => {
                      const isOrdered = order.status === 'ordered';
                      return (
                        <View key={order.id} style={{ padding: scale(12), marginBottom: verticalScale(8), borderRadius: scale(12) }} className="bg-white shadow-sm border border-gray-100 flex-row justify-between items-center">
                          <View>
                            <Text style={{ fontSize: moderateScale(13) }} className="font-bold text-gray-900">Order #{order.id.substring(0, 8).toUpperCase()}</Text>
                            <View style={{ marginTop: verticalScale(4) }} className="flex-row items-center">
                              <Text style={{ fontSize: moderateScale(10), marginRight: scale(8) }} className="text-brandPrimary font-bold">Status: {isOrdered ? 'Ordered' : 'Ready for pickup'}</Text>
                              {(order.quantity && order.quantity > 1) && (
                                <Text style={{ fontSize: moderateScale(10) }} className="text-gray-600 font-bold">Qty: {order.quantity}</Text>
                              )}
                            </View>
                          </View>
                          <Pressable
                            onPress={() => handleUpdateOrderStatus(order.id, isOrdered ? 'ready' : 'completed')}
                            style={{ paddingHorizontal: scale(12), paddingVertical: verticalScale(8), borderRadius: scale(8) }}
                            className="bg-brandPrimary flex-row items-center"
                          >
                            {isOrdered ? <QrCode size={scale(12)} color="white" style={{ marginRight: scale(4) }} /> : <CheckCircle size={scale(12)} color="white" style={{ marginRight: scale(4) }} />}
                            <Text style={{ fontSize: moderateScale(10) }} className="text-white font-bold">{isOrdered ? 'Mark Ready' : 'Mark Completed'}</Text>
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
                  style={{ marginTop: verticalScale(16), marginBottom: verticalScale(16), paddingVertical: verticalScale(20), borderRadius: scale(9999) }}
                  className={`items-center shadow-lg shadow-brandPrimary/20 ${submitting ? 'bg-brandPrimary-soft' : 'bg-brandPrimary'}`}
                >
                  {submitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={{ fontSize: moderateScale(18) }} className="text-white font-bold">
                      {editingId ? "Save Changes" : "Create Listing"}
                    </Text>
                  )}
                </Pressable>
              )}

              {/* Delete Order button is also hidden for completed orders */}
              {editingId && !isRelistMode && (
                <Pressable
                  onPress={handleDeleteAction}
                  style={{ marginBottom: verticalScale(32), paddingVertical: verticalScale(16), borderRadius: scale(9999), marginTop: !hasChanges ? verticalScale(16) : 0 }}
                  className={`items-center bg-red-50 border border-red-100`}
                >
                  <View className="flex-row items-center">
                    <Trash2 size={scale(18)} color="#EF4444" style={{ marginRight: scale(8) }} />
                    <Text style={{ fontSize: moderateScale(16) }} className="text-red-500 font-bold">Delete Listing</Text>
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