/**
 * IA AFRICA CORE
 * Intelligence centrale de la nouvelle plateforme IA AFRICA.
 */

export type IntelligenceInputType =
  | "text"
  | "voice"
  | "image"
  | "document";

export interface IntelligenceRequest {
  type: IntelligenceInputType;
  content: unknown;
  language?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface IntelligenceResult {
  answer: string;
  domain: string;
  confidence: number;
  verified: boolean;
  metadata?: Record<string, unknown>;
}

export interface AfricaCore {
  process(
    request: IntelligenceRequest
  ): Promise<IntelligenceResult>;
}
