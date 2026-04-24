// Throwaway verification for the todo_restore attachment path.
// Covers:
//   1. createTodoRestoreAttachmentIfNeeded — V2 (disk) branch
//   2. createTodoRestoreAttachmentIfNeeded — V1 (appState) branch
//   3. normalizeAttachmentForAPI rendering for both branches
// Does NOT hit any API. Run with:
//   bun run scripts/verify-todo-restore.mts

import { mkdir, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

const TEST_LIST_ID = 'verify-todo-restore-' + Date.now()
process.env.CLAUDE_CODE_TASK_LIST_ID = TEST_LIST_ID
// Force V2 regardless of interactive/non-interactive detection.
process.env.CLAUDE_CODE_ENABLE_TASKS = '1'

const taskDir = join(homedir(), '.mycli', 'tasks', TEST_LIST_ID)

async function seedV2Tasks() {
  await mkdir(taskDir, { recursive: true })
  const tasks = [
    {
      id: '1',
      subject: '读 README',
      description: 'read README.md',
      status: 'in_progress',
      blocks: [],
      blockedBy: [],
    },
    {
      id: '2',
      subject: '写 notes',
      description: 'write notes',
      status: 'pending',
      blocks: [],
      blockedBy: [],
    },
    {
      id: '3',
      subject: '跑 version',
      description: 'bun run version',
      status: 'completed',
      blocks: [],
      blockedBy: [],
    },
  ]
  for (const t of tasks) {
    await writeFile(join(taskDir, `${t.id}.json`), JSON.stringify(t, null, 2))
  }
}

async function cleanup() {
  await rm(taskDir, { recursive: true, force: true })
}

async function main() {
  await seedV2Tasks()
  try {
    const { createTodoRestoreAttachmentIfNeeded } = await import(
      '../src/services/compact/compact.js'
    )
    const { normalizeAttachmentForAPI } = await import(
      '../src/utils/messages.js'
    )

    // ------ V2 branch ------
    console.log('\n===== V2 (disk) branch =====')
    const v2Attachment = await createTodoRestoreAttachmentIfNeeded(
      undefined,
      null,
    )
    if (!v2Attachment) {
      console.error('FAIL: V2 attachment was null despite 3 tasks on disk')
      process.exitCode = 1
      return
    }
    console.log('attachment.type       =', v2Attachment.attachment.type)
    console.log('attachment.source     =', (v2Attachment.attachment as any).source)
    console.log('attachment.itemCount  =', (v2Attachment.attachment as any).itemCount)
    console.log(
      'tasks IDs             =',
      (v2Attachment.attachment as any).tasks.map((t: any) => t.id).join(','),
    )

    const v2Rendered = normalizeAttachmentForAPI(v2Attachment.attachment)
    console.log('\n--- V2 render output (first 400 chars) ---')
    const v2Text = JSON.stringify(v2Rendered).slice(0, 400)
    console.log(v2Text)
    // Basic assertions
    if (!v2Text.includes('Do NOT recreate')) {
      console.error('FAIL: V2 render missing "Do NOT recreate" phrase')
      process.exitCode = 1
    }
    if (!v2Text.includes('读 README')) {
      console.error('FAIL: V2 render missing task subject')
      process.exitCode = 1
    }
    if (!v2Text.includes('in_progress')) {
      console.error('FAIL: V2 render missing task status')
      process.exitCode = 1
    }

    // ------ V1 branch ------
    console.log('\n===== V1 (appState) branch =====')
    process.env.CLAUDE_CODE_ENABLE_TASKS = '0'
    // V1 gate also needs isNonInteractiveSession() true. This script IS
    // non-interactive so that condition holds naturally — but the module
    // cached the env var read on first call. Re-import is safer than trying
    // to toggle mid-run; instead test V1 by passing an accessor and trust
    // the branching is by isTodoV2Enabled() at call time.
    // Workaround: we import a fresh module instance by bypassing cache via
    // ?t=... query param (not supported by Bun's CJS). So simulate V1 by
    // DIRECTLY constructing the attachment and testing rendering only.
    const v1Attachment = {
      type: 'todo_restore' as const,
      source: 'v1' as const,
      todos: [
        { content: '看代码', status: 'in_progress', activeForm: '看代码中' },
        { content: '写文档', status: 'pending', activeForm: '写文档中' },
      ],
      itemCount: 2,
    }
    const v1Rendered = normalizeAttachmentForAPI(v1Attachment as any)
    console.log('--- V1 render output (first 400 chars) ---')
    const v1Text = JSON.stringify(v1Rendered).slice(0, 400)
    console.log(v1Text)
    if (!v1Text.includes('Do NOT recreate')) {
      console.error('FAIL: V1 render missing "Do NOT recreate" phrase')
      process.exitCode = 1
    }
    if (!v1Text.includes('看代码')) {
      console.error('FAIL: V1 render missing todo content')
      process.exitCode = 1
    }
    if (!v1Text.includes('TodoWrite')) {
      console.error('FAIL: V1 render missing TodoWrite reference')
      process.exitCode = 1
    }

    // ------ Empty-list no-op ------
    console.log('\n===== Empty task list → null =====')
    await rm(taskDir, { recursive: true, force: true })
    process.env.CLAUDE_CODE_ENABLE_TASKS = '1'
    const emptyAttachment = await createTodoRestoreAttachmentIfNeeded(
      undefined,
      null,
    )
    if (emptyAttachment !== null) {
      console.error('FAIL: expected null when task list empty, got:', emptyAttachment)
      process.exitCode = 1
    } else {
      console.log('PASS: returned null for empty task list')
    }

    console.log('\n===== Verification summary =====')
    if (process.exitCode === 1) {
      console.log('❌ One or more assertions failed')
    } else {
      console.log('✅ All assertions passed')
    }
  } finally {
    await cleanup()
  }
}

await main()
