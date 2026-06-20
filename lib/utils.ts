import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { Linking, Platform, Alert } from 'react-native';

export const openDirections = async (address: string, destinationName?: string) => {
  if (!address) {
    Alert.alert('Error', 'No address provided for directions.');
    return;
  }

  const encodedAddress = encodeURIComponent(address);
  let url = '';

  if (Platform.OS === 'ios') {
    url = `maps://app?daddr=${encodedAddress}`;
  } else {
    url = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
  }

  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
      await Linking.openURL(fallbackUrl);
    }
  } catch (error) {
    console.error('Error opening maps:', error);
    Alert.alert('Error', 'Could not open the maps application.');
  }
};
