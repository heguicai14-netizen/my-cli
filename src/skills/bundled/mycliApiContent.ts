// Content for the claude-api bundled skill.
// Each .md file is inlined as a string at build time via Bun's text loader.

import csharpClaudeApi from './mycli-api/csharp/mycli-api.md'
import curlExamples from './mycli-api/curl/examples.md'
import goClaudeApi from './mycli-api/go/mycli-api.md'
import javaClaudeApi from './mycli-api/java/mycli-api.md'
import phpClaudeApi from './mycli-api/php/mycli-api.md'
import pythonAgentSdkPatterns from './mycli-api/python/agent-sdk/patterns.md'
import pythonAgentSdkReadme from './mycli-api/python/agent-sdk/README.md'
import pythonClaudeApiBatches from './mycli-api/python/mycli-api/batches.md'
import pythonClaudeApiFilesApi from './mycli-api/python/mycli-api/files-api.md'
import pythonClaudeApiReadme from './mycli-api/python/mycli-api/README.md'
import pythonClaudeApiStreaming from './mycli-api/python/mycli-api/streaming.md'
import pythonClaudeApiToolUse from './mycli-api/python/mycli-api/tool-use.md'
import rubyClaudeApi from './mycli-api/ruby/mycli-api.md'
import skillPrompt from './mycli-api/SKILL.md'
import sharedErrorCodes from './mycli-api/shared/error-codes.md'
import sharedLiveSources from './mycli-api/shared/live-sources.md'
import sharedModels from './mycli-api/shared/models.md'
import sharedPromptCaching from './mycli-api/shared/prompt-caching.md'
import sharedToolUseConcepts from './mycli-api/shared/tool-use-concepts.md'
import typescriptAgentSdkPatterns from './mycli-api/typescript/agent-sdk/patterns.md'
import typescriptAgentSdkReadme from './mycli-api/typescript/agent-sdk/README.md'
import typescriptClaudeApiBatches from './mycli-api/typescript/mycli-api/batches.md'
import typescriptClaudeApiFilesApi from './mycli-api/typescript/mycli-api/files-api.md'
import typescriptClaudeApiReadme from './mycli-api/typescript/mycli-api/README.md'
import typescriptClaudeApiStreaming from './mycli-api/typescript/mycli-api/streaming.md'
import typescriptClaudeApiToolUse from './mycli-api/typescript/mycli-api/tool-use.md'

// @[MODEL LAUNCH]: Update the model IDs/names below. These are substituted into {{VAR}}
// placeholders in the .md files at runtime before the skill prompt is sent.
// After updating these constants, manually update the two files that still hardcode models:
//   - claude-api/SKILL.md (Current Models pricing table)
//   - claude-api/shared/models.md (full model catalog with legacy versions and alias mappings)
export const SKILL_MODEL_VARS = {
  OPUS_ID: 'claude-opus-4-6',
  OPUS_NAME: 'Claude Opus 4.6',
  SONNET_ID: 'claude-sonnet-4-6',
  SONNET_NAME: 'Claude Sonnet 4.6',
  HAIKU_ID: 'claude-haiku-4-5',
  HAIKU_NAME: 'Claude Haiku 4.5',
  // Previous Sonnet ID — used in "do not append date suffixes" example in SKILL.md.
  PREV_SONNET_ID: 'claude-sonnet-4-5',
} satisfies Record<string, string>

export const SKILL_PROMPT: string = skillPrompt

export const SKILL_FILES: Record<string, string> = {
  'csharp/claude-api.md': csharpClaudeApi,
  'curl/examples.md': curlExamples,
  'go/claude-api.md': goClaudeApi,
  'java/claude-api.md': javaClaudeApi,
  'php/claude-api.md': phpClaudeApi,
  'python/agent-sdk/README.md': pythonAgentSdkReadme,
  'python/agent-sdk/patterns.md': pythonAgentSdkPatterns,
  'python/claude-api/README.md': pythonClaudeApiReadme,
  'python/claude-api/batches.md': pythonClaudeApiBatches,
  'python/claude-api/files-api.md': pythonClaudeApiFilesApi,
  'python/claude-api/streaming.md': pythonClaudeApiStreaming,
  'python/claude-api/tool-use.md': pythonClaudeApiToolUse,
  'ruby/claude-api.md': rubyClaudeApi,
  'shared/error-codes.md': sharedErrorCodes,
  'shared/live-sources.md': sharedLiveSources,
  'shared/models.md': sharedModels,
  'shared/prompt-caching.md': sharedPromptCaching,
  'shared/tool-use-concepts.md': sharedToolUseConcepts,
  'typescript/agent-sdk/README.md': typescriptAgentSdkReadme,
  'typescript/agent-sdk/patterns.md': typescriptAgentSdkPatterns,
  'typescript/claude-api/README.md': typescriptClaudeApiReadme,
  'typescript/claude-api/batches.md': typescriptClaudeApiBatches,
  'typescript/claude-api/files-api.md': typescriptClaudeApiFilesApi,
  'typescript/claude-api/streaming.md': typescriptClaudeApiStreaming,
  'typescript/claude-api/tool-use.md': typescriptClaudeApiToolUse,
}
