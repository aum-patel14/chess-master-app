import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { getFirestoreUser, updateFirestoreUser } from './db.js';

dotenv.config();

const router = express.Router();

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16' as any
}) : null;

// Initialize Supabase admin client (Bypasses RLS to write subscriptions and shop items)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
let supabase: any = null;

if (supabaseUrl && supabaseServiceKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });
  } catch (err) {
    console.error('Failed to initialize Supabase admin client:', err);
  }
}

const BASE_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Price mapping for Subscriptions
const PRICE_MAP: Record<string, string> = {
  'silver_monthly': process.env.STRIPE_PRICE_SILVER_MONTHLY || 'price_silver_monthly_mock',
  'silver_annual': process.env.STRIPE_PRICE_SILVER_ANNUAL || 'price_silver_annual_mock',
  'gold_monthly': process.env.STRIPE_PRICE_GOLD_MONTHLY || 'price_gold_monthly_mock',
  'gold_annual': process.env.STRIPE_PRICE_GOLD_ANNUAL || 'price_gold_annual_mock',
  'diamond_monthly': process.env.STRIPE_PRICE_DIAMOND_MONTHLY || 'price_diamond_monthly_mock',
  'diamond_annual': process.env.STRIPE_PRICE_DIAMOND_ANNUAL || 'price_diamond_annual_mock'
};

