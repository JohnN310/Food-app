// import React, { useState, useEffect } from 'react';
// import { View, Text, Pressable, Modal, TextInput, ScrollView, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { Package, Plus, X, Tag, ChevronRight, DollarSign, Layers } from 'lucide-react-native';
// import { collection, addDoc, onSnapshot, query, where, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
// import { db } from '@/lib/firebaseLib';
// import { useAppStore } from '@/store/app-store';
// import { CATEGORY_ICONS } from '@/lib/constants';

// export default function InventoryScreen() {
//   const user = useAppStore(state => state.user);
//   const [listings, setListings] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [modalVisible, setModalVisible] = useState(false);
//   const [submitting, setSubmitting] = useState(false);

//   // Form State
//   const [title, setTitle] = useState('');
//   const [description, setDescription] = useState('');
//   const [category, setCategory] = useState('Bakery');
//   const [originalPrice, setOriginalPrice] = useState('');
//   const [discountPrice, setDiscountPrice] = useState('');
//   const [quantity, setQuantity] = useState('');
//   const [editingId, setEditingId] = useState<string | null>(null);

//   // 1. Real-time Listener for Seller's Listings
//   useEffect(() => {
//     if (!user) return;

//     const q = query(
//       collection(db, 'listings'),
//       where('sellerId', '==', user.uid)
//     );

//     const unsubscribe = onSnapshot(q, (snapshot) => {
//       const docs = snapshot.docs.map(doc => ({
//         id: doc.id,
//         ...doc.data()
//       }));
//       setListings(docs);
//       setLoading(false);
//     }, (error) => {
//       console.error("Inventory fetch error:", error);
//       setLoading(false);
//     });

//     return unsubscribe;
//   }, [user]);


//   const handleEditPress = (item: any) => {
//     setTitle(item.title);
//     setDescription(item.description);
//     setCategory(item.category);
//     setOriginalPrice(item.oldPrice.replace('$', ''));
//     setDiscountPrice(item.price.replace('$', ''));
//     setQuantity(item.quantity.toString());
//     setEditingId(item.id);
//     setModalVisible(true);
//   };

//   const handleSaveListing = async () => {
//     if (!title || !originalPrice || !discountPrice || !quantity) {
//       Alert.alert("Missing Fields", "Please fill in all required fields.");
//       return;
//     }

//     setSubmitting(true);
//     try {
//       const payload: any = {
//         title,
//         description,
//         category,
//         price: `$${discountPrice}`,
//         oldPrice: `$${originalPrice}`,
//         discount: `${Math.round((1 - parseFloat(discountPrice) / parseFloat(originalPrice)) * 100)}% OFF`,
//         quantity: parseInt(quantity),
//       };

//       if (editingId) {
//         // UPDATE EXISTING LISTING
//         await updateDoc(doc(db, 'listings', editingId), payload);
//         Alert.alert("Success", "Listing updated successfully!");
//       } else {
//         // CREATE NEW LISTING
//         payload.sellerId = user.uid;
//         payload.status = 'active';
//         payload.createdAt = serverTimestamp();
//         payload.image = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=500&auto=format&fit=crop';
//         payload.store = "Your Store";
//         payload.rating = "4.8";
//         payload.distance = "0.2 mi";
//         payload.time = "Pick up now";
//         payload.badges = [{ text: "Fresh Today", type: "green" }];

//         await addDoc(collection(db, 'listings'), payload);
//         Alert.alert("Success", "Listing created successfully!");
//       }

//       setModalVisible(false);
//       resetForm();
//     } catch (error) {
//       console.error("Error saving listing:", error);
//       Alert.alert("Error", "Could not save listing. Please try again.");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const resetForm = () => {
//     setTitle('');
//     setDescription('');
//     setCategory('Bakery');
//     setOriginalPrice('');
//     setDiscountPrice('');
//     setQuantity('');
//     setEditingId(null);
//   };

//   return (
//     <SafeAreaView className="flex-1 bg-background">
//       <View className="flex-1 px-6 pt-6">

//         {/* Header */}
//         <View className="flex-row items-center justify-between mb-8">
//           <View>
//             <Text className="text-brandPrimary font-semibold text-xs tracking-widest uppercase mb-1">Store Inventory</Text>
//             <Text className="text-3xl font-bold text-gray-900">Listings</Text>
//           </View>
//           <Pressable
//             onPress={() => setModalVisible(true)}
//             className="w-12 h-12 bg-brandPrimary rounded-2xl items-center justify-center shadow-lg shadow-brandPrimary/20"
//           >
//             <Plus size={24} color="white" strokeWidth={2.5} />
//           </Pressable>
//         </View>

