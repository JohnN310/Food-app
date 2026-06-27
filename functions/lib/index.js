"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detachPaymentMethod = exports.createSetupIntent = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const stripe_1 = __importDefault(require("stripe"));
admin.initializeApp();
// Ensure you have STRIPE_SECRET_KEY in your functions/.env file
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2024-04-10",
});
exports.createSetupIntent = functions.https.onCall(async (data, context) => {
    var _a;
    let uid = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
    // Fallback for React Native SDK where context.auth might be dropped
    if (!uid && data.token) {
        try {
            const decodedToken = await admin.auth().verifyIdToken(data.token);
            uid = decodedToken.uid;
        }
        catch (error) {
            throw new functions.https.HttpsError("unauthenticated", "Invalid token.");
        }
    }
    if (!uid) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated to add a payment method.");
    }
    // 1. Get or create Stripe Customer
    const userDocRef = admin.firestore().collection("users").doc(uid);
    const userDoc = await userDocRef.get();
    const userData = userDoc.data();
    let customerId = userData === null || userData === void 0 ? void 0 : userData.stripeCustomerId;
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
exports.detachPaymentMethod = functions.https.onCall(async (data, context) => {
    var _a;
    let uid = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid && data.token) {
        try {
            const decodedToken = await admin.auth().verifyIdToken(data.token);
            uid = decodedToken.uid;
        }
        catch (error) {
            throw new functions.https.HttpsError("unauthenticated", "Invalid token.");
        }
    }
    if (!uid) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated to remove a payment method.");
    }
    if (!data.paymentMethodId) {
        throw new functions.https.HttpsError("invalid-argument", "The function must be called with a paymentMethodId.");
    }
    try {
        const paymentMethod = await stripe.paymentMethods.detach(data.paymentMethodId);
        return { success: true, paymentMethod };
    }
    catch (error) {
        console.error("Failed to detach payment method:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to detach payment method from Stripe.");
    }
});
//# sourceMappingURL=index.js.map