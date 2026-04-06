/**
 * Governance Plugin for OpenClaw
 * 
 * Enforces agent governance rules:
 * - Mandatory signatures on messages
 * - Tool call validation and blocking
 * - Subagent spawning control
 * 
 * Configuration via governance.config.json
 */

import type {
  PluginHookBeforeToolCallEvent,
  PluginHookBeforeToolCallResult,
  PluginHookSubagentSpawningEvent,
  PluginHookSubagentSpawningResult,
  PluginHookBeforeAgentReplyEvent,
  PluginHookBeforeAgentReplyResult,
  PluginHookToolContext,
  PluginHookSubagentContext,
  PluginHookAgentContext,
} from "../../src/plugins/types.js";

import { loadConfig, addAgent, removeAgent, DEFAULT_CONFIG } from "./config.js";
import type { GovernanceConfig, AgentRegistry } from "./types.js";

// ============================================================================
// State
// ============================================================================

let config: GovernanceConfig = { ...DEFAULT_CONFIG };

// ============================================================================
// Signature Management
// ============================================================================

const SIGNATURE_REGEX = /\[[🔥>⚙️🎯✨💎🧠\/\s\w-]+\]/g;

/**
 * Check if message already has a valid signature
 */
function hasValidSignature(content: string): boolean {
  return SIGNATURE_REGEX.test(content);
}

/**
 * Generate signature for an agent
 */
function generateSignature(agentId?: string, modelAlias?: string): string {
  const agent = agentId ? config.agents[agentId] : undefined;
  const emoji = agent?.emoji || config.agents.default?.emoji || "🧠";
  const model = modelAlias ? `/${modelAlias}` : "";
  
  return `[${emoji}${model}]`;
}

/**
 * Get agent emoji by ID
 */
export function getAgentEmoji(agentId?: string): string {
  return config.agents[agentId || "default"]?.emoji || "🧠";
}

/**
 * Inject signature into message content if missing
 */
function injectSignature(content: string, agentId?: string, modelAlias?: string): string {
  if (!config.requireSignature) return content;
  if (hasValidSignature(content)) return content;
  
  const signature = generateSignature(agentId, modelAlias);
  return `${signature} ${content}`;
}

// ============================================================================
// Tool Call Governance
// ============================================================================

/**
 * Check if tool call should be blocked
 */
function shouldBlockTool(toolName: string): { blocked: boolean; reason?: string } {
  if (!config.enabled) return { blocked: false };
  
  // Check if tool is in blocked list
  if (config.blockedTools.includes(toolName)) {
    return {
      blocked: true,
      reason: `Tool '${toolName}' is blocked by governance policy. Use agent delegation instead.`,
    };
  }
  
  // Block dangerous operations in strict mode
  if (config.strictMode) {
    const dangerousTools = ["write", "edit", "exec"];
    if (dangerousTools.includes(toolName)) {
      return {
        blocked: true,
        reason: `Tool '${toolName}' requires agent delegation. Prometheus creates, Faber applies.`,
      };
    }
  }
  
  return { blocked: false };
}

// ============================================================================
// Subagent Governance
// ============================================================================

/**
 * Validate subagent label
 */
function validateSubagentLabel(label?: string): { valid: boolean; error?: string } {
  if (!config.enabled) return { valid: true };
  
  if (!label) {
    return {
      valid: false,
      error: "Subagent requires a valid label for governance tracking",
    };
  }
  
  if (config.allowedSubagentLabels.length > 0) {
    if (!config.allowedSubagentLabels.includes(label)) {
      const knownAgents = Object.keys(config.agents).join(", ");
      return {
        valid: false,
        error: `Subagent label '${label}' not in allowed list. Known agents: ${knownAgents}`,
      };
    }
  }
  
  return { valid: true };
}

// ============================================================================
// Hook Handlers
// ============================================================================

/**
 * before_tool_call hook handler
 * Blocks unauthorized tool calls
 */
