plugins {
  id("com.android.library") version "8.6.1"
  id("org.jetbrains.kotlin.android") version "1.9.24"
}

android {
  namespace = "ai.uicheck.android"
  compileSdk = 35

  defaultConfig {
    minSdk = 23
    testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    consumerProguardFiles("consumer-rules.pro")
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }
}

kotlin {
  jvmToolchain(17)
}

dependencies {
  implementation("com.squareup.okhttp3:okhttp:4.12.0")
  implementation("org.json:json:20240303")

  testImplementation("junit:junit:4.13.2")
}
