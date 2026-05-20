plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.android")
}

android {
  namespace = "ai.uicheck.demo"
  compileSdk = 35

  defaultConfig {
    applicationId = "ai.uicheck.demo"
    minSdk = 23
    targetSdk = 35
    versionCode = 1
    versionName = "0.0.0"
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
  implementation("ai.uicheck.android:uicheck-android")
  testImplementation("com.squareup.okhttp3:okhttp:4.12.0")
  testImplementation("junit:junit:4.13.2")
  testImplementation("org.robolectric:robolectric:4.15.1")
  testImplementation("ai.uicheck.android:uicheck-android")
}