export async function onBeforeToolCall(
  event: PluginHookBeforeToolCallEvent,
  ctx: PluginHookToolContext,
): Promise<PluginHookBeforeToolCallResult | void> {
  if (!config.enabled) return;
  
  const { toolName, params } = event;
  const { agentId, sessionKey } = ctx;
  
  console.log(`[governance] Tool call: ${toolName} by ${agentId || "unknown"}`);
  
  const blockCheck = shouldBlockTool(toolName);
  
  if (blockCheck.blocked) {
    console.log(`[governance] BLOCKED: ${toolName}`);
    return {
      block: true,
      blockReason: blockCheck.reason,
    };
  }
  
  // Log allowed tool calls for audit
  console.log(`[governance] ALLOWED: ${toolName} by ${agentId} in ${sessionKey}`);
}

/**
 * subagent_spawning hook handler
 * Validates subagent creation
 */
export async function onSubagentSpawning(
  event: PluginHookSubagentSpawningEvent,
  ctx: PluginHookSubagentContext,
): Promise<PluginHookSubagentSpawningResult | void> {
  if (!config.enabled) return;
  
  // Extract label from event context if available
  const label = (event as any).label || (event as any).task?.slice(0, 50);
  
  console.log(`[governance] Subagent spawning requested: ${label || "unknown"}`);
  
  const validation = validateSubagentLabel(label);
  
  if (!validation.valid) {
    console.log(`[governance] REJECTED subagent: ${validation.error}`);
    return {
      status: "error",
      error: validation.error || "Subagent validation failed",
    };
  }
  
  console.log(`[governance] ALLOWED subagent: ${label}`);
  return {
    status: "ok",
    threadBindingReady: true,
  };
}

/**
 * before_agent_reply hook handler
 * Injects mandatory signatures into agent responses
 */
export async function onBeforeAgentReply(
  event: PluginHookBeforeAgentReplyEvent,
  ctx: PluginHookAgentContext,
): Promise<PluginHookBeforeAgentReplyResult | void> {
  if (!config.enabled || !config.requireSignature) return;
  
  const { agentId } = ctx;
  const { message } = event;
  
  // Skip if no message content to modify
  if (!message || typeof message.content !== "string") return;
  
  // Check if already has signature
  if (hasValidSignature(message.content)) return;
  
  // Inject signature
  const signedContent = injectSignature(message.content, agentId);
  
  console.log(`[governance] Injected signature for ${agentId}`);
  
  return {
    message: {
      ...message,
      content: signedContent,
    },
  };
}

// ============================================================================
// Configuration API
// ============================================================================

/**
 * Initialize governance with config file or custom config
 */
export function initializeGovernance(userConfig?: Partial<GovernanceConfig>) {
  // Load from file first
  const fileConfig = loadConfig();
  
  // Merge with user provided config
  config = {
    ...fileConfig,
    ...userConfig,
    agents: {
      ...fileConfig.agents,
      ...(userConfig?.agents || {}),
    },
  };
  
  console.log("[governance] Initialized with agents:", Object.keys(config.agents).join(", "));
  return config;
}

export function getGovernanceConfig(): GovernanceConfig {
  return { ...config };
}

export function setGovernanceConfig(newConfig: Partial<GovernanceConfig>) {
  config = { ...config, ...newConfig };
}

/**
 * Add a new agent to governance
 */
export function registerAgent(
  agentId: string,
  emoji: string,
  name: string,
  role: string
): void {
  config = addAgent(config, agentId, emoji, name, role);
  console.log(`[governance] Registered agent: ${name} (${agentId}) ${emoji}`);
}

/**
 * Remove an agent from governance
 */
export function unregisterAgent(agentId: string): void {
  config = removeAgent(config, agentId);
  console.log(`[governance] Unregistered agent: ${agentId}`);
}

/**
 * List all registered agents
 */
export function listAgents(): AgentRegistry {
  return { ...config.agents };
}

// ============================================================================
// Plugin Export
// ============================================================================

export default {
  name: "governance",
  version: "1.0.0",
  hooks: {
    before_tool_call: onBeforeToolCall,
    subagent_spawning: onSubagentSpawning,
    before_agent_reply: onBeforeAgentReply,
  },
  initialize: initializeGovernance,
  // Public API
  registerAgent,
  unregisterAgent,
  listAgents,
  getConfig: getGovernanceConfig,
  setConfig: setGovernanceConfig,
};
