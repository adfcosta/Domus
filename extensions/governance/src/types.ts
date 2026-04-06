/**
 * Governance Extension Type Definitions
 */

// ============================================================================
// Agent Registry
// ============================================================================

export interface AgentDefinition {
  emoji: string;
  name: string;
  role: string;
}

export type AgentRegistry = Record<string, AgentDefinition>;

// ============================================================================
// Configuration
// ============================================================================

export interface GovernanceConfig {
  enabled: boolean;
  strictMode: boolean;
  requireSignature: boolean;
  blockedTools: string[];
  allowedSubagentLabels: string[];
  requireSubagentSignature: boolean;
  signatureTemplate: string;
  agents: AgentRegistry;
}

// ============================================================================
// Audit & Logging
// ============================================================================

export interface ToolCallAudit {
  timestamp: number;
  toolName: string;
  agentId?: string;
  sessionKey?: string;
  params?: Record<string, unknown>;
  allowed: boolean;
  reason?: string;
}

export interface SubagentAudit {
  timestamp: number;
  label?: string;
  allowed: boolean;
  error?: string;
}

export interface GovernanceState {
  toolCalls: ToolCallAudit[];
  subagentSpawns: SubagentAudit[];
  violations: number;
}

// ============================================================================
// Tool Categories
// ============================================================================

// Dangerous tools that require delegation
export const DANGEROUS_TOOLS = [
  "write",
  "edit", 
  "exec",
  "delete",
  "remove",
];

// Read-only tools that are always safe
export const READONLY_TOOLS = [
  "read",
  "web_search",
  "web_fetch",
  "image",
  "memory_search",
  "memory_get",
];