// 1. CREATE CHECKOUT SESSION FOR SUBSCRIPTIONS
router.post('/create-checkout', async (req: Request, res: Response) => {
  const { userId, planTier, billingCycle } = req.body;

  if (!userId || !planTier || !billingCycle) {
    return res.status(400).json({ error: 'Missing required parameters: userId, planTier, billingCycle' });
  }

  const key = `${planTier.toLowerCase()}_${billingCycle.toLowerCase()}`;
  const priceId = PRICE_MAP[key];

  if (!priceId) {
    return res.status(400).json({ error: `Invalid subscription price combination: ${key}` });
  }

  // Fallback for mock environments (If Stripe key is missing)
  if (!stripe) {
    console.warn('[Stripe Backend] Secret key is missing. Returning a sandbox mock checkout success URL.');
    // Simulate activation for easier local testing
    try {
      const currentPeriodEnd = new Date();
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + (billingCycle === 'annual' ? 12 : 1));
      
      // Update Firestore user document
      await updateFirestoreUser(userId, {
        subscription_tier: planTier,
        stripe_customer_id: 'cus_mock_guest',
        subscription_id: 'sub_mock_guest',
        current_period_end: currentPeriodEnd.toISOString()
      });

      // Update Supabase if available
      if (supabase) {
        await supabase
          .from('users')
          .update({
            subscription_tier: planTier,
            stripe_customer_id: 'cus_mock_guest',
            subscription_id: 'sub_mock_guest',
            current_period_end: currentPeriodEnd.toISOString()
          })
          .eq('id', userId);
      }
    } catch (e) {
      console.error('Mock database update failed:', e);
    }

    return res.json({ url: `${BASE_URL}/premium/success?session_id=session_mock_${Math.random().toString(36).substring(7)}` });
  }

  try {
    // Check if user already has a customer ID in Firestore
    let customerId: string | null = null;
    const firestoreUser = await getFirestoreUser(userId);
    if (firestoreUser) {
      customerId = firestoreUser.stripe_customer_id || null;
    }

    // Fallback to Supabase if not found in Firestore
    if (!customerId && supabase) {
      try {
        const { data: user } = await supabase
          .from('users')
          .select('stripe_customer_id')
          .eq('id', userId)
          .single();
        customerId = user?.stripe_customer_id || null;
      } catch (err) {
        console.warn('[Supabase Fetch] Failed fetching stripe customer ID:', err);
      }
    }

    // Create a new customer if none exists
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { user_id: userId }
      });
      customerId = customer.id;
      
      // Update customer ID in Firestore and Supabase
      await updateFirestoreUser(userId, { stripe_customer_id: customerId });
      if (supabase) {
        try {
          await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', userId);
        } catch (err) {
          console.warn('[Supabase Update] Failed updating customer ID:', err);
        }
      }
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${BASE_URL}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/premium`,
      metadata: { user_id: userId, plan_tier: planTier },
      subscription_data: {
        metadata: { user_id: userId, plan_tier: planTier }
      }
    });

    return res.json({ url: session.url });
  } catch (err: any) {
    console.error('[Stripe Checkout] Session creation error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 2. CREATE PAYMENT INTENT FOR COSMETICS & TOURNAMENTS
router.post('/create-payment-intent', async (req: Request, res: Response) => {
  const { userId, type, itemId, amount } = req.body;

  if (!userId || !type || !itemId || !amount) {
    return res.status(400).json({ error: 'Missing required params: userId, type, itemId, amount' });
  }

  // Fallback for mock environments
  if (!stripe) {
    console.warn('[Stripe Backend] Offline mock: processing transaction successfully.');
    try {
      if (type === 'cosmetic') {
        const userDoc = await getFirestoreUser(userId);
        const purchasedItems = userDoc?.purchased_items || [];
        if (!purchasedItems.includes(itemId)) {
          purchasedItems.push(itemId);
          await updateFirestoreUser(userId, { purchased_items: purchasedItems });
        }
        
        if (supabase) {
          await supabase
            .from('user_items')
            .upsert({ user_id: userId, item_id: itemId }, { onConflict: 'user_id,item_id' });
        }
      } else if (type === 'tournament_entry') {
        // For tournaments, update Firestore user document (add tournament to joined list if needed)
        // or just accept mock success
        if (supabase) {
          await supabase
            .from('tournament_participants')
            .upsert({ tournament_id: itemId, user_id: userId }, { onConflict: 'tournament_id,user_id' });
        }
      }
    } catch (e) {
      console.error('Mock database update failed:', e);
    }
    return res.json({ clientSecret: 'pi_mock_secret_' + Math.random().toString(36).substring(7), isMock: true });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // price in paise (INR)
      currency: 'inr',
      metadata: { user_id: userId, purchase_type: type, item_id: itemId }
    });

    return res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err: any) {
    console.error('[Stripe PaymentIntent] Error creating transaction:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 3. SECURE STRIPE WEBHOOK RECEIVER (Idempotent and verified)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  if (!stripe || !webhookSecret) {
    console.warn('[Stripe Webhook] Stripe not initialized or webhook secret is missing.');
    return res.status(400).send('Webhook unconfigured');
  }

  try {
    // Signature validation using the raw body buffer
    const rawBody = (req as any).rawBody || req.body;
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error(`[Stripe Webhook] Verification signature failed: ${err.message}`);
    return res.status(400).send(`Webhook Signature Verification Error: ${err.message}`);
  }

  console.log(`[Stripe Webhook] Received event type: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const planTier = session.metadata?.plan_tier;

        if (userId && planTier) {
          const subscriptionId = session.subscription as string;
          const customerId = session.customer as string;

          // Retrieve active period metrics from Stripe subscription
          const subscription: any = await stripe.subscriptions.retrieve(subscriptionId);
          const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

          // Update Firestore
          await updateFirestoreUser(userId, {
            subscription_tier: planTier.toLowerCase(),
            stripe_customer_id: customerId,
            subscription_id: subscriptionId,
            current_period_end: currentPeriodEnd.toISOString()
          });

          // Update Supabase if available
          if (supabase) {
            try {
              await supabase
                .from('users')
                .update({
                  subscription_tier: planTier.toLowerCase(),
                  stripe_customer_id: customerId,
                  subscription_id: subscriptionId,
                  current_period_end: currentPeriodEnd.toISOString()
                })
                .eq('id', userId);
            } catch (err) {
              console.warn('[Supabase Webhook] Failed completing checkout session:', err);
            }
          }

          console.log(`[Stripe Webhook] Successfully initialized subscription for ${userId} tier: ${planTier}`);
        }
        break;
      }
 
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const userId = subscription.metadata?.user_id;
        const planTier = subscription.metadata?.plan_tier;
 
        if (userId && planTier) {
          const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

          // Update Firestore
          await updateFirestoreUser(userId, {
            subscription_tier: planTier.toLowerCase(),
            current_period_end: currentPeriodEnd.toISOString()
          });

          // Update Supabase if available
          if (supabase) {
            try {
              await supabase
                .from('users')
                .update({
                  subscription_tier: planTier.toLowerCase(),
                  current_period_end: currentPeriodEnd.toISOString()
                })
                .eq('id', userId);
            } catch (err) {
              console.warn('[Supabase Webhook] Failed updating subscription:', err);
            }
          }
 
          console.log(`[Stripe Webhook] Upgraded subscription for user ${userId} to ${planTier}`);
        }
        break;
      }
 
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const userId = subscription.metadata?.user_id;
 
        if (userId) {
          // Update Firestore
          await updateFirestoreUser(userId, {
            subscription_tier: 'free',
            subscription_id: null,
            current_period_end: null
          });

          // Update Supabase if available
          if (supabase) {
            try {
              await supabase
                .from('users')
                .update({
                  subscription_tier: 'free',
                  subscription_id: null,
                  current_period_end: null
                })
                .eq('id', userId);
            } catch (err) {
              console.warn('[Supabase Webhook] Failed deleting subscription:', err);
            }
          }
 
          console.log(`[Stripe Webhook] Subscription deleted for user ${userId}. Downgraded to free.`);
        }
        break;
      }
 
      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const userId = invoice.subscription_details?.metadata?.user_id || invoice.metadata?.user_id;
 
        if (userId) {
          console.warn(`[Stripe Webhook] Invoice payment failed for user ${userId}. Prompting warnings.`);
          
          // Update Firestore
          await updateFirestoreUser(userId, { subscription_tier: 'free' });

          // Update Supabase if available
          if (supabase) {
            try {
              await supabase
                .from('users')
                .update({ subscription_tier: 'free' })
                .eq('id', userId);
            } catch (err) {
              console.warn('[Supabase Webhook] Failed handling invoice payment failure:', err);
            }
          }
        }
        break;
      }
 
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const userId = paymentIntent.metadata?.user_id;
        const purchaseType = paymentIntent.metadata?.purchase_type;
        const itemId = paymentIntent.metadata?.item_id;
 
        if (userId && purchaseType && itemId) {
          if (purchaseType === 'cosmetic') {
            const userDoc = await getFirestoreUser(userId);
            const purchasedItems = userDoc?.purchased_items || [];
            if (!purchasedItems.includes(itemId)) {
              purchasedItems.push(itemId);
              await updateFirestoreUser(userId, { purchased_items: purchasedItems });
            }

            if (supabase) {
              try {
                await supabase
                  .from('user_items')
                  .upsert({ user_id: userId, item_id: itemId }, { onConflict: 'user_id,item_id' });
              } catch (err) {
                console.warn('[Supabase Webhook] Failed saving user cosmetic item:', err);
              }
            }
            console.log(`[Stripe Webhook] Saved cosmetic purchase: User ${userId} bought ${itemId}`);
          } else if (purchaseType === 'tournament_entry') {
            if (supabase) {
              try {
                await supabase
                  .from('tournament_participants')
                  .upsert({ tournament_id: itemId, user_id: userId }, { onConflict: 'tournament_id,user_id' });
              } catch (err) {
                console.warn('[Supabase Webhook] Failed saving tournament registration:', err);
              }
            }
            console.log(`[Stripe Webhook] Saved tournament participant: User ${userId} joined tournament ${itemId}`);
          }
        }
        break;
      }
    }
 
    return res.json({ received: true });
  } catch (err: any) {
    console.error('[Stripe Webhook] Error writing updates to database:', err);
    return res.status(500).send(`Database Webhook Error: ${err.message}`);
  }
});
 
// 4. CREATE BILLING CUSTOMER PORTAL
router.post('/portal', async (req: Request, res: Response) => {
  const { userId } = req.body;
 
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }
 
  if (!stripe) {
    return res.status(400).json({ error: 'Stripe is offline in mock developer mode.' });
  }
 
  try {
    let customerId: string | null = null;
    const firestoreUser = await getFirestoreUser(userId);
    if (firestoreUser) {
      customerId = firestoreUser.stripe_customer_id || null;
    }

    if (!customerId && supabase) {
      try {
        const { data: user } = await supabase
          .from('users')
          .select('stripe_customer_id')
          .eq('id', userId)
          .single();
        customerId = user?.stripe_customer_id || null;
      } catch (err) {
        console.warn('[Supabase Fetch] Failed fetching customer ID for portal:', err);
      }
    }
 
    if (!customerId) {
      return res.status(400).json({ error: 'No active Stripe billing customer ID found for this user.' });
    }
 
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${BASE_URL}/profile`
    });
 
    return res.json({ url: session.url });
  } catch (err: any) {
    console.error('[Stripe Portal] Customer portal creation failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
