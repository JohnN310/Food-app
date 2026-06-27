import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Pressable, Animated, Dimensions, KeyboardAvoidingView, Platform, Modal, ScrollView, TextInput, ActivityIndicator, Alert, ActionSheetIOS } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, MoreVertical, Plus, CreditCard, X, CheckCircle2, Lock, User, ShieldCheck } from 'lucide-react-native';
import { StripeProvider, CardField, useStripe } from '@stripe/stripe-react-native';
import { useAppStore } from '@/store/app-store';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, functions, auth } from '@/lib/firebaseLib';
import { httpsCallable } from 'firebase/functions';
import { scale, verticalScale, moderateScale } from '@/lib/responsive';
import { cn } from '@/lib/utils';

const { height } = Dimensions.get('window');

type Card = {
  id: string;
  brand: string;
  last4: string;
  expiry: string;
  isPrimary: boolean;
  name?: string;
};

export default function PaymentMethodsScreen() {
  const router = useRouter();
  
  // Mock State
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const user = useAppStore(state => state.user);

  useEffect(() => {
    const loadCards = async () => {
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.paymentMethods && Array.isArray(data.paymentMethods)) {
            setCards(data.paymentMethods);
          } else {
            setCards([]);
          }
        } else {
          setCards([]);
        }
      } catch (e) {
        console.error("Failed to load cards", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadCards();
  }, [user?.uid]);

  const updateCards = async (newCards: Card[]) => {
    setCards(newCards);
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { paymentMethods: newCards });
    } catch (e) {
      console.error("Failed to save cards to Firestore", e);
    }
  };
  
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isCardModalVisible, setIsCardModalVisible] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [isTokenizing, setIsTokenizing] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [newCardDetails, setNewCardDetails] = useState<any>(null);
  
  const [newCardName, setNewCardName] = useState('');
  const [isPrimaryCard, setIsPrimaryCard] = useState(true);
  const { confirmSetupIntent } = useStripe();

  // Modal Animations
  const slideAnim = useRef(new Animated.Value(height)).current;
  const cardScaleAnim = useRef(new Animated.Value(0.8)).current;

  const openCardModal = (card: Card) => {
    setSelectedCard(card);
    setIsCardModalVisible(true);
    Animated.spring(cardScaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const closeCardModal = () => {
    Animated.timing(cardScaleAnim, {
      toValue: 0.8,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setIsCardModalVisible(false);
      setSelectedCard(null);
      setIsDropdownVisible(false);
    });
  };

  const openAddModal = () => {
    setIsAddingCard(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 14
    }).start();
  };

  const closeAddModal = () => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setIsAddingCard(false);
      // Reset form
      setNewCardName('');
      setCardComplete(false);
      setIsPrimaryCard(true);
    });
  };

  const handleSaveCard = async () => {
    if (!cardComplete) return;
    
    setIsTokenizing(true);
    
    try {
      // 1. Call Cloud Function to get SetupIntent client secret
      const idToken = await auth.currentUser?.getIdToken(true);
      const createSetupIntent = httpsCallable(functions, 'createSetupIntent');
      const response = await createSetupIntent({ token: idToken });
      const { clientSecret } = response.data as { clientSecret: string };

      if (!clientSecret) {
        throw new Error("Failed to initialize setup intent.");
      }

      // 2. Confirm the SetupIntent using Stripe SDK
      const { setupIntent, error } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: 'Card',
        paymentMethodData: {
          billingDetails: {
            name: newCardName || undefined,
          }
        },
      });

      if (error) {
        Alert.alert('Error', error.message);
        setIsTokenizing(false);
        return;
      }

      if (setupIntent && setupIntent.paymentMethod) {
        // If successful, the card is now saved to the Stripe Customer.
        // We will fetch the card details from the payment method object (or we can just mock it for now since we don't have the full object returned without fetching from API)
        // For simplicity, we just add a placeholder or fetch it. Actually, setupIntent might not contain the full card details on the client side for security reasons.
        // Let's add a generic entry since we know it succeeded, or just fetch the user's cards from the backend later.
        // As a fallback, we'll save it to Firestore as before.
        
        const newCard: Card = {
          id: setupIntent.paymentMethod.id || Math.random().toString(), 
          brand: newCardDetails?.brand || 'Saved Card',
          last4: newCardDetails?.last4 || '****',
          expiry: newCardDetails?.expiryMonth && newCardDetails?.expiryYear 
            ? `${newCardDetails.expiryMonth.toString().padStart(2, '0')}/${newCardDetails.expiryYear.toString().slice(-2)}` 
            : '**/**',
          isPrimary: cards.length === 0 ? true : isPrimaryCard,
          name: newCardName || user?.displayName || "CARDHOLDER",
        };
        
        let updatedCards = [...cards];
        if (newCard.isPrimary) {
          updatedCards = updatedCards.map(c => ({ ...c, isPrimary: false }));
        }
        updatedCards.push(newCard);
        
        updateCards(updatedCards);
        closeAddModal();
        Alert.alert("Success", "Card saved successfully!");
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'An error occurred while saving the card.');
    }
    
    setIsTokenizing(false);
  };

  const makePrimary = (id: string) => {
    updateCards(cards.map(c => ({ ...c, isPrimary: c.id === id })));
    setIsDropdownVisible(false);
  };

  const removeCard = async (id: string) => {
    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      const detachPaymentMethod = httpsCallable(functions, 'detachPaymentMethod');
      await detachPaymentMethod({ paymentMethodId: id, token: idToken });
      
      const updatedCards = cards.filter(c => c.id !== id);
      // If we removed the primary, make the first remaining card primary
      if (updatedCards.length > 0 && !updatedCards.some(c => c.isPrimary)) {
        updatedCards[0].isPrimary = true;
      }
      updateCards(updatedCards);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to remove card from Stripe.');
    }
  };

  const confirmRemoveCard = (id: string) => {
    setIsDropdownVisible(false);
    if (Platform.OS === 'web') {
      const confirm = window.confirm("Are you sure you want to remove this payment method? This action cannot be undone.");
      if (confirm) {
        removeCard(id);
      }
    } else {
      Alert.alert(
        "Remove Card",
        "Are you sure you want to remove this payment method? This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Remove", onPress: () => removeCard(id), style: "destructive" }
        ]
      );
    }
  };

  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""}>
      <SafeAreaView edges={['top']} className="flex-1 bg-[#FAFAF5]">
      {/* Header */}
      <View 
        style={{ 
          height: verticalScale(56), 
          paddingHorizontal: scale(20), 
          zIndex: 50, 
          elevation: 10 
        }} 
        className="flex-row items-center justify-between"
      >
        <Pressable 
          onPress={() => router.back()}
          style={{ 
            width: scale(40), 
            height: scale(40),
            borderRadius: scale(20),
          }}
          className="bg-white items-center justify-center shadow-sm"
        >
          <ArrowLeft size={scale(20)} color="#374151" />
        </Pressable>

        <Text style={{ fontSize: moderateScale(18) }} className="font-bold text-gray-900">
          Payment methods
        </Text>

        <View style={{ width: scale(40), height: scale(40) }} /> 
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#1B7A49" />
        </View>
      ) : (
        <ScrollView 
          style={{ flex: 1, paddingHorizontal: scale(20), paddingTop: verticalScale(16) }}
          keyboardShouldPersistTaps="handled"
        >
          {cards.length === 0 ? (
            /* Empty State Card */
            <View 
              style={{ 
                width: '100%',
                aspectRatio: 1.586,
                borderRadius: scale(24),
                marginBottom: verticalScale(24),
                borderWidth: 2,
                borderColor: '#E8F5E9',
                borderStyle: 'dashed',
              }} 
              className="bg-white shadow-sm items-center justify-center"
            >
              <TouchableOpacity 
                activeOpacity={0.8}
                style={{ 
                  width: scale(80), 
                  height: scale(80), 
                  borderRadius: scale(40),
                  backgroundColor: '#E8F5E9'
                }} 
                className="items-center justify-center mb-4"
                onPress={openAddModal}
              >
                <Plus size={scale(36)} color="#1B7A49" strokeWidth={2.5} />
              </TouchableOpacity>
              <Text style={{ fontSize: moderateScale(16) }} className="font-bold text-gray-900">
                No payment methods yet
              </Text>
            </View>
          ) : (
            /* List of Cards */
            <View style={{ marginBottom: verticalScale(24) }}>
              {cards.map(card => (
                <Pressable 
                  key={card.id}
                  onPress={() => openCardModal(card)}
                  style={{ 
                    width: '100%',
                    aspectRatio: 1.586,
                    borderRadius: scale(24),
                    marginBottom: verticalScale(16),
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 10,
                    elevation: 2,
                  }}
                  className={`${card.isPrimary ? 'bg-[#1B7A49]' : 'bg-[#1F2937]'}`}
                >
                  {/* Decorative Glass Background Elements */}
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', borderRadius: scale(24) }}>
                    <View 
                      style={{
                        position: 'absolute',
                        top: -scale(40),
                        right: -scale(20),
                        width: scale(160),
                        height: scale(160),
                        borderRadius: scale(80),
                        backgroundColor: 'rgba(255,255,255,0.08)',
                      }}
                    />
                    <View 
                      style={{
                        position: 'absolute',
                        bottom: -scale(60),
                        left: -scale(30),
                        width: scale(200),
                        height: scale(200),
                        borderRadius: scale(100),
                        backgroundColor: 'rgba(255,255,255,0.04)',
                      }}
                    />
                  </View>

                  <View style={{ flex: 1, padding: scale(24), justifyContent: 'space-between' }}>
                    <View className="flex-row justify-between items-start">
                      {/* Chip icon */}
                      <View style={{ width: scale(42), height: scale(32), borderRadius: scale(6), backgroundColor: '#E5E7EB' }} className="items-center justify-center overflow-hidden">
                        <View style={{ width: '100%', height: '100%', borderWidth: 1, borderColor: '#9CA3AF', opacity: 0.5, borderRadius: scale(6) }} />
                        <View style={{ position: 'absolute', width: '100%', height: 1, backgroundColor: '#9CA3AF', top: '50%', opacity: 0.5 }} />
                        <View style={{ position: 'absolute', width: 1, height: '100%', backgroundColor: '#9CA3AF', left: '30%', opacity: 0.5 }} />
                        <View style={{ position: 'absolute', width: 1, height: '100%', backgroundColor: '#9CA3AF', right: '30%', opacity: 0.5 }} />
                      </View>

                      {/* Brand Name */}
                      <Text style={{ fontSize: moderateScale(20), fontStyle: 'italic' }} className="text-white font-bold tracking-wider">
                        {card.brand === 'Saved Card' ? 'CARD' : card.brand.toUpperCase()}
                      </Text>
                    </View>

                    <View className="mt-auto mb-6">
                      <Text style={{ fontSize: moderateScale(22), letterSpacing: scale(4) }} className="text-white font-semibold shadow-sm">
                        •••• •••• •••• {card.last4}
                      </Text>
                    </View>

                    <View className="flex-row justify-between items-end">
                      <View>
                        <Text style={{ fontSize: moderateScale(10) }} className="text-white/70 uppercase tracking-widest mb-1">Cardholder Name</Text>
                        <Text style={{ fontSize: moderateScale(14) }} className="text-white font-medium uppercase tracking-wider">
                          {card.name || "CARDHOLDER"}
                        </Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: moderateScale(10) }} className="text-white/70 uppercase tracking-widest mb-1">Expiry</Text>
                        <Text style={{ fontSize: moderateScale(14) }} className="text-white font-medium tracking-wider">
                          {card.expiry}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}

              {/* Add New Card Button */}
              <Pressable 
                onPress={openAddModal}
                style={{ 
                  width: '100%',
                  aspectRatio: 1.586,
                  borderRadius: scale(24),
                  marginTop: verticalScale(8),
                  backgroundColor: 'rgba(255,255,255,0.6)'
                }} 
                className="border-2 border-gray-300 border-dashed items-center justify-center active:bg-gray-100/50"
              >
                <View style={{ width: scale(56), height: scale(56), borderRadius: scale(28) }} className="bg-white items-center justify-center shadow-sm mb-3">
                  <Plus size={scale(28)} color="#4B5563" />
                </View>
                <Text style={{ fontSize: moderateScale(15) }} className="font-bold text-gray-600 tracking-wide">Add new payment method</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}

      {/* 3D Card Detail Modal */}
      <Modal visible={isCardModalVisible} animationType="fade" transparent={true} onRequestClose={closeCardModal}>
        <View className="flex-1 bg-black/70 justify-center items-center">
          <Pressable style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} onPress={closeCardModal} />
          
          <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }} pointerEvents="box-none" className="z-50">
            <View 
              style={{ 
                height: verticalScale(56), 
                paddingHorizontal: scale(20), 
              }} 
              pointerEvents="box-none"
              className="flex-row justify-between items-center"
            >
              <Pressable onPress={closeCardModal} style={{ width: scale(40), height: scale(40), borderRadius: scale(20) }} className="bg-black/40 items-center justify-center">
                <X size={scale(20)} color="white" />
              </Pressable>
              
              <View>
                <Pressable onPress={() => setIsDropdownVisible(!isDropdownVisible)} style={{ width: scale(40), height: scale(40), borderRadius: scale(20) }} className="bg-black/40 items-center justify-center">
                  <MoreVertical size={scale(20)} color="white" />
                </Pressable>
                
                {/* Dropdown Menu */}
              {isDropdownVisible && selectedCard && (
                <View 
                  style={{ 
                    position: 'absolute', 
                    top: scale(52), 
                    right: 0, 
                    width: scale(180), 
                    borderRadius: scale(16),
                    elevation: 15,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 12,
                    paddingVertical: verticalScale(4)
                  }} 
                  className="bg-white z-50 pointer-events-auto"
                >
                  {!selectedCard.isPrimary && (
                    <>
                      <TouchableOpacity 
                        style={{ paddingLeft: scale(16), paddingRight: 0, paddingVertical: verticalScale(14) }}
                        onPress={() => {
                          makePrimary(selectedCard.id);
                          closeCardModal();
                        }}
                      >
                        <Text style={{ fontSize: moderateScale(16) }} className="text-gray-900 font-bold">Make primary</Text>
                      </TouchableOpacity>
                      <View style={{ height: 1, marginHorizontal: scale(16) }} className="bg-gray-100" />
                    </>
                  )}
                  <TouchableOpacity 
                    style={{ paddingLeft: scale(16), paddingRight: 0, paddingVertical: verticalScale(14) }}
                    onPress={() => {
                      closeCardModal();
                      setTimeout(() => confirmRemoveCard(selectedCard.id), 300);
                    }}
                  >
                    <Text style={{ fontSize: moderateScale(16) }} className="text-red-500 font-bold">Remove card</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </SafeAreaView>

          {selectedCard && (
            <Animated.View 
              style={{ 
                width: '100%',
                alignItems: 'center',
                transform: [
                  { scale: cardScaleAnim }
                ]
              }}
            >
              {/* Card Rendering */}
              <View 
                style={{ 
                  width: Dimensions.get('window').width - scale(40),
                  aspectRatio: 1.586,
                  borderRadius: scale(24),
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.4,
                  shadowRadius: 30,
                  elevation: 20,
                }}
                className={`${selectedCard.isPrimary ? 'bg-[#1B7A49]' : 'bg-[#1F2937]'}`}
              >
                {/* Decorative Glass Background Elements */}
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', borderRadius: scale(24) }}>
                  <View 
                    style={{
                      position: 'absolute',
                      top: -scale(40),
                      right: -scale(20),
                      width: scale(160),
                      height: scale(160),
                      borderRadius: scale(80),
                      backgroundColor: 'rgba(255,255,255,0.08)',
                    }}
                  />
                  <View 
                    style={{
                      position: 'absolute',
                      bottom: -scale(60),
                      left: -scale(30),
                      width: scale(200),
                      height: scale(200),
                      borderRadius: scale(100),
                      backgroundColor: 'rgba(255,255,255,0.04)',
                    }}
                  />
                </View>

                <View style={{ flex: 1, padding: scale(28), justifyContent: 'space-between' }}>
                  <View className="flex-row justify-between items-start">
                    <View style={{ width: scale(48), height: scale(36), borderRadius: scale(6), backgroundColor: '#E5E7EB' }} className="items-center justify-center overflow-hidden">
                      <View style={{ width: '100%', height: '100%', borderWidth: 1, borderColor: '#9CA3AF', opacity: 0.5, borderRadius: scale(6) }} />
                      <View style={{ position: 'absolute', width: '100%', height: 1, backgroundColor: '#9CA3AF', top: '50%', opacity: 0.5 }} />
                      <View style={{ position: 'absolute', width: 1, height: '100%', backgroundColor: '#9CA3AF', left: '30%', opacity: 0.5 }} />
                      <View style={{ position: 'absolute', width: 1, height: '100%', backgroundColor: '#9CA3AF', right: '30%', opacity: 0.5 }} />
                    </View>

                    <Text style={{ fontSize: moderateScale(22), fontStyle: 'italic' }} className="text-white font-bold tracking-wider">
                      {selectedCard.brand === 'Saved Card' ? 'CARD' : selectedCard.brand.toUpperCase()}
                    </Text>
                  </View>

                  <View className="mt-auto mb-8">
                    <Text style={{ fontSize: moderateScale(26), letterSpacing: scale(5) }} className="text-white font-semibold shadow-sm">
                      •••• •••• •••• {selectedCard.last4}
                    </Text>
                  </View>

                  <View className="flex-row justify-between items-end">
                    <View>
                      <Text style={{ fontSize: moderateScale(11) }} className="text-white/70 uppercase tracking-widest mb-1">Cardholder Name</Text>
                      <Text style={{ fontSize: moderateScale(16) }} className="text-white font-medium uppercase tracking-wider">
                        {selectedCard.name || "CARDHOLDER"}
                      </Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: moderateScale(11) }} className="text-white/70 uppercase tracking-widest mb-1">Expiry</Text>
                      <Text style={{ fontSize: moderateScale(16) }} className="text-white font-medium tracking-wider">
                        {selectedCard.expiry}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

            </Animated.View>
          )}
        </View>
      </Modal>

      {/* Add Card Modal */}
      <Modal visible={isAddingCard} animationType="fade" transparent={true} onRequestClose={closeAddModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end">
          <Pressable
            style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
            className="bg-black/50"
            onPress={closeAddModal}
          />
          <Animated.View
            style={{ transform: [{ translateY: slideAnim }], maxHeight: '90%' }}
            className="bg-white rounded-t-[32px] pt-2 pb-10 shadow-2xl"
          >
            {/* Drag Handle Indicator */}
            <View className="items-center mb-2">
              <View style={{ width: scale(40), height: scale(4), borderRadius: scale(2) }} className="bg-gray-300" />
            </View>

            <View style={{ paddingHorizontal: scale(24), paddingTop: verticalScale(12), paddingBottom: verticalScale(16), marginBottom: verticalScale(8) }} className="flex-row items-start justify-between">
              <View className="flex-row items-center flex-1 pr-4">
                <View style={{ width: scale(40), height: scale(40), borderRadius: scale(12) }} className="bg-[#F0FDF4] items-center justify-center mr-3">
                  <Lock size={scale(20)} color="#166534" />
                </View>
                <View>
                  <Text style={{ fontSize: moderateScale(22) }} className="font-bold text-gray-900">Add New Card</Text>
                  <Text style={{ fontSize: moderateScale(12), marginTop: verticalScale(2) }} className="text-gray-500">Your payment info is secure and encrypted</Text>
                </View>
              </View>
              <Pressable onPress={closeAddModal} style={{ width: scale(36), height: scale(36) }} className="bg-gray-100 rounded-full items-center justify-center">
                <X size={scale(18)} color="#4B5563" />
              </Pressable>
            </View>
            <ScrollView style={{ paddingHorizontal: scale(24) }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              <Text style={{ fontSize: moderateScale(14), marginBottom: verticalScale(8) }} className="text-gray-500 font-semibold">Cardholder Name</Text>
              <View style={{ paddingHorizontal: scale(16), paddingVertical: verticalScale(14), marginBottom: verticalScale(20), borderRadius: scale(8) }} className="bg-white border border-gray-200 flex-row items-center">
                <User size={scale(20)} color="#166534" style={{ marginRight: scale(12) }} />
                <TextInput 
                  value={newCardName} 
                  onChangeText={setNewCardName} 
                  placeholder="John Smith" 
                  placeholderTextColor="#9CA3AF" 
                  style={{ fontSize: moderateScale(16), flex: 1 }} 
                  className="text-gray-900" 
                />
              </View>

              <Text style={{ fontSize: moderateScale(14), marginBottom: verticalScale(8) }} className="text-gray-500 font-semibold">Card Number</Text>
              <CardField
                postalCodeEnabled={false}
                onCardChange={(cardDetails) => {
                  setCardComplete(cardDetails.complete);
                  if (cardDetails.complete) {
                    setNewCardDetails(cardDetails);
                  }
                }}
                style={{
                  width: '100%',
                  height: verticalScale(56),
                  marginBottom: verticalScale(8),
                }}
                cardStyle={{
                  backgroundColor: '#FFFFFF',
                  textColor: '#111827',
                  placeholderColor: '#9CA3AF',
                  borderColor: '#E5E7EB',
                  borderWidth: 1,
                  borderRadius: scale(8),
                  fontSize: moderateScale(16),
                }}
              />
              <View className="flex-row items-center mb-6">
                 <ShieldCheck size={scale(14)} color="#166534" />
                 <Text style={{ fontSize: moderateScale(12), marginLeft: scale(6) }} className="text-gray-400">We never store your full card number</Text>
              </View>

              {/* Set as Primary Checkbox area */}
              <Pressable 
                onPress={() => setIsPrimaryCard(!isPrimaryCard)}
                style={{ padding: scale(16), marginBottom: verticalScale(24), borderRadius: scale(8) }}
                className="bg-[#F0FDF4] border border-[#DCFCE7] flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <View style={{ width: scale(24), height: scale(24), borderRadius: scale(6) }} className={`items-center justify-center mr-3 ${isPrimaryCard ? 'bg-[#166534]' : 'border border-gray-300 bg-white'}`}>
                    {isPrimaryCard && <View style={{ width: scale(12), height: scale(6), borderBottomWidth: 2, borderLeftWidth: 2, borderColor: 'white', transform: [{ rotate: '-45deg' }, { translateY: -2 }] }} />}
                  </View>
                  <Text style={{ fontSize: moderateScale(15) }} className="text-gray-900 font-medium">Set as primary card</Text>
                </View>
                <View style={{ paddingHorizontal: scale(8), paddingVertical: verticalScale(4), borderRadius: scale(4) }} className="bg-[#DCFCE7]">
                  <Text style={{ fontSize: moderateScale(10) }} className="text-[#166534] font-bold">Recommended</Text>
                </View>
              </Pressable>

              <Pressable 
                onPress={handleSaveCard} 
                style={{ padding: scale(16), marginBottom: verticalScale(16), borderRadius: scale(8) }} 
                className={`flex-row items-center justify-center ${cardComplete && !isTokenizing ? 'bg-[#166534]' : 'bg-gray-300'}`}
                disabled={!cardComplete || isTokenizing}
              >
                {isTokenizing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Lock size={scale(18)} color="#FFFFFF" style={{ marginRight: scale(8) }} />
                    <Text style={{ fontSize: moderateScale(18) }} className="text-white font-bold">Save Card</Text>
                  </>
                )}
              </Pressable>

              <View className="flex-row items-center justify-center mb-10">
                 <ShieldCheck size={scale(14)} color="#166534" />
                 <Text style={{ fontSize: moderateScale(12), marginLeft: scale(6) }} className="text-gray-500">Secure payments powered by Stripe</Text>
              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
      </SafeAreaView>
    </StripeProvider>
  );
}
