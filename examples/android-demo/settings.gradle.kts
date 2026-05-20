pluginManagement {
  repositories {
    google()
    mavenCentral()
    gradlePluginPortal()
  }
}

dependencyResolutionManagement {
  repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
  repositories {
    google()
    mavenCentral()
  }
}

rootProject.name = "UICheckAndroidDemo"
include(":app")
includeBuild("../../packages/android") {
  dependencySubstitution {
    substitute(module("ai.uicheck.android:uicheck-android")).using(project(":"))
  }
}
