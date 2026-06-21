import { CATEGORY_ICONS } from '@/lib/constants';
import { db } from '@/lib/firebaseLib';
import { moderateScale, scale, verticalScale } from '@/lib/responsive';
import { useAppStore } from '@/store/app-store';
import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { CheckCircle, MessageSquare, QrCode } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SellerOrdersScreen() {
  const user = useAppStore(state => state.user);
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const qOrders = query(collection(db, 'orders'), where('sellerId', '==', user.uid));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      docs.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setOrders(docs);
      setLoading(false);
    }, (error) => {
      console.error("Orders fetch error:", error);
      setLoading(false);
    });

    return () => unsubscribeOrders();
  }, [user]);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
    } catch (error) {
      console.error("Error updating order:", error);
      Alert.alert("Error", "Could not update order status.");
    }
  };



  const completedOrders = orders.filter(o => o.status === 'completed');
  const pendingOrders = orders.filter(o => o.status === 'ordered' || o.status === 'ready');

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View style={{ paddingHorizontal: scale(24), paddingTop: verticalScale(24) }} className="flex-1">
        <View style={{ marginBottom: verticalScale(32) }}>
          <Text style={{ fontSize: moderateScale(11), marginBottom: verticalScale(4), letterSpacing: 1 }} className="text-brandPrimary font-semibold uppercase">Store Management</Text>
          <Text style={{ fontSize: moderateScale(28) }} className="font-bold text-gray-900">Orders</Text>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#1B7A49" size="large" />
          </View>
        ) : orders.length > 0 ? (
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            {pendingOrders.length > 0 && (
              <View style={{ marginBottom: verticalScale(24) }}>
                <Text style={{ fontSize: moderateScale(16), marginBottom: verticalScale(12) }} className="text-gray-900 font-bold">Pending Orders</Text>
                <View>
                  {pendingOrders.map((order) => {
                    const item = order.itemData || {};
                    const isOrdered = order.status === 'ordered';
                    return (
                      <View
                        key={order.id}
                        style={{ padding: scale(16), marginBottom: verticalScale(16), borderRadius: scale(24) }}
                        className="bg-white flex-col border border-brandPrimary/30 shadow-sm"
                      >
                        <View className="flex-row">
                          <View style={{ width: scale(80), height: scale(80), borderRadius: scale(16) }} className="bg-brandPrimary-soft items-center justify-center overflow-hidden">
                            <Text style={{ fontSize: moderateScale(28) }}>{CATEGORY_ICONS[item.category] || '🏷️'}</Text>
                          </View>
                          <View style={{ marginLeft: scale(16) }} className="flex-1 justify-center">
                            <Text style={{ fontSize: moderateScale(16), marginBottom: verticalScale(4) }} className="font-bold text-gray-900" numberOfLines={1}>{item.title}</Text>
                            <View style={{ gap: scale(8), marginBottom: verticalScale(8) }} className="flex-row items-center">
                              <Text style={{ fontSize: moderateScale(13) }} className="text-brandPrimary font-bold">{item.price}</Text>
                              <Text style={{ fontSize: moderateScale(11) }} className="text-gray-400 line-through">{item.oldPrice}</Text>
                              {(order.quantity && order.quantity > 1) && (
                                <View style={{ paddingHorizontal: scale(8), paddingVertical: verticalScale(2), borderRadius: scale(6) }} className="bg-green-50 border border-green-100">
                                  <Text style={{ fontSize: moderateScale(10) }} className="text-brandPrimary font-bold">Qty: {order.quantity}</Text>
                                </View>
                              )}
                            </View>
                            <View style={{ paddingHorizontal: scale(8), paddingVertical: verticalScale(2), borderRadius: scale(4) }} className={`self-start border ${isOrdered ? 'bg-orange-50 border-orange-100' : 'bg-[#E1F0E8] border-brandPrimary/20'}`}>
                              <Text style={{ fontSize: moderateScale(10) }} className={`font-bold ${isOrdered ? 'text-orange-600' : 'text-brandPrimary'}`}>
                                {isOrdered ? 'Status: Ordered' : 'Status: Ready for pickup'}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <View style={{ marginTop: verticalScale(16), paddingTop: verticalScale(16) }} className="border-t border-gray-100 flex-row justify-between items-center">
                          <Text style={{ fontSize: moderateScale(11), letterSpacing: 1 }} className="font-bold text-gray-500 uppercase">
                            Order #{order.id.substring(0, 8).toUpperCase()}
                          </Text>
                          <View style={{ gap: scale(8) }} className="flex-row">
                            <Pressable
                              onPress={() => router.push(`/chat/${order.id}` as any)}
                              style={{ padding: scale(8), borderRadius: scale(12) }}
                              className="bg-gray-100 items-center justify-center relative"
                            >
                              <MessageSquare size={scale(20)} color="#374151" />
                              {order.hasUnreadSeller && (
                                <View style={{ width: scale(10), height: scale(10), top: verticalScale(-3), right: scale(-3) }} className="absolute bg-red-500 rounded-full border border-white" />
                              )}
                            </Pressable>
                            <Pressable
                              onPress={() => handleUpdateOrderStatus(order.id, isOrdered ? 'ready' : 'completed')}
                              style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(8), borderRadius: scale(12) }}
                              className="bg-brandPrimary flex-row items-center"
                            >
                              {isOrdered ? <QrCode size={scale(16)} color="white" style={{ marginRight: scale(6) }} /> : <CheckCircle size={scale(16)} color="white" style={{ marginRight: scale(6) }} />}
                              <Text style={{ fontSize: moderateScale(13) }} className="text-white font-bold">{isOrdered ? 'Mark Ready' : 'Mark Completed'}</Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {completedOrders.length > 0 && (
              <View style={{ marginBottom: verticalScale(24) }}>
                <Text style={{ fontSize: moderateScale(16), marginBottom: verticalScale(12) }} className="text-gray-900 font-bold">Completed Orders</Text>
                <View>
                  {completedOrders.map((order) => {
                    const item = order.itemData || {};
                    return (
                      <View
                        key={order.id}
                        style={{ padding: scale(16), marginBottom: verticalScale(16), borderRadius: scale(24) }}
                        className="bg-white flex-col border border-gray-200 shadow-sm opacity-80"
                      >
                        <View className="flex-row">
                          <View style={{ width: scale(80), height: scale(80), borderRadius: scale(16) }} className="bg-gray-100 items-center justify-center overflow-hidden">
                            <Text style={{ fontSize: moderateScale(28) }}>{CATEGORY_ICONS[item.category] || '🏷️'}</Text>
                          </View>
                          <View style={{ marginLeft: scale(16) }} className="flex-1 justify-center">
                            <Text style={{ fontSize: moderateScale(16), marginBottom: verticalScale(4) }} className="font-bold text-gray-500" numberOfLines={1}>{item.title}</Text>
                            <View style={{ gap: scale(8), marginBottom: verticalScale(8) }} className="flex-row items-center">
                              <Text style={{ fontSize: moderateScale(13) }} className="text-gray-500 font-bold">{item.price}</Text>
                              <Text style={{ fontSize: moderateScale(11) }} className="text-gray-300 line-through">{item.oldPrice}</Text>
                              {(order.quantity && order.quantity > 1) && (
                                <View style={{ paddingHorizontal: scale(8), paddingVertical: verticalScale(2), borderRadius: scale(6) }} className="bg-gray-100 border border-gray-200">
                                  <Text style={{ fontSize: moderateScale(10) }} className="text-gray-500 font-bold">Qty: {order.quantity}</Text>
                                </View>
                              )}
                            </View>
                            <View style={{ paddingHorizontal: scale(8), paddingVertical: verticalScale(2), borderRadius: scale(4) }} className="self-start border bg-[#E1F0E8] border-brandPrimary/20">
                              <Text style={{ fontSize: moderateScale(10) }} className="font-bold text-brandPrimary">
                                Status: Completed
                              </Text>
                            </View>
                          </View>
                        </View>
                        <View style={{ marginTop: verticalScale(16), paddingTop: verticalScale(16) }} className="border-t border-gray-100 flex-row justify-between items-center">
                          <Text style={{ fontSize: moderateScale(11), letterSpacing: 1 }} className="font-bold text-gray-400 uppercase">
                            Order #{order.id.substring(0, 8).toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
            <View style={{ height: verticalScale(40) }} />
          </ScrollView>
        ) : (
          <View style={{ paddingBottom: verticalScale(48) }} className="flex-1 items-center justify-center">
            <View style={{ width: scale(96), height: scale(96), borderRadius: scale(40), marginBottom: verticalScale(24) }} className="bg-brandPrimary-soft items-center justify-center">
              <CheckCircle size={scale(48)} color="#1B7A49" />
            </View>
            <Text style={{ fontSize: moderateScale(22), marginBottom: verticalScale(12) }} className="font-bold text-gray-900">No orders yet</Text>
            <Text style={{ fontSize: moderateScale(15), marginBottom: verticalScale(40), paddingHorizontal: scale(40) }} className="text-gray-500 text-center leading-relaxed">
              When buyers reserve your items, their orders will appear here.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