//         {loading ? (
//           <View className="flex-1 items-center justify-center">
//             <ActivityIndicator color="#1B7A49" size="large" />
//           </View>
//         ) : listings.length > 0 ? (
//           <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
//             {listings.map((item) => (
//               <Pressable
//                 key={item.id}
//                 onPress={() => handleEditPress(item)}
//                 className="bg-white rounded-3xl p-4 mb-4 flex-row border border-gray-100 shadow-sm active:opacity-70"
//               >
//                 <View className="w-20 h-20 bg-brandPrimary-soft rounded-2xl items-center justify-center overflow-hidden">
//                   <Text className="text-3xl">{CATEGORY_ICONS[item.category] || '🏷️'}</Text>
//                 </View>
//                 <View className="flex-1 ml-4 justify-center">
//                   <Text className="text-lg font-bold text-gray-900 mb-1">{item.title}</Text>
//                   <View className="flex-row items-center gap-2">
//                     <Text className="text-brandPrimary font-bold">{item.price}</Text>
//                     <Text className="text-gray-400 line-through text-xs">{item.oldPrice}</Text>
//                     <View className="bg-green-50 px-2 py-0.5 rounded-md border border-green-100">
//                       <Text className="text-brandPrimary text-[10px] font-bold">Qty: {item.quantity}</Text>
//                     </View>
//                   </View>
//                 </View>
//                 <View className="justify-center">
//                   <ChevronRight size={20} color="#D1D5DB" />
//                 </View>
//               </Pressable>
//             ))}
//             <View className="h-10" />
//           </ScrollView>
//         ) : (
//           /* Premium Empty State */
//           <View className="flex-1 items-center justify-center pb-12">
//             <View className="w-24 h-24 bg-brandPrimary-soft rounded-[40px] items-center justify-center mb-6">
//               <Package size={48} color="#1B7A49" />
//             </View>
//             <Text className="text-2xl font-bold text-gray-900 mb-3">Your store is empty</Text>
//             <Text className="text-gray-500 text-center mb-10 px-10 leading-relaxed">
//               Start your rescue mission! List your surplus food items here to reach eco-conscious buyers nearby.
//             </Text>
//             <Pressable
//               onPress={() => setModalVisible(true)}
//               className="bg-brandPrimary py-4 px-10 rounded-full shadow-md active:opacity-90"
//             >
//               <Text className="text-white font-bold text-lg">Add First Listing</Text>
//             </Pressable>
//           </View>
//         )}

//       </View>

//       {/* Add Listing Modal */}
//       <Modal
//         animationType="slide"
//         presentationStyle="pageSheet"
//         visible={modalVisible}
//         onRequestClose={() => setModalVisible(false)}
//       >
//         <KeyboardAvoidingView
//           behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//           className="flex-1"
//         >
//           <View className="flex-1 px-6 pt-8 pb-4">

//             <View className="flex-row justify-between items-center mb-8">
//               <Text className="text-2xl font-bold text-gray-900">{editingId ? "Edit Listing" : "New Listing"}</Text>
//               <Pressable
//                 onPress={() => setModalVisible(false)}
//                 className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
//               >
//                 <X size={20} color="#374151" />
//               </Pressable>
//             </View>

//             <ScrollView showsVerticalScrollIndicator={false}>
//               <View className="space-y-5">
//                 <View>
//                   <Text className="text-gray-700 font-bold mb-2 ml-1">Title</Text>
//                   <TextInput
//                     className="bg-white px-4 py-4 rounded-2xl border border-gray-100 text-gray-900"
//                     placeholder="e.g. Sourdough Loaf (Fresh)"
//                     value={title}
//                     onChangeText={setTitle}
//                   />
//                 </View>

//                 <View className="mt-4">
//                   <Text className="text-gray-700 font-bold mb-2 ml-1">Description</Text>
//                   <TextInput
//                     className="bg-white px-4 py-4 rounded-2xl border border-gray-100 text-gray-900 h-24"
//                     placeholder="Tell buyers about this item..."
//                     value={description}
//                     onChangeText={setDescription}
//                     multiline
//                   />
//                 </View>

//                 <View className="mt-4">
//                   <Text className="text-gray-700 font-bold mb-2 ml-1">Category</Text>
//                   <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
//                     {Object.keys(CATEGORY_ICONS).map((cat) => (
//                       <Pressable
//                         key={cat}
//                         onPress={() => setCategory(cat)}
//                         className={`mr-3 px-4 py-2 rounded-xl flex-row items-center border ${category === cat ? 'bg-brandPrimary border-brandPrimary' : 'bg-white border-gray-100'}`}
//                       >
//                         <Text className="mr-2 text-sm">{CATEGORY_ICONS[cat]}</Text>
//                         <Text className={`font-bold text-sm ${category === cat ? 'text-white' : 'text-gray-600'}`}>{cat}</Text>
//                       </Pressable>
//                     ))}
//                   </ScrollView>
//                 </View>

