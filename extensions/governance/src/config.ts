/**
 * Governance Extension Configuration Loader
 * 
 * Loads user configuration from governance.config.json
 * Falls back to defaults if file not found
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { GovernanceConfig, AgentRegistry } from "./types.js";

// Default agent signatures
export const DEFAULT_AGENT_SIGNATURES: AgentRegistry = {
  prometheus: { emoji: "🔥", name: "Prometheus", role: "programador" },
  faber: { emoji: "⚙️", name: "Faber", role: "executor" },
  janus: { emoji: "🎯", name: "Janus", role: "coordenador" },
  vita: { emoji: "✨", name: "Vita", role: "tarefas" },
  aurum: { emoji: "💎", name: "Aurum", role: "qualidade" },
};

// Default configuration
export const DEFAULT_CONFIG: GovernanceConfig = {
  enabled: true,
  strictMode: true,
  requireSignature: true,
  blockedTools: [],
  allowedSubagentLabels: Object.keys(DEFAULT_AGENT_SIGNATURES),
  requireSubagentSignature: true,
  signatureTemplate: "[{emoji}]",
  agents: DEFAULT_AGENT_SIGNATURES,
};

// Config file paths to try (in order of priority)
function getConfigPaths(): string[] {
  const paths = [];
  
  // Environment variable override
  if (process.env.GOVERNANCE_CONFIG) {
    paths.push(process.env.GOVERNANCE_CONFIG);
  }
  
  // Current working directory
  paths.push(join(process.cwd(), "governance.config.json"));
  
  // OpenClaw workspace config directory
  if (process.env.OPENCLAW_WORKSPACE) {
    paths.push(join(process.env.OPENCLAW_WORKSPACE, ".openclaw", "governance.config.json"));
  }
  
  // Home directory
  if (process.env.HOME) {
    paths.push(join(process.env.HOME, ".openclaw", "governance.config.json"));
  }
  
  return paths;
}

/**
 * Load configuration from file or return defaults
 */
export function loadConfig(): GovernanceConfig {
  const paths = getConfigPaths();
  
  for (const configPath of paths) {
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, "utf-8");
        const userConfig = JSON.parse(content);
        
        // Merge user agents with defaults
        const mergedAgents = {
          ...DEFAULT_AGENT_SIGNATURES,
          ...(userConfig.agents || {}),
        };
        
        // Merge allowed labels
        const defaultLabels = Object.keys(DEFAULT_AGENT_SIGNATURES);
        const userLabels = userConfig.allowedSubagentLabels;
        const mergedLabels = userLabels 
          ? [...new Set([...defaultLabels, ...userLabels])]
          : defaultLabels;
        
        return {
          ...DEFAULT_CONFIG,
          ...userConfig,
          agents: mergedAgents,
          allowedSubagentLabels: mergedLabels,
        };
      } catch (err) {
        console.error(`[governance] Failed to load config from ${configPath}:`, err);
      }
    }
  }
  
  return { ...DEFAULT_CONFIG };
}

/**
 * Save current configuration to file
 */
export function saveConfig(config: GovernanceConfig, path?: string): void {
  const configPath = path || join(process.cwd(), "governance.config.json");
  const fs = await import("fs");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

/**
 * Add a new agent dynamically
 */
export function addAgent(
  config: GovernanceConfig,
  agentId: string,
  emoji: string,
  name: string,
  role: string
): GovernanceConfig {
  return {
    ...config,
    agents: {
      ...config.agents,
      [agentId]: { emoji, name, role },
    },
    allowedSubagentLabels: [...config.allowedSubagentLabels, agentId],
  };
}

/**
 * Remove an agent
 */
export function removeAgent(
  config: GovernanceConfig,
  agentId: string
): GovernanceConfig {
  const { [agentId]: _, ...remainingAgents } = config.agents;
  return {
    ...config,
    agents: remainingAgents,
    allowedSubagentLabels: config.allowedSubagentLabels.filter(l => l !== agentId),
  };
}
