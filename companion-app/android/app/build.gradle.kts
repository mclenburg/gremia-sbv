plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

android {
    namespace = "de.gremia.sbv.companion"
    compileSdk = 35

    defaultConfig {
        applicationId = "de.gremia.sbv.companion"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.9.8"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
        debug {
            applicationIdSuffix = ".debug"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlin {
        compilerOptions {
            jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
        }
    }
}

dependencies {
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("com.journeyapps:zxing-android-embedded:4.3.0")
    implementation("org.bouncycastle:bcprov-jdk18on:1.85.2")
    testImplementation(kotlin("test"))
}
