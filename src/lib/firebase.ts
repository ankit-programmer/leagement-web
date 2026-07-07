"use client";

import { getApps, initializeApp } from "firebase/app";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function firebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.projectId && config.storageBucket && config.appId);
}

/**
 * Uploads a user image to Firebase Storage and returns its download URL,
 * which the API forwards to the LLM as multimodal source material.
 */
export async function uploadImage(file: File): Promise<string> {
  if (!firebaseConfigured()) {
    throw new Error(
      "Image upload is not configured — set the NEXT_PUBLIC_FIREBASE_* variables (see .env.example).",
    );
  }
  if (!file.type.startsWith("image/")) throw new Error("Only image files can be attached.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image is too large (max 8 MB).");

  const app = getApps()[0] ?? initializeApp(config as Record<string, string>);
  const extension = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `generation/${crypto.randomUUID()}.${extension}`;
  const result = await uploadBytes(ref(getStorage(app), path), file, { contentType: file.type });
  return getDownloadURL(result.ref);
}
