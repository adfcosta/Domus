# Governance Extension for OpenClaw

Extensão de governança para controle e auditoria de agentes no OpenClaw.

## Funcionalidades

- ✅ **Assinaturas obrigatórias** em mensagens de agentes
- 🚫 **Bloqueio de tool calls** perigosas (write, edit, exec)
- 👮 **Validação de subagentes** com labels controlados
- 📊 **Auditoria** de todas as ações
- 🔧 **Configurável** via JSON — adicione novos agentes facilmente

## Instalação

1. Copie esta pasta para `extensions/governance/` no seu OpenClaw
2. Configure editando `governance.config.json`
3. Ative a extensão:

```bash
openclaw extension enable governance
```

## Configuração

### Arquivo de Configuração

Crie um arquivo `governance.config.json` no diretório de trabalho ou em `~/.openclaw/`:

```json
{
  "enabled": true,
  "strictMode": true,
  "requireSignature": true,
  "blockedTools": [],
  "allowedSubagentLabels": ["prometheus", "faber", "janus", "vita", "aurum"],
  "requireSubagentSignature": true,
  "signatureTemplate": "[{emoji}]",
  "agents": {
    "prometheus": {
      "emoji": "🔥",
      "name": "Prometheus",
      "role": "programador"
    },
    "faber": {
      "emoji": "⚙️",
      "name": "Faber",
      "role": "executor"
    }
  }
}
```

### Opções

| Opção | Descrição | Padrão |
|-------|-----------|--------|
| `enabled` | Ativa/desativa a governança | `true` |
| `strictMode` | Modo estrito (bloqueia ferramentas perigosas) | `true` |
| `requireSignature` | Exige assinatura em mensagens | `true` |
| `blockedTools` | Lista de ferramentas bloqueadas | `[]` |
| `allowedSubagentLabels` | Labels permitidos para subagentes | `[]` |
| `requireSubagentSignature` | Exige validação de subagentes | `true` |
| `agents` | Registro de agentes e emojis | `{...}` |

### Adicionando Novos Agentes

Simplesmente adicione ao objeto `agents` no JSON:

```json
{
  "agents": {
    "meu_agente": {
      "emoji": "🚀",
      "name": "Meu Agente",
      "role": "especialista"
    }
  }
}
```

O agente será automaticamente:
- ✅ Adicionado à lista de labels permitidos
- ✅ Receberá assinatura automática (`[🚀]`)
- ✅ Poderá spawnar subagentes

### API Programática

```typescript
import governance from './extensions/governance/src/index.js';

// Registrar novo agente em runtime
governance.registerAgent('novo', '🎨', 'Artista', 'design');

// Listar agentes
const agents = governance.listAgents();
// { prometheus: {emoji: "🔥", ...}, novo: {emoji: "🎨", ...} }

// Remover agente
governance.unregisterAgent('novo');
```

## Agentes Padrão

| Agente | Emoji | Função |
|--------|-------|--------|
| Prometheus | 🔥 | Programador |
| Faber | ⚙️ | Executor |
| Janus | 🎯 | Coordenador |
| Vita | ✨ | Tarefas |
| Aurum | 💎 | Qualidade |

## Regras de Governança

### 1. Criação vs Execução

```
Prometheus cria → Faber aplica
```

- **Prometheus** pode propor código/scripts (readonly)
- **Faber** aplica mudanças no sistema

### 2. Bloqueio de Ferramentas

Ferramentas bloqueadas em `strictMode`:
- `write` → usar delegação para Faber
- `edit` → usar delegação para Faber  
- `exec` → usar delegação para Faber

### 3. Assinaturas de Agentes

Assinaturas são injetadas automaticamente:
- `[🔥]` Prometheus
- `[⚙️]` Faber
- `[🎯]` Janus
- `[✨]` Vita
- `[💎]` Aurum

Novos agentes seguem o padrão configurado.

### 4. Subagentes

Subagentes devem ter labels da lista permitida:
- ✅ `sessions_spawn({ label: "prometheus", ... })`
- ❌ `sessions_spawn({ label: "desconhecido", ... })` → Bloqueado

## Hooks Utilizados

| Hook | Função |
|------|--------|
| `before_tool_call` | Bloqueia chamadas não autorizadas |
| `subagent_spawning` | Valida criação de subagentes |
| `before_agent_reply` | Injeta assinaturas obrigatórias |

## Logs

A extensão loga todas as ações:

```
[governance] Tool call: read by prometheus
[governance] ALLOWED: read by prometheus in session:abc123
[governance] BLOCKED: write
[governance] ALLOWED subagent: prometheus
[governance] Injected signature for prometheus
```

## Segurança

- ✅ Não modifica código do core do OpenClaw
- ✅ Usa apenas hooks públicos do sistema de plugins
- ✅ Pode ser desativada sem quebrar o sistema
- ✅ Configuração em arquivo separado
- ✅ Suporta hot-reload de config

## Atualizações

Para atualizar o OpenClaw sem perder a governança:
1. Mantenha a pasta `extensions/governance/`
2. Mantenha seu `governance.config.json`
3. A extensão continuará funcionando após updates

## Locais de Configuração

A extensão procura config em (ordem de prioridade):
1. `$GOVERNANCE_CONFIG` (env var)
2. `./governance.config.json` (diretório atual)
3. `$OPENCLAW_WORKSPACE/.openclaw/governance.config.json`
4. `~/.openclaw/governance.config.json`

## Licença

MIT - Parte do projeto Domus
