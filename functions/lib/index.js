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
exports.createPaymentIntent = exports.calculateTaxQuote = exports.checkConnectAccountStatus = exports.createStripeDashboardLink = exports.createConnectAccount = exports.detachPaymentMethod = exports.createSetupIntent = void 0;
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
// ==========================================
// Seller Payouts (Stripe Connect Express)
// ==========================================
exports.createConnectAccount = functions.https.onCall(async (data, context) => {
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
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
    }
    const userDocRef = admin.firestore().collection("users").doc(uid);
    const userDoc = await userDocRef.get();
    const userData = userDoc.data();
    let stripeAccountId = userData === null || userData === void 0 ? void 0 : userData.stripeAccountId;
    // 1. Create a new Stripe Express account if it doesn't exist
    if (!stripeAccountId) {
        const account = await stripe.accounts.create({
            type: "express",
            country: "US",
            email: (userData === null || userData === void 0 ? void 0 : userData.email) || undefined,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            business_type: "individual",
        });
        stripeAccountId = account.id;
        await userDocRef.set({ stripeAccountId }, { merge: true });
    }
    // 2. Create an Account Link for onboarding
    const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${data.returnUrl}?status=refresh`,
        return_url: `${data.returnUrl}?status=return`,
        type: "account_onboarding",
    });
    return { url: accountLink.url };
});
exports.createStripeDashboardLink = functions.https.onCall(async (data, context) => {
    var _a, _b;
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
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
    }
    const userDocRef = admin.firestore().collection("users").doc(uid);
    const userDoc = await userDocRef.get();
    const stripeAccountId = (_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.stripeAccountId;
    if (!stripeAccountId) {
        throw new functions.https.HttpsError("failed-precondition", "No Stripe Connect account found.");
    }
    const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);
    return { url: loginLink.url };
});
exports.checkConnectAccountStatus = functions.https.onCall(async (data, context) => {
    var _a, _b;
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
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
    }
    const userDoc = await admin.firestore().collection("users").doc(uid).get();
    const stripeAccountId = (_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.stripeAccountId;
    if (!stripeAccountId) {
        return { isSetup: false };
    }
    try {
        const account = await stripe.accounts.retrieve(stripeAccountId);
        return {
            isSetup: account.details_submitted && account.charges_enabled,
            detailsSubmitted: account.details_submitted,
            chargesEnabled: account.charges_enabled
        };
    }
    catch (error) {
        console.error("Failed to check connect account status:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
exports.calculateTaxQuote = functions.https.onCall(async (data, context) => {
    var _a;
    const { amount, currency = "usd", sellerId } = data;
    if (amount === undefined || amount === null || !sellerId) {
        throw new functions.https.HttpsError("invalid-argument", `Missing required parameters. Received amount: ${amount}, sellerId: ${sellerId}`);
    }
    if (amount <= 0 || isNaN(amount)) {
        return {
            calculationId: null,
            taxAmountExclusive: 0,
            taxAmountInclusive: 0,
            amountTotal: amount || 0
        };
    }
    // Fetch seller's address
    const sellerDoc = await admin.firestore().collection("users").doc(sellerId).get();
    const storeAddress = ((_a = sellerDoc.data()) === null || _a === void 0 ? void 0 : _a.storeAddress) || "";
    // Extract 5-digit zip code using regex
    let postal_code = undefined;
    const zipMatch = storeAddress.match(/\b\d{5}\b/);
    if (zipMatch) {
        postal_code = zipMatch[0];
    }
    // The address from map APIs is often granular: "477, Devonshire Walk Drive, Arbor Trace, Gwinnett County, Georgia, 30024, United States"
    // We can just pass the entire string as line1, as long as we have the zip code
    let line1 = storeAddress.substring(0, 255); // Max length is 255
    // Try to find the state (usually the part right before the zip code, or we can just send the string)
    // To be safe, we'll only send line1 and postal_code, which is typically enough for US tax calculation if the zip is valid.
    const address = { country: "US" };
    if (line1)
        address.line1 = line1;
    if (postal_code)
        address.postal_code = postal_code;
    try {
        const calculation = await stripe.tax.calculations.create({
            currency,
            line_items: [
                {
                    amount,
                    reference: "Item",
                },
            ],
            customer_details: {
                address,
                address_source: "shipping",
            },
        });
        return {
            calculationId: calculation.id,
            taxAmountExclusive: calculation.tax_amount_exclusive,
            taxAmountInclusive: calculation.tax_amount_inclusive,
            amountTotal: calculation.amount_total
        };
    }
    catch (error) {
        console.error("Tax calculation failed:", error);
        // If tax fails due to bad address, return 0 tax so checkout isn't blocked
        return {
            calculationId: null,
            taxAmountExclusive: 0,
            taxAmountInclusive: 0,
            amountTotal: amount
        };
    }
});
exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
    const { amount, subtotal, currency = "usd", sellerStripeAccountId, customerId, description, paymentMethodId, calculationId } = data;
    if (amount === undefined || amount === null || subtotal === undefined || subtotal === null || !sellerStripeAccountId) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required parameters (amount, subtotal, sellerStripeAccountId).");
    }
    // We take a clean 8% of the subtotal (ignoring tax)
    const platformFee = Math.round(subtotal * 0.08);
    // Calculate Stripe fee: 2.9% + 30 cents on the TOTAL amount charged to the buyer (which includes tax)
    const estimatedStripeFee = Math.round((amount * 0.029) + 30);
    // Total application fee = 8% platform fee + Stripe processing fee
    // The seller implicitly pays the Stripe fee!
    const applicationFeeAmount = platformFee + estimatedStripeFee;
    let paymentIntentData = {
        amount,
        currency,
        customer: customerId,
        payment_method: paymentMethodId,
        description,
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
            destination: sellerStripeAccountId,
        },
    };
    // If we have a calculation ID (tax quote), we can attach it to the payment intent metadata or just use it.
    if (calculationId) {
        paymentIntentData.metadata = { tax_calculation: calculationId };
    }
    try {
        const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);
        return { clientSecret: paymentIntent.client_secret };
    }
    catch (error) {
        console.error("Payment intent creation failed:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
//# sourceMappingURL=index.js.map