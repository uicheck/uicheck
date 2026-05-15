import { readFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'

const requiredFiles = [
  'pubspec.yaml',
  'lib/uicheck_flutter.dart',
  'lib/src/uicheck_flutter_client.dart',
  'test/uicheck_flutter_test.dart',
  'README.md',
  'README.zh-CN.md'
]

for (const file of requiredFiles) {
  await readFile(new URL(`../${file}`, import.meta.url), 'utf8')
}

const source = await readFile(new URL('../lib/src/uicheck_flutter_client.dart', import.meta.url), 'utf8')
const requiredSourceSnippets = [
  'class UiCheckFlutterClient',
  'installFlutterUiCheck',
  'registerFlutterUiCheckElement',
  'captureRepaintBoundaryAsPng',
  'inspect_elements',
  'capture_page',
  'get_element_at_point',
  'WebSocketChannel.connect'
]

for (const snippet of requiredSourceSnippets) {
  if (!source.includes(snippet)) {
    throw new Error(`Missing Flutter client source snippet: ${snippet}`)
  }
}

const lifecycle = process.env.npm_lifecycle_event
const command = process.argv[2] ?? lifecycle

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: new URL('..', import.meta.url),
      stdio: 'inherit'
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`))
    })
  })
}

await run('flutter', ['pub', 'get'])

if (command === 'typecheck') {
  await run('flutter', ['analyze'])
} else {
  await run('flutter', ['test'])
}