//                 <View className="flex-row gap-4 mt-4">
//                   <View className="flex-1">
//                     <Text className="text-gray-700 font-bold mb-2 ml-1">Original Price</Text>
//                     <View className="bg-white rounded-2xl border border-gray-100 flex-row items-center px-4 py-4">
//                       <DollarSign size={16} color="#9CA3AF" />
//                       <TextInput
//                         className="flex-1 ml-2 text-gray-900"
//                         placeholder="0.00"
//                         keyboardType="numeric"
//                         value={originalPrice}
//                         onChangeText={setOriginalPrice}
//                       />
//                     </View>
//                   </View>
//                   <View className="flex-1">
//                     <Text className="text-gray-700 font-bold mb-2 ml-1">Discount Price</Text>
//                     <View className="bg-white rounded-2xl border border-gray-100 flex-row items-center px-4 py-4">
//                       <DollarSign size={16} color="#1B7A49" />
//                       <TextInput
//                         className="flex-1 ml-2 text-gray-900"
//                         placeholder="0.00"
//                         keyboardType="numeric"
//                         value={discountPrice}
//                         onChangeText={setDiscountPrice}
//                       />
//                     </View>
//                   </View>
//                 </View>

//                 <View className="mt-4">
//                   <Text className="text-gray-700 font-bold mb-2 ml-1">Inventory Count</Text>
//                   <TextInput
//                     className="bg-white px-4 py-4 rounded-2xl border border-gray-100 text-gray-900"
//                     placeholder="How many items are available?"
//                     keyboardType="numeric"
//                     value={quantity}
//                     onChangeText={setQuantity}
//                   />
//                 </View>
//               </View>

//               <Pressable
//                 onPress={handleSaveListing}
//                 disabled={submitting}
//                 className={`mt-10 mb-10 py-5 rounded-full items-center shadow-lg shadow-brandPrimary/20 ${submitting ? 'bg-brandPrimary-soft' : 'bg-brandPrimary'}`}
//               >
//                 {submitting ? (
//                   <ActivityIndicator color="white" />
//                 ) : (
//                   // Dynamically change the button text
//                   <Text className="text-white font-bold text-xl">
//                     {editingId ? "Save Changes" : "Create Listing"}
//                   </Text>
//                 )}
//               </Pressable>
//             </ScrollView>

//           </View>
//         </KeyboardAvoidingView>
//       </Modal>

//     </SafeAreaView>
//   );
// }


