import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, doc, onSnapshot, query, updateDoc, where, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseLib';
import { useAppStore } from '@/store/app-store';
import { CATEGORY_ICONS } from '@/lib/constants';
import { CheckCircle, QrCode } from 'lucide-react-native';

export default function SellerOrdersScreen() {
  const user = useAppStore(state => state.user);
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
      <View className="flex-1 px-6 pt-6">
        <View className="mb-8">
          <Text className="text-brandPrimary font-semibold text-xs tracking-widest uppercase mb-1">Store Management</Text>
          <Text className="text-3xl font-bold text-gray-900">Orders</Text>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#1B7A49" size="large" />
          </View>
        ) : orders.length > 0 ? (
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            {pendingOrders.length > 0 && (
              <View className="mb-6">
                <Text className="text-gray-900 font-bold text-lg mb-3">Pending Orders</Text>
                <View>
                  {pendingOrders.map((order) => {
                    const item = order.itemData || {};
                    const isOrdered = order.status === 'ordered';
                    return (
                      <View
                        key={order.id}
                        className="bg-white rounded-3xl p-4 mb-4 flex-col border border-brandPrimary/30 shadow-sm"
                      >
                        <View className="flex-row">
                          <View className="w-20 h-20 bg-brandPrimary-soft rounded-2xl items-center justify-center overflow-hidden">
                            <Text className="text-3xl">{CATEGORY_ICONS[item.category] || '🏷️'}</Text>
                          </View>
                          <View className="flex-1 ml-4 justify-center">
                            <Text className="text-lg font-bold text-gray-900 mb-1" numberOfLines={1}>{item.title}</Text>
                            <View className="flex-row items-center gap-2 mb-2">
                              <Text className="text-brandPrimary font-bold">{item.price}</Text>
                              <Text className="text-gray-400 line-through text-xs">{item.oldPrice}</Text>
                              {(order.quantity && order.quantity > 1) && (
                                <View className="bg-green-50 px-2 py-0.5 rounded-md border border-green-100">
                                  <Text className="text-brandPrimary text-[10px] font-bold">Qty: {order.quantity}</Text>
                                </View>
                              )}
                            </View>
                            <View className={`self-start px-2 py-0.5 rounded border ${isOrdered ? 'bg-orange-50 border-orange-100' : 'bg-[#E1F0E8] border-brandPrimary/20'}`}>
                              <Text className={`text-[10px] font-bold ${isOrdered ? 'text-orange-600' : 'text-brandPrimary'}`}>
                                {isOrdered ? 'Status: Ordered' : 'Status: Ready for pickup'}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <View className="mt-4 pt-4 border-t border-gray-100 flex-row justify-between items-center">
                          <Text className="font-bold text-gray-500 text-xs uppercase tracking-widest">
                            Order #{order.id.substring(0, 8).toUpperCase()}
                          </Text>
                          <Pressable
                            onPress={() => handleUpdateOrderStatus(order.id, isOrdered ? 'ready' : 'completed')}
                            className="bg-brandPrimary px-4 py-2 rounded-xl flex-row items-center"
                          >
                            {isOrdered ? <QrCode size={16} color="white" className="mr-1.5" /> : <CheckCircle size={16} color="white" className="mr-1.5" />}
                            <Text className="text-white font-bold text-sm">{isOrdered ? 'Mark Ready' : 'Mark Completed'}</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {completedOrders.length > 0 && (
              <View className="mb-6">
                <Text className="text-gray-900 font-bold text-lg mb-3">Completed Orders</Text>
                <View>
                  {completedOrders.map((order) => {
                    const item = order.itemData || {};
                    return (
                      <View
                        key={order.id}
                        className="bg-white rounded-3xl p-4 mb-4 flex-col border border-gray-200 shadow-sm opacity-80"
                      >
                        <View className="flex-row">
                          <View className="w-20 h-20 bg-gray-100 rounded-2xl items-center justify-center overflow-hidden">
                            <Text className="text-3xl">{CATEGORY_ICONS[item.category] || '🏷️'}</Text>
                          </View>
                          <View className="flex-1 ml-4 justify-center">
                            <Text className="text-lg font-bold text-gray-500 mb-1" numberOfLines={1}>{item.title}</Text>
                            <View className="flex-row items-center gap-2 mb-2">
                              <Text className="text-gray-500 font-bold">{item.price}</Text>
                              <Text className="text-gray-300 line-through text-xs">{item.oldPrice}</Text>
                              {(order.quantity && order.quantity > 1) && (
                                <View className="bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                                  <Text className="text-gray-500 text-[10px] font-bold">Qty: {order.quantity}</Text>
                                </View>
                              )}
                            </View>
                            <View className="self-start px-2 py-0.5 rounded border bg-[#E1F0E8] border-brandPrimary/20">
                              <Text className="text-[10px] font-bold text-brandPrimary">
                                Status: Completed
                              </Text>
                            </View>
                          </View>
                        </View>
                        <View className="mt-4 pt-4 border-t border-gray-100 flex-row justify-between items-center">
                          <Text className="font-bold text-gray-400 text-xs uppercase tracking-widest">
                            Order #{order.id.substring(0, 8).toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
            <View className="h-10" />
          </ScrollView>
        ) : (
          <View className="flex-1 items-center justify-center pb-12">
            <View className="w-24 h-24 bg-brandPrimary-soft rounded-[40px] items-center justify-center mb-6">
              <CheckCircle size={48} color="#1B7A49" />
            </View>
            <Text className="text-2xl font-bold text-gray-900 mb-3">No orders yet</Text>
            <Text className="text-gray-500 text-center mb-10 px-10 leading-relaxed">
              When buyers reserve your items, their orders will appear here.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
