import { Capacitor } from "@capacitor/core";
import { NativePurchases, PURCHASE_TYPE, type Product, type Transaction } from "@capgo/native-purchases";
import { supabase } from "../integrations/supabase/client.ts";
import { BILLING_OFFERS, getGooglePlayProductIds, hasBillingAccess, type BillingOffer, type BillingSubscription } from "./billing.ts";
import { getFunctionErrorMessage } from "./functionError.ts";

export type GooglePlayProduct = {
  offerId: string;
  priceText: string;
  title: string;
};

export function isGooglePlayApp() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

function productForOffer(products: Product[], offer: BillingOffer) {
  return products.find((product) =>
    product.planIdentifier === offer.playProductId
      && product.identifier === offer.playBasePlanId
      && !product.offerId
  ) ?? products.find((product) =>
    product.planIdentifier === offer.playProductId
      && product.identifier === offer.playBasePlanId
  );
}

// TEMPORARY billing diagnostics. Remove once the "Unavailable in Play" issue is resolved.
const BILLING_DIAG = "[billing-diag]";

function diagLogQueryFailure(requestedIds: string[], error: unknown) {
  const detail = error as { code?: unknown; message?: unknown; errorMessage?: unknown } | null;
  console.warn(BILLING_DIAG, "getProducts failed", {
    requestedProductIds: requestedIds,
    productType: PURCHASE_TYPE.SUBS,
    // The plugin surfaces BillingResult responseCode/debugMessage only through the rejection payload.
    responseCode: detail?.code ?? null,
    debugMessage: detail?.message ?? detail?.errorMessage ?? String(error),
  });
}

function diagLogProducts(requestedIds: string[], products: Product[]) {
  console.warn(BILLING_DIAG, "getProducts result", {
    requestedProductIds: requestedIds,
    productType: PURCHASE_TYPE.SUBS,
    returnedCount: products.length,
    // Android: identifier = base plan id, planIdentifier = subscription product id.
    returnedProductIds: [...new Set(products.map((p) => p.planIdentifier ?? p.identifier))],
    missingProductIds: requestedIds.filter((id) =>
      !products.some((p) => p.planIdentifier === id || p.identifier === id)
    ),
    offers: products.map((p) => ({
      productId: p.planIdentifier ?? null,
      basePlanId: p.identifier,
      offerId: p.offerId ?? null,
      hasPrice: Boolean(p.priceString),
    })),
  });

  for (const offer of BILLING_OFFERS) {
    const matches = products.filter((p) => p.planIdentifier === offer.playProductId);
    console.warn(BILLING_DIAG, "offer match", {
      appOfferId: offer.id,
      expectedProductId: offer.playProductId,
      expectedBasePlanId: offer.playBasePlanId,
      subscriptionOfferDetailsCount: matches.length,
      basePlanIds: matches.map((p) => p.identifier),
      offerIds: matches.map((p) => p.offerId ?? null),
      matched: Boolean(productForOffer(products, offer)),
    });
  }
}

export async function loadGooglePlayProducts(): Promise<GooglePlayProduct[]> {
  if (!isGooglePlayApp()) return [];

  const { isBillingSupported } = await NativePurchases.isBillingSupported();
  console.warn(BILLING_DIAG, "isBillingSupported", isBillingSupported);
  if (!isBillingSupported) throw new Error("Google Play Billing is unavailable on this device.");

  const requestedIds = getGooglePlayProductIds();
  let products: Product[];
  try {
    ({ products } = await NativePurchases.getProducts({
      productIdentifiers: requestedIds,
      productType: PURCHASE_TYPE.SUBS,
    }));
  } catch (error) {
    diagLogQueryFailure(requestedIds, error);
    throw error;
  }

  diagLogProducts(requestedIds, products);

  return BILLING_OFFERS.flatMap((offer) => {
    const product = productForOffer(products, offer);
    return product ? [{ offerId: offer.id, priceText: product.priceString, title: product.title }] : [];
  });
}

async function verifyTransaction(transaction: Transaction): Promise<BillingSubscription> {
  if (!transaction.purchaseToken || !transaction.productIdentifier) {
    throw new Error("Google Play did not return a purchase token.");
  }

  const { data, error } = await supabase.functions.invoke("verify-google-play-purchase", {
    body: {
      purchaseToken: transaction.purchaseToken,
      productId: transaction.productIdentifier,
    },
  });

  if (error) {
    throw new Error(await getFunctionErrorMessage(error, "Google Play could not verify this purchase."));
  }
  if (!data?.subscription) throw new Error("The verified subscription was not returned.");
  return data.subscription as BillingSubscription;
}

export async function purchaseGooglePlayOffer(offer: BillingOffer, userId: string) {
  const transaction = await NativePurchases.purchaseProduct({
    productIdentifier: offer.playProductId,
    planIdentifier: offer.playBasePlanId,
    productType: PURCHASE_TYPE.SUBS,
    appAccountToken: userId,
    autoAcknowledgePurchases: false,
  });

  if (transaction.purchaseState !== "1") {
    throw new Error("The purchase is pending. Access will activate after Google Play confirms payment.");
  }
  const subscription = await verifyTransaction(transaction);
  if (!hasBillingAccess(subscription)) {
    throw new Error("Google Play reports that this subscription is not active.");
  }
  return subscription;
}

export async function restoreGooglePlayPurchases(userId: string) {
  const { purchases } = await NativePurchases.getPurchases({
    productType: PURCHASE_TYPE.SUBS,
    appAccountToken: userId,
  });
  const knownProductIds = new Set(getGooglePlayProductIds());
  const eligible = purchases.filter((purchase) =>
    purchase.purchaseState === "1" && knownProductIds.has(purchase.productIdentifier)
  );

  let latest: BillingSubscription | null = null;
  for (const purchase of eligible) {
    const verified = await verifyTransaction(purchase);
    if (!latest || new Date(verified.current_period_end ?? 0).getTime() > new Date(latest.current_period_end ?? 0).getTime()) {
      latest = verified;
    }
  }
  return latest && hasBillingAccess(latest) ? latest : null;
}

export async function manageGooglePlaySubscriptions() {
  await NativePurchases.manageSubscriptions();
}