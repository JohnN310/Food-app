import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Keyboard } from 'react-native';
import { MapPin } from 'lucide-react-native';

interface AddressOption {
  display_name: string;
  lat: string;
  lon: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChangeAddress: (address: string, lat?: number, lon?: number) => void;
  placeholder?: string;
}

export default function AddressAutocomplete({ value, onChangeAddress, placeholder = '123 Bakery St, City' }: AddressAutocompleteProps) {
  const [results, setResults] = useState<AddressOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Use ReturnType<typeof setTimeout> instead of NodeJS.Timeout to fix TS errors in React Native
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchAddress = async (text: string) => {
    if (!text || text.length < 3) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    setShowDropdown(true);

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&addressdetails=1&limit=5`, {
        headers: {
          'User-Agent': 'ThingsStillGood/1.0',
        }
      });
      const data = await response.json();
      setResults(data || []);
    } catch (error) {
      console.error('Error fetching address:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (text: string) => {
    // Notify parent immediately, updating the controlled `value` prop
    onChangeAddress(text);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchAddress(text);
    }, 600);
  };

  const handleSelect = (item: AddressOption) => {
    setShowDropdown(false);
    Keyboard.dismiss();
    // Notify parent with the full selected location
    onChangeAddress(item.display_name, parseFloat(item.lat), parseFloat(item.lon));
  };

  return (
    <View className="mb-6 z-50">
      <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 border border-gray-100 shadow-sm relative z-50">
        <MapPin size={20} color="#9CA3AF" />
        <TextInput
          value={value}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor="#6B7280"
          className="flex-1 ml-3 text-gray-900 font-medium text-base"
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
        />
        {loading && <ActivityIndicator size="small" color="#1B7A49" />}
      </View>

      {/* Dropdown Results (Inline to prevent ScrollView clipping) */}
      {showDropdown && results.length > 0 && (
        <View className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-2 overflow-hidden">
          {results.map((item, index) => (
            <Pressable
              key={`${item.lat}-${item.lon}-${index}`}
              onPress={() => handleSelect(item)}
              className="px-4 py-3 border-b border-gray-50 flex-row items-start active:bg-gray-50"
            >
              <MapPin size={16} color="#1B7A49" className="mt-0.5 mr-2 flex-shrink-0" />
              <Text className="text-gray-700 text-sm flex-1 leading-tight">{item.display_name}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
