# App Description: Things Still Good

## 1. What the App Does
"Things Still Good" is a React Native mobile application designed to reduce food waste by connecting buyers with local stores, bakeries, and restaurants offering surplus or soon-to-expire food at a discount. 

The app features several core sections:
- **Home Tab**: Displays real-time listings of nearby food rescue deals. Users can search by text, filter by dynamic categories (e.g., Bakery, Produce), see "Today's Impact" statistics, and view items with their discount, price, and distance.
- **Map Tab**: Provides an interactive map interface to locate neighborhood deals spatially. It includes quick category filters (Bakery, Produce, Free, Expiring) and location controls.
- **Saved Tab**: Allows users to quickly access deals they have favorited or saved for later.
- **Profile Tab**: Features an "Impact Dashboard" that tracks the user's personal contribution, including total orders, money saved, and food waste cut (in kg). It also provides access to account settings, payment methods, messages, help & policies, and an option to switch to a "Seller mode".

The application uses real-time database listeners to keep the listings and user impact metrics constantly updated without needing manual refreshes.

## 2. Tech Stack
The application is built using a modern, scalable React Native ecosystem:
- **Framework**: React Native with **Expo** (SDK 54)
- **Routing/Navigation**: **Expo Router** (File-based routing)
- **Styling**: **NativeWind** (Tailwind CSS for React Native)
- **State Management**: **Zustand** (Global app state for user sessions and saved items)
- **Backend & Database**: **Firebase** (Firestore for real-time queries and Firebase Auth for authentication)
- **Icons**: `lucide-react-native` and `@expo/vector-icons`
- **Maps**: `react-native-maps`

## 3. App Theme & Colors (Most Important)
The app uses a fresh, eco-friendly color palette that emphasizes nature and savings, structured heavily around Tailwind CSS custom configurations.

### Tab Bar Colors (Crucial Context)
The bottom navigation tab bar is designed with specific interactive states to clearly indicate the user's current section:
- **Tab Bar Background**: `#FAFAF5` (Soft ivory)
- **Tab Bar Top Border**: `#F3F4F6` (Gray-50)
- **Active (Focused) Tab Icon & Text**: `#1B7A49` (Brand Green)
- **Active (Focused) Tab Icon Background**: `#E8F5E9` (Brand Primary Soft - creates a circular highlight behind the active icon)
- **Inactive Tab Icon & Text**: `#9CA3AF` (Gray-400)

### Global Color Palette
- **Background**: `#FAFAF5` (Soft ivory - used across most screens for a warm, clean look)
- **Brand Primary (Green)**: 
  - `DEFAULT: #1B7A49` (Primary buttons, active states, price text)
  - `soft: #E8F5E9` (Impact banners, menu item icon backgrounds)
  - `hover: #145D36`
- **Brand Accent (Peach/Yellow)**: 
  - `DEFAULT: #FFF2E5` (Warm peach for profile dashboard background)
  - `yellow: #FFF9C4` (Avatar backgrounds)
- **Urgency (Red)**: 
  - `DEFAULT: #E53935` (Saved heart icons, notification badges, delete actions)
  - `soft: #FFEBEE` (Backgrounds for destructive actions)
- **Text & Grays**:
  - Headings and main text: `#111827` (Gray-900)
  - Subtitles and secondary text: `#6B7280` (Gray-500) and `#9CA3AF` (Gray-400)
