"use server";

import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { headers } from "next/headers";

export async function approveUser(formData: FormData) {
  const userId = formData.get("id") as string;
  if (!userId) {
    throw Error("Missing required fields");
  }
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.admin) {
    throw Error("Unauthorized");
  }
  try {
    await pool.query('UPDATE "user" SET approved = TRUE WHERE id = $1', [userId]);
  } catch (error) {
    console.error("Failed to approve user", error);
    throw Error("Failed to approve user");
  }
  console.log("Approving account id", userId);
}

export async function promoteUser(formData: FormData) {
  const userId = formData.get("id") as string;
  if (!userId) {
    throw Error("Missing required fields");
  }
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.admin) {
    throw Error("Unauthorized");
  }
  try {
    await pool.query('UPDATE "user" SET admin = TRUE WHERE id = $1', [userId]);
  } catch (error) {
    console.error("Failed to promote user", error);
    throw Error("Failed to promote user");
  }
  console.log("Promoting user id", userId);
}

export async function demoteUser(formData: FormData) {
  const userId = formData.get("id") as string;
  if (!userId) {
    throw Error("Missing required fields");
  }
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.admin) {
    throw Error("Unauthorized");
  }
  if (session?.user.id === userId) {
    throw Error("Cannot demote yourself");
  }
  try {
    await pool.query('UPDATE "user" SET admin = FALSE WHERE id = $1', [userId]);
  } catch (error) {
    console.error("Failed to demote user", error);
    throw Error("Failed to demote user");
  }
  console.log("Demoting user id", userId);
}

export async function deleteUser(formData: FormData) {
  const userId = formData.get("id") as string;
  if (!userId) {
    throw Error("Missing required fields");
  }
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.admin) {
    throw Error("Unauthorized");
  }
  try {
    await pool.query('DELETE FROM "user" WHERE id = $1', [userId]);
  } catch (error) {
    console.error("Failed to reject user", error);
    throw Error("Failed to reject user");
  }
  console.log("Rejected user and deleted account id", userId);
}