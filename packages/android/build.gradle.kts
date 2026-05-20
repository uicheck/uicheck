plugins {
  id("com.android.library") version "8.6.1"
  id("org.jetbrains.kotlin.android") version "1.9.24"
  id("maven-publish")
}

android {
  namespace = "ai.uicheck.android"
  compileSdk = 35

  defaultConfig {
    minSdk = 23
    testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    consumerProguardFiles("consumer-rules.pro")
  }

  publishing {
    singleVariant("release") {
      withSourcesJar()
    }
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }

  testOptions {
    unitTests.isIncludeAndroidResources = true
  }
}

kotlin {
  jvmToolchain(17)
}

dependencies {
  implementation("com.squareup.okhttp3:okhttp:4.12.0")
  implementation("org.json:json:20240303")

  testImplementation("junit:junit:4.13.2")
  testImplementation("org.robolectric:robolectric:4.15.1")
}

publishing {
  publications {
    create<MavenPublication>("release") {
      groupId = "ai.uicheck"
      artifactId = "uicheck-android"
      version = "0.1.4"

      afterEvaluate {
        from(components["release"])
      }
    }
  }

  repositories {
    maven {
      name = "GitHubPackages"
      url = uri("https://maven.pkg.github.com/uicheck/uicheck")
      credentials {
        username = System.getenv("GITHUB_ACTOR")
        password = System.getenv("GITHUB_TOKEN")
      }
    }
  }
}
