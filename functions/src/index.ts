import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import Stripe from "stripe";

admin.initializeApp();

// Ensure you have STRIPE_SECRET_KEY in your functions/.env file
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-04-10" as any,
});

export const createSetupIntent = functions.https.onCall(async (data, context) => {
  let uid = context.auth?.uid;

  // Fallback for React Native SDK where context.auth might be dropped
  if (!uid && data.token) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(data.token);
      uid = decodedToken.uid;
    } catch (error) {
      throw new functions.https.HttpsError("unauthenticated", "Invalid token.");
    }
  }

  if (!uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated to add a payment method."
    );
  }

  // 1. Get or create Stripe Customer
  const userDocRef = admin.firestore().collection("users").doc(uid);
  const userDoc = await userDocRef.get();
  const userData = userDoc.data();

  let customerId = userData?.stripeCustomerId;

  if (!customerId) {
    // Create a new customer in Stripe
    const customer = await stripe.customers.create({
      metadata: { firebaseUID: uid },
    });
    customerId = customer.id;
    // Save to Firestore
    await userDocRef.set({ stripeCustomerId: customerId }, { merge: true });
  }

  // 2. Create SetupIntent
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    usage: "off_session",
  });

  return {
    clientSecret: setupIntent.client_secret,
    customerId: customerId,
  };
});

export const detachPaymentMethod = functions.https.onCall(async (data, context) => {
  let uid = context.auth?.uid;

  if (!uid && data.token) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(data.token);
      uid = decodedToken.uid;
    } catch (error) {
      throw new functions.https.HttpsError("unauthenticated", "Invalid token.");
    }
  }

  if (!uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated to remove a payment method."
    );
  }

  if (!data.paymentMethodId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with a paymentMethodId."
    );
  }

  try {
    const paymentMethod = await stripe.paymentMethods.detach(data.paymentMethodId);
    return { success: true, paymentMethod };
  } catch (error: any) {
    console.error("Failed to detach payment method:", error);
    throw new functions.https.HttpsError("internal", error.message || "Failed to detach payment method from Stripe.");
  }
});
