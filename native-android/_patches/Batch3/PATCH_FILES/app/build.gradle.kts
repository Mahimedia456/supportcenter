plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.mahimediasolutions.supportcenter.nativeapp"
    compileSdk = 35

    defaultConfig {
        // Separate test ID: does not replace the existing React Native installation.
        applicationId = "com.mahimediasolutions.supportcenter.nativeapp"
        minSdk = 26
        targetSdk = 35
        versionCode = 3
        versionName = "0.3.0-native-b3"
        buildConfigField("String", "API_BASE_URL", "\"https://supportcenter-kappa.vercel.app\"")
    }

    // Optional production keystore. Never put signing passwords in source control.
    signingConfigs {
        val keyPath = System.getenv("SC_RELEASE_KEYSTORE")
        val keyAlias = System.getenv("SC_RELEASE_ALIAS")
        val storePass = System.getenv("SC_RELEASE_STORE_PASS")
        val keyPass = System.getenv("SC_RELEASE_KEY_PASS")
        if (!keyPath.isNullOrBlank() && !keyAlias.isNullOrBlank() &&
            !storePass.isNullOrBlank() && !keyPass.isNullOrBlank()) {
            create("supportcenterRelease") {
                storeFile = file(keyPath)
                storePassword = storePass
                this.keyAlias = keyAlias
                keyPassword = keyPass
            }
        }
    }
    buildTypes {
        release {
            if (signingConfigs.names.contains("supportcenterRelease")) {
                signingConfig = signingConfigs.getByName("supportcenterRelease")
            }
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { compose = true; buildConfig = true }
    packaging { resources { excludes += "/META-INF/{AL2.0,LGPL2.1}" } }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2025.04.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation("androidx.core:core-ktx:1.16.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.9.2")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.2")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    debugImplementation("androidx.compose.ui:ui-tooling")
}
