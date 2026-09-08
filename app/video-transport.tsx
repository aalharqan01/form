'use client';
import { createContext } from 'react';
export const VideoUploadContext = createContext<
  ((file: File, member: string) => Promise<string>) | null
>(null);
export const VideoSourcesContext = createContext<Record<string, string>>({});
