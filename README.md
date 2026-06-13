# Things Still Good 🌿

**Things Still Good** is a React Native mobile application designed to combat food waste. It connects environmentally conscious buyers with local stores, bakeries, and restaurants offering surplus or soon-to-expire food at a steep discount. Save money, support local businesses, and help the planet—one meal at a time.

## 📱 Features

- **Rescue Deals (Home):** Browse real-time listings of nearby surplus food. Search by text, filter by dynamic categories (e.g., Bakery, Produce), and see exactly how much you save.
- **Interactive Map:** Locate neighborhood deals spatially. Use quick category filters to find exactly what you need nearby.
- **Save for Later:** Favorite and save your preferred rescue deals.
- **Seamless Checkout:** A frictionless "Swipe to Buy" interface ensures you can reserve surplus food instantly.
- **Impact Dashboard (Profile):** Track your personal environmental contribution in real-time, including total orders, money saved, and food waste cut (in kg). 
- **Dual Modes:** Easily toggle between **Buyer Mode** and **Seller Mode** to manage store listings.

## 🛠 Tech Stack

Built with a modern, scalable React Native ecosystem:

- **Framework:** React Native with **Expo** (SDK 54)
- **Routing:** **Expo Router** (File-based routing)
- **Styling:** **NativeWind** (Tailwind CSS for React Native)
- **State Management:** **Zustand** (Global app state for user sessions and saved items)
- **Backend & Database:** **Firebase** (Firestore for real-time queries & Firebase Auth)
- **Icons & Maps:** `lucide-react-native`, `@expo/vector-icons`, and `react-native-maps`

## 🎨 Theme & UI

The app utilizes a custom eco-friendly palette designed to emphasize nature, trust, and savings:
- **Backgrounds:** Soft Ivory (`#FAFAF5`)
- **Brand Primary:** Nature Green (`#1B7A49`)
- **Accents:** Warm Peach/Yellow (`#FFF2E5`) and Soft Green (`#E8F5E9`)
- **Urgency/Alerts:** Bright Red (`#E53935`) for notification badges and destructive actions.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or newer recommended)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- A Firebase project with Firestore and Authentication enabled

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/JohnN310/Food-app.git
   cd Food-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Firebase:**
   Create a `.env` file in the root directory and add your Firebase configuration credentials:
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. **Start the development server:**
   ```bash
   npx expo start
   ```

5. **Run on your device or emulator:**
   - Press `a` to run on an Android emulator.
   - Press `i` to run on an iOS simulator.
   - Scan the QR code with the Expo Go app to run on your physical device.

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests to help improve the app and reduce even more food waste.

## 📄 License

This project is licensed under the MIT License.
