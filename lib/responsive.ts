import { Dimensions } from 'react-native';

export const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Baseline dimensions based on iPhone 15 Plus
const guidelineBaseWidth = 473;
const guidelineBaseHeight = 1025;

/**
 * scale
 * Use for scaling width, margin-horizontal, padding-horizontal, and border-radius.
 * Scales proportionately based on the actual screen width relative to 430px.
 */
export const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

/**
 * verticalScale
 * Use for scaling height, margin-vertical, and padding-vertical.
 * Scales proportionately based on the actual screen height relative to 932px.
 */
export const verticalScale = (size: number) => (screenHeight / guidelineBaseHeight) * size;

/**
 * moderateScale
 * Use specifically for fonts or UI elements where you want a "softer" scale.
 * It scales proportionally but applies a dampening factor (default 0.5) so that 
 * elements don't get unreadably tiny on small phones or massively huge on tablets.
 */
export const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;
