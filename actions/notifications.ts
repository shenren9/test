"use server";

import { pool } from "@/lib/db";

export async function handleSubscribeAction(userId: string, subscription: any) {
  try {
      if (!userId) {
        return { ok: false, error: "userId is required" };
      }

      const query = `
        INSERT INTO "push_subscription" ("userId", "subscription")
        VALUES ($1, $2)
        ON CONFLICT ("userId", "subscription") DO NOTHING
        RETURNING *;
      `;

      const result = await pool.query(query, [
        userId,
        JSON.stringify(subscription),
      ]);

      return {
        ok: true,
        subscription: result.rows[0],
      };
    } catch (err: any) {
      console.error("Error saving push subscription:", err.message);
      return {
        ok: false,
        error: "Failed to save subscription",
      };
    }
}

export async function deletePushSubscriptionAction(userId: string, endpoint: string) {
  try {
    const query = `
      DELETE FROM "push_subscription"
      WHERE "userId" = $1 AND "subscription"->>'endpoint' = $2;
    `;

    await pool.query(query, [userId, endpoint]);
    return { ok: true };
  } catch (err: any) {
    console.error("Error deleting push subscription:", err.message);
    return { ok: false, error: "Failed to delete subscription" };
  }
}

// Return boolean status if a device is registered for push subscriptions
export async function getDevicePushSubscription(endpoint: string) {
  try {
      const query = `
        SELECT 1 FROM "push_subscription"
        WHERE "subscription"->>'endpoint' = $1
        LIMIT 1;
      `;

      const result = await pool.query(query, [endpoint]);
      const count = result.rowCount ?? 0;

      return { ok: true, isRegistered: count > 0 };
    } catch (err: any) {
      console.error("Error checking if device is registered for subscription", err.message);
      return { ok: false, error: "Failed to check device registration status" };
    }
}