import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Modal, TextInput, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package, Plus, X, ChevronRight, DollarSign, QrCode, CheckCircle, Clock } from 'lucide-react-native';
import { collection, addDoc, onSnapshot, query, where, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseLib';
import { useAppStore } from '@/store/app-store';
import { CATEGORY_ICONS } from '@/lib/constants';

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
  const [quantity, setQuantity] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

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
    const qListings = query(collection(db, 'listings'), where('sellerId', '==', user.uid), where('status', '==', 'active'));
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

  const handleEditPress = (item: any, orderId: string | null = null) => {
    setTitle(item.title);
    setDescription(item.description);
    setCategory(item.category);
    setOriginalPrice(item.oldPrice.replace('$', ''));
    setDiscountPrice(item.price.replace('$', ''));
    setQuantity(item.quantity.toString());
    setEditingId(item.id);
    openModal(); // Trigger the smooth animation
  };

  const handleSaveListing = async () => {
    if (!title || !originalPrice || !discountPrice || !quantity) {
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
        quantity: parseInt(quantity),
      };

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
        payload.time = "Pick up now";
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
    setQuantity('');
    setEditingId(null);
    setSubmitting(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-6">

        {/* Header */}
        <View className="flex-row items-center justify-between mb-8">
          <View>
            <Text className="text-brandPrimary font-semibold text-xs tracking-widest uppercase mb-1">Store Inventory</Text>
            <Text className="text-3xl font-bold text-gray-900">Listings</Text>
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
        ) : listings.length > 0 ? (
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            {orders.length > 0 && orders.some(o => o.status === 'completed') && (
              <View className="mb-6">
                <Text className="text-gray-900 font-bold text-lg mb-3">Completed Orders</Text>
                <View>
                  {orders.filter(o => o.status === 'completed').map((order) => {
                    const item = order.itemData || {};
                    return (
                      <View
                        key={order.id}
                        className="bg-white rounded-3xl p-4 mb-4 flex-row border border-gray-200 shadow-sm opacity-80"
                      >
                        <View className="w-20 h-20 bg-gray-100 rounded-2xl items-center justify-center overflow-hidden">
                          <Text className="text-3xl">{CATEGORY_ICONS[item.category] || '🏷️'}</Text>
                        </View>
                        <View className="flex-1 ml-4 justify-center">
                          <Text className="text-lg font-bold text-gray-500 mb-1" numberOfLines={1}>{item.title}</Text>
                          <View className="flex-row items-center gap-2 mb-2">
                            <Text className="text-gray-500 font-bold">{item.price}</Text>
                            <Text className="text-gray-300 line-through text-xs">{item.oldPrice}</Text>
                            <View className="bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                              <Text className="text-gray-500 text-[10px] font-bold">Qty: {item.quantity}</Text>
                            </View>
                          </View>
                          <View className="self-start px-2 py-0.5 rounded border bg-[#E1F0E8] border-brandPrimary/20">
                            <Text className="text-[10px] font-bold text-brandPrimary">
                              Status: Completed
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {orders.length > 0 && orders.some(o => o.status === 'ordered' || o.status === 'ready') && (
              <View className="mb-6">
                <Text className="text-gray-900 font-bold text-lg mb-3">Pending Orders</Text>
                <View>
                  {orders.filter(o => o.status === 'ordered' || o.status === 'ready').map((order) => {
                    const item = order.itemData || {};
                    const isOrdered = order.status === 'ordered';
                    return (
                      <Pressable
                        key={order.id}
                        onPress={() => handleEditPress(item)}
                        className="bg-white rounded-3xl p-4 mb-4 flex-row border border-brandPrimary/30 shadow-sm active:opacity-70"
                      >
                        <View className="w-20 h-20 bg-brandPrimary-soft rounded-2xl items-center justify-center overflow-hidden">
                          <Text className="text-3xl">{CATEGORY_ICONS[item.category] || '🏷️'}</Text>
                        </View>
                        <View className="flex-1 ml-4 justify-center">
                          <Text className="text-lg font-bold text-gray-900 mb-1" numberOfLines={1}>{item.title}</Text>
                          <View className="flex-row items-center gap-2 mb-2">
                            <Text className="text-brandPrimary font-bold">{item.price}</Text>
                            <Text className="text-gray-400 line-through text-xs">{item.oldPrice}</Text>
                            <View className="bg-green-50 px-2 py-0.5 rounded-md border border-green-100">
                              <Text className="text-brandPrimary text-[10px] font-bold">Qty: {item.quantity}</Text>
                            </View>
                          </View>
                          <View className={`self-start px-2 py-0.5 rounded border ${isOrdered ? 'bg-orange-50 border-orange-100' : 'bg-[#E1F0E8] border-brandPrimary/20'}`}>
                            <Text className={`text-[10px] font-bold ${isOrdered ? 'text-orange-600' : 'text-brandPrimary'}`}>
                              {isOrdered ? 'Status: Ordered' : 'Status: Ready for pickup'}
                            </Text>
                          </View>
                        </View>
                        <View className="justify-center">
                          <ChevronRight size={20} color="#D1D5DB" />
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            <Text className="text-gray-900 font-bold text-lg mb-3">Active Inventory</Text>
            {listings.map((item) => (
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
                    <Text className="text-brandPrimary font-bold">{item.price}</Text>
                    <Text className="text-gray-400 line-through text-xs">{item.oldPrice}</Text>
                    <View className="bg-green-50 px-2 py-0.5 rounded-md border border-green-100">
                      <Text className="text-brandPrimary text-[10px] font-bold">Qty: {item.quantity}</Text>
                    </View>
                  </View>
                </View>
                <View className="justify-center">
                  <ChevronRight size={20} color="#D1D5DB" />
                </View>
              </Pressable>
            ))}
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
              <Pressable onPress={closeModal} className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                <X size={20} color="#374151" />
              </Pressable>
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
                        returnKeyType="done"
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
                        returnKeyType="done"
                        value={discountPrice}
                        onChangeText={setDiscountPrice}
                      />
                    </View>
                  </View>
                </View>

                <View className="mt-4">
                  <Text className="text-gray-700 font-bold mb-2 ml-1">Inventory Count</Text>
                  <TextInput
                    className="bg-white px-4 py-4 rounded-2xl border border-gray-100 text-gray-900"
                    placeholder="How many items are available?"
                    keyboardType="numeric"
                    returnKeyType="done"
                    value={quantity}
                    onChangeText={setQuantity}
                  />
                </View>

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
                            <Text className="text-brandPrimary text-[10px] font-bold mt-1">Status: {isOrdered ? 'Ordered' : 'Ready for pickup'}</Text>
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
            </ScrollView>

          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}