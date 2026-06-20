import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db } from '@/lib/firebaseLib';
import { collection, doc, addDoc, onSnapshot, query, orderBy, serverTimestamp, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { useAppStore } from '@/store/app-store';
import { ArrowLeft, Send, MessageSquare } from 'lucide-react-native';

export default function ChatScreen() {
  const { orderId } = useLocalSearchParams();
  const router = useRouter();
  const user = useAppStore(state => state.user);
  
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatInfo, setChatInfo] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!orderId || !user) return;

    // Fetch order/chat info initially
    const fetchChatInfo = async () => {
      const orderRef = doc(db, 'orders', orderId as string);
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        let fetchedStoreName = orderData.itemData?.store || 'Store';
        
        // Fetch seller details to get the actual store name
        if (orderData.sellerId) {
          const sellerSnap = await getDoc(doc(db, 'users', orderData.sellerId));
          if (sellerSnap.exists() && sellerSnap.data().storeName) {
            fetchedStoreName = sellerSnap.data().storeName;
          }
        }

        setChatInfo({
          storeName: fetchedStoreName,
          buyerId: orderData.buyerId,
          sellerId: orderData.sellerId,
        });

        // Clear unread flag for current user
        const isSeller = user.uid === orderData.sellerId;
        updateDoc(orderRef, {
          [isSeller ? 'hasUnreadSeller' : 'hasUnreadBuyer']: false
        }).catch(err => console.log('Error clearing unread flag:', err));
      }
    };
    fetchChatInfo();

    // Listen to messages
    const q = query(
      collection(db, 'chats', orderId as string, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId, user]);

  const sendMessage = async () => {
    if (!inputText.trim() || !user || !orderId) return;

    const text = inputText.trim();
    setInputText('');

    try {
      // Add message to subcollection
      await addDoc(collection(db, 'chats', orderId as string, 'messages'), {
        text,
        senderId: user.uid,
        createdAt: serverTimestamp(),
      });

      // Update parent chat document
      await setDoc(doc(db, 'chats', orderId as string), {
        orderId,
        lastMessage: text,
        lastMessageTime: serverTimestamp(),
        buyerId: chatInfo?.buyerId || user.uid,
        sellerId: chatInfo?.sellerId || '',
        storeName: chatInfo?.storeName || 'Store'
      }, { merge: true });

      // Set unread flag for the recipient
      const isSeller = user.uid === chatInfo?.sellerId;
      await updateDoc(doc(db, 'orders', orderId as string), {
        [isSeller ? 'hasUnreadBuyer' : 'hasUnreadSeller']: true
      });

    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.senderId === user?.uid;

    return (
      <View className={`mb-3 max-w-[80%] ${isMe ? 'self-end' : 'self-start'}`}>
        <View className={`px-4 py-3 rounded-2xl ${isMe ? 'bg-brandPrimary rounded-tr-sm' : 'bg-white border border-gray-100 rounded-tl-sm shadow-sm'}`}>
          <Text className={`text-[15px] ${isMe ? 'text-white' : 'text-gray-800'}`}>
            {item.text}
          </Text>
        </View>
        <Text className={`text-[10px] text-gray-400 mt-1 mx-1 ${isMe ? 'text-right' : 'text-left'}`}>
          {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAF5]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4 relative z-10 bg-[#FAFAF5]">
        <Pressable onPress={() => router.back()} className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm z-10">
          <ArrowLeft size={20} color="#374151" />
        </Pressable>
        <View className="absolute left-0 right-0 items-center pointer-events-none">
          {user?.uid === chatInfo?.sellerId ? (
            <Text className="text-xl font-bold text-gray-900" numberOfLines={1}>
              Order #{String(orderId).substring(0, 8).toUpperCase()}
            </Text>
          ) : (
            <>
              <Text className="text-xl font-bold text-gray-900" numberOfLines={1}>
                {chatInfo?.storeName || 'Loading...'}
              </Text>
              <Text className="text-xs text-gray-500 mt-0.5">Order #{String(orderId).substring(0, 8).toUpperCase()}</Text>
            </>
          )}
        </View>
        <View className="w-10" />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#1B7A49" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View className="items-center justify-center py-10 mt-10">
                <MessageSquare size={48} color="#D1D5DB" />
                <Text className="text-gray-400 mt-4 font-medium text-base">No messages yet</Text>
                <Text className="text-gray-400 text-xs mt-1 text-center px-8">Send a message to start the conversation</Text>
              </View>
            }
          />
        )}

        {/* Input Area */}
        <View className="px-4 pt-3 pb-8 bg-white border-t border-gray-100 flex-row items-end">
          <View className="flex-1 bg-gray-50 border border-gray-200 rounded-3xl min-h-[48px] max-h-[120px] px-4 py-3 mr-3 flex-row items-center">
            <TextInput
              style={{ flex: 1, fontSize: 16, color: '#1F2937', padding: 0 }}
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
          </View>
          <Pressable 
            onPress={sendMessage}
            disabled={!inputText.trim()}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 2,
              backgroundColor: inputText.trim() ? '#1B7A49' : '#E5E7EB',
            }}
          >
            <Send size={20} color={inputText.trim() ? "white" : "#9CA3AF"} style={{ marginLeft: 2 }} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
