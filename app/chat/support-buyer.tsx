import { ArrowLeft, Send, RefreshCw, Package, CreditCard, User as UserIcon } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { scale, verticalScale, moderateScale } from '@/lib/responsive';
import { useAppStore } from '@/store/app-store';

export default function SupportBuyerScreen() {
  const router = useRouter();
  const user = useAppStore(state => state.user);
  const [inputText, setInputText] = useState('');
  
  const [messages, setMessages] = useState<any[]>([
    {
      id: '1',
      text: "Hi! I'm your DayofTaste assistant.\nHow can I help today?",
      senderId: 'bot',
      createdAt: { seconds: Date.now() / 1000 - 60 }
    },
    {
      id: '2',
      text: "My store was closed when I arrived.",
      senderId: user?.uid || 'user1',
      createdAt: { seconds: Date.now() / 1000 - 30 }
    },
    {
      id: '3',
      text: "I'm sorry about that.\nI can help you request a refund or contact the seller.\nWhich would you prefer?",
      senderId: 'bot',
      createdAt: { seconds: Date.now() / 1000 }
    }
  ]);

  const flatListRef = useRef<FlatList>(null);

  const sendMessage = () => {
    if (!inputText.trim()) return;
    
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: inputText.trim(),
      senderId: user?.uid || 'user1',
      createdAt: { seconds: Date.now() / 1000 }
    }]);
    
    setInputText('');
  };

  const handleQuickReply = (text: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text,
      senderId: user?.uid || 'user1',
      createdAt: { seconds: Date.now() / 1000 }
    }]);
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.senderId === user?.uid || item.senderId === 'user1';

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
          <View className="flex-row items-center">
            <Text style={{ fontSize: moderateScale(20) }} className="font-bold text-gray-900" numberOfLines={1}>
              DayofTaste AI
            </Text>
            <View style={{ paddingHorizontal: scale(6), paddingVertical: verticalScale(2), borderRadius: scale(6), marginLeft: scale(8) }} className="bg-[#E1F0E8]">
              <Text style={{ fontSize: moderateScale(10) }} className="text-[#1B7A49] font-bold">AI</Text>
            </View>
          </View>
          <Text style={{ fontSize: moderateScale(12), marginTop: verticalScale(2) }} className="text-gray-500">Here to help 24/7</Text>
        </View>
        <View style={{ width: scale(40) }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: scale(16), paddingBottom: verticalScale(24) }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={() => (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale(8), marginTop: verticalScale(8) }}>
              <Pressable onPress={() => handleQuickReply('Refund')} style={{ paddingHorizontal: scale(12), paddingVertical: verticalScale(10), borderRadius: scale(12) }} className="border border-gray-200 flex-row items-center bg-white active:bg-gray-50">
                <RefreshCw size={scale(16)} color="#1B7A49" />
                <Text style={{ fontSize: moderateScale(13), marginLeft: scale(8) }} className="font-medium text-gray-700">Refund</Text>
              </Pressable>
              
              <Pressable onPress={() => handleQuickReply('Order issue')} style={{ paddingHorizontal: scale(12), paddingVertical: verticalScale(10), borderRadius: scale(12) }} className="border border-gray-200 flex-row items-center bg-white active:bg-gray-50">
                <Package size={scale(16)} color="#1B7A49" />
                <Text style={{ fontSize: moderateScale(13), marginLeft: scale(8) }} className="font-medium text-gray-700">Order issue</Text>
              </Pressable>
              
              <Pressable onPress={() => handleQuickReply('Payment help')} style={{ paddingHorizontal: scale(12), paddingVertical: verticalScale(10), borderRadius: scale(12) }} className="border border-gray-200 flex-row items-center bg-white active:bg-gray-50">
                <CreditCard size={scale(16)} color="#1B7A49" />
                <Text style={{ fontSize: moderateScale(13), marginLeft: scale(8) }} className="font-medium text-gray-700">Payment help</Text>
              </Pressable>

              <Pressable onPress={() => handleQuickReply('Talk to human')} style={{ paddingHorizontal: scale(12), paddingVertical: verticalScale(10), borderRadius: scale(12) }} className="border border-gray-200 flex-row items-center bg-white active:bg-gray-50">
                <UserIcon size={scale(16)} color="#1B7A49" />
                <Text style={{ fontSize: moderateScale(13), marginLeft: scale(8) }} className="font-medium text-gray-700">Talk to human</Text>
              </Pressable>
            </View>
          )}
        />

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
