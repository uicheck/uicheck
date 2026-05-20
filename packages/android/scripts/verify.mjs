import { access, readFile, stat } from 'node:fs/promises'
import { spawn } from 'node:child_process'

const requiredFiles = [
  'build.gradle.kts',
  'gradle.properties',
  'settings.gradle.kts',
  'src/main/AndroidManifest.xml',
  'src/main/java/ai/uicheck/android/UiCheckAndroid.kt',
  'src/test/java/ai/uicheck/android/UiCheckAndroidClientTest.kt',
  'README.md',
  'README.zh-CN.md'
]

for (const file of requiredFiles) {
  await access(new URL(`../${file}`, import.meta.url))
}

const source = await readFile(new URL('../src/main/java/ai/uicheck/android/UiCheckAndroid.kt', import.meta.url), 'utf8')
const requiredSourceSnippets = [
  'class UiCheckAndroidClient',
  'initUiCheck',
  'rootView',
  'createAndroidViewScreenshotProvider',
  'inspect_elements',
  'capture_page',
  'OkHttpClient'
]

for (const snippet of requiredSourceSnippets) {
  if (!source.includes(snippet)) {
    throw new Error(`Missing Android client source snippet: ${snippet}`)
  }
}

const gradleTask = process.argv[2]
if (!gradleTask) process.exit(0)

async function hasDirectory(value) {
  if (!value) return false
  try {
    return (await stat(value)).isDirectory()
  } catch {
    return false
  }
}

const androidSdkRoot = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME
const android35Platform = androidSdkRoot ? `${androidSdkRoot.replace(/\/$/, '')}/platforms/android-35` : undefined
const hasAndroidSdk =
  (await hasDirectory(androidSdkRoot)) &&
  (await hasDirectory(android35Platform))

if (!hasAndroidSdk) {
  console.warn('Android SDK platform android-35 not found. Verified Android source structure; skipping Gradle task.')
  process.exit(0)
}

await new Promise((resolve, reject) => {
  const child = spawn('./gradlew', [gradleTask], {
    cwd: new URL('..', import.meta.url),
    stdio: 'inherit',
    env: {
      ...process.env,
      JAVA_HOME: process.env.JAVA_HOME || '/usr/local/opt/openjdk/libexec/openjdk.jdk/Contents/Home'
    }
  })
  child.on('error', reject)
  child.on('exit', (code) => {
    if (code === 0) resolve()
    else reject(new Error(`gradle ${gradleTask} exited with code ${code}`))
  })
})
