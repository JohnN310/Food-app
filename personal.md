"I need to build the 'Orders and Transactions' checkout loop for my React Native app.

Project Context:

Framework: Expo Router, NativeWind v4, Zustand (useAppStore), Firebase Firestore.

Aesthetic: 'Luxury sustainability' (Ivory backgrounds #FAF9F6, deep greens for primary buttons #1B7A49, and lucide-react-native icons).

Current State: The Home screen successfully fetches from the listings collection. The database security rules for listings and orders are already secure.

Please generate the code for the following four tasks to complete the buyer checkout flow:

1. Build the Item Detail Screen (app/listing/[id].tsx):

Fetch the specific listing data from Firestore using the dynamic [id] from the route.

Build a premium UI displaying the item image, title, store name, price, old price, and description.

Include a sticky 'Reserve Now' button at the absolute bottom of the screen.

When pressed, route the user to a checkout modal.

2. Build the Checkout Modal (app/listing/checkout-modal.tsx):

Create a clean confirmation screen summarizing the order and pickup instructions.

For now, bypass actual payment processing. Include a prominent 'Confirm Purchase' button.

3. Write the Firestore Transaction Logic (Inside the Checkout Modal):

When 'Confirm Purchase' is pressed, execute a secure Firestore Transaction.

The transaction must first read the specific listing document to verify that inventoryCount > 0.

If true, decrement the listing's inventoryCount by 1.

Simultaneously, create a new document in the orders collection containing: buyerId (from Zustand), sellerId, listingId, price, originalPrice, weightSaved (default to 0.5 if null), and status: 'active'.

On success, dismiss the modal and use router.replace() to send them to their active orders.

4. Scaffold the Active Orders Screen (app/(tabs)/saved.tsx or a new orders.tsx):

Build a simple UI to display the user's successful purchases.

Use a Firestore onSnapshot listener to query the orders collection where buyerId == user.uid and status == 'active'.




Notes
- Need to fix the inventory flow. Order Delete flow and Hide Listing flow