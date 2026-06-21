import { db } from '@/lib/firebaseLib';
import { moderateScale, scale, verticalScale } from '@/lib/responsive';
import { useAppStore } from '@/store/app-store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { ArrowLeft, MessageSquare, Send } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
      <View style={{ marginBottom: verticalScale(12), maxWidth: '80%' }} className={`${isMe ? 'self-end' : 'self-start'}`}>
        <View style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(12), borderRadius: scale(16) }} className={`${isMe ? 'bg-brandPrimary rounded-tr-sm' : 'bg-white border border-gray-100 rounded-tl-sm shadow-sm'}`}>
          <Text style={{ fontSize: moderateScale(16) }} className={`${isMe ? 'text-white' : 'text-gray-800'}`}>
            {item.text}
          </Text>
        </View>
        <Text style={{ fontSize: moderateScale(11), marginTop: verticalScale(4), marginHorizontal: scale(4) }} className={`text-gray-400 ${isMe ? 'text-right' : 'text-left'}`}>
          {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAF5]" edges={['top']}>
      {/* Header */}
      <View style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(16) }} className="flex-row items-center justify-between relative z-10 bg-[#FAFAF5]">
        <Pressable onPress={() => router.back()} style={{ width: scale(40), height: scale(40), borderRadius: scale(20) }} className="bg-white items-center justify-center shadow-sm z-10">
          <ArrowLeft size={scale(20)} color="#374151" />
        </Pressable>
        <View className="absolute left-0 right-0 items-center pointer-events-none">
          {user?.uid === chatInfo?.sellerId ? (
            <Text style={{ fontSize: moderateScale(20) }} className="font-bold text-gray-900" numberOfLines={1}>
              Order #{String(orderId).substring(0, 8).toUpperCase()}
            </Text>
          ) : (
            <>
              <Text style={{ fontSize: moderateScale(20) }} className="font-bold text-gray-900" numberOfLines={1}>
                {chatInfo?.storeName || 'Loading...'}
              </Text>
              <Text style={{ fontSize: moderateScale(12), marginTop: verticalScale(2) }} className="text-gray-500">Order #{String(orderId).substring(0, 8).toUpperCase()}</Text>
            </>
          )}
        </View>
        <View style={{ width: scale(40) }} />
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
            contentContainerStyle={{ padding: scale(16), paddingBottom: verticalScale(24) }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={{ paddingVertical: verticalScale(40), marginTop: verticalScale(40) }} className="items-center justify-center">
                <MessageSquare size={scale(48)} color="#D1D5DB" />
                <Text style={{ fontSize: moderateScale(16), marginTop: verticalScale(16) }} className="text-gray-400 font-medium">No messages yet</Text>
                <Text style={{ fontSize: moderateScale(13), marginTop: verticalScale(4), paddingHorizontal: scale(32) }} className="text-gray-400 text-center">Send a message to start the conversation</Text>
              </View>
            }
          />
        )}

        {/* Input Area */}
        <View style={{ paddingHorizontal: scale(16), paddingTop: verticalScale(12), paddingBottom: verticalScale(22) }} className="bg-white border-t border-gray-100 flex-row items-end">
          <View style={{ minHeight: verticalScale(48), maxHeight: verticalScale(120), paddingHorizontal: scale(16), paddingVertical: verticalScale(12), marginRight: scale(12), borderRadius: scale(24) }} className="flex-1 bg-gray-50 border border-gray-200 flex-row items-center">
            <TextInput
              style={{ flex: 1, fontSize: moderateScale(16), color: '#1F2937', padding: 0 }}
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
              width: scale(48),
              height: scale(48),
              borderRadius: scale(24),
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: verticalScale(2),
              backgroundColor: inputText.trim() ? '#1B7A49' : '#E5E7EB',
            }}
          >
            <Send size={scale(20)} color={inputText.trim() ? "white" : "#9CA3AF"} style={{ marginLeft: scale(2) }} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
