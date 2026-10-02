import java.util.Properties
import java.security.MessageDigest

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

val releaseSecrets = Properties().apply {
    val configuration = rootProject.file("keystore.properties")
    if (configuration.isFile) configuration.inputStream().use { load(it) }
}
fun signingValue(name: String): String? =
    providers.environmentVariable("GREMIA_ANDROID_${name}").orNull
        ?: releaseSecrets.getProperty(name)

val releaseStore = signingValue("STORE_FILE")?.let { rootProject.file(it) }
val releaseStorePassword = signingValue("STORE_PASSWORD")
val releaseKeyAlias = signingValue("KEY_ALIAS")
val releaseKeyPassword = signingValue("KEY_PASSWORD")?.takeIf { it.isNotEmpty() }
    ?: releaseStorePassword
val releaseSigningReady = releaseStore?.isFile == true &&
    listOf(releaseStorePassword, releaseKeyAlias, releaseKeyPassword).all { !it.isNullOrBlank() }

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

    signingConfigs {
        if (releaseSigningReady) {
            create("distribution") {
                storeFile = releaseStore
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    buildTypes {
        release {
            if (releaseSigningReady) signingConfig = signingConfigs.getByName("distribution")
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

val validateReleaseSigning by tasks.registering {
    doLast {
        check(releaseSigningReady) {
            "Release-Signierung fehlt oder ist unvollständig. keystore.properties oder GREMIA_ANDROID_* konfigurieren; siehe companion-app/README.md."
        }
    }
}
tasks.matching { it.name == "preReleaseBuild" }.configureEach {
    dependsOn(validateReleaseSigning)
}

tasks.register("releaseChecksum") {
    description = "Erzeugt SHA-256-Prüfsumme der signierten Release-APK."
    dependsOn("assembleRelease")
    doLast {
        val apk = layout.buildDirectory.file("outputs/apk/release/app-release.apk").get().asFile
        check(apk.isFile) { "Signierte Release-APK fehlt." }
        val digest = MessageDigest.getInstance("SHA-256")
        apk.inputStream().use { input ->
            val buffer = ByteArray(65536)
            var count = input.read(buffer)
            while (count != -1) {
                digest.update(buffer, 0, count)
                count = input.read(buffer)
            }
        }
        val hash = digest.digest().joinToString("") { "%02x".format(it) }
        apk.resolveSibling("${apk.name}.sha256").writeText("$hash  ${apk.name}\n")
    }
}

dependencies {
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("com.journeyapps:zxing-android-embedded:4.3.0")
    implementation("org.bouncycastle:bcprov-jdk18on:1.85.2")
    testImplementation(kotlin("test"))
    testImplementation("org.json:json:20240303")
}

tasks.withType<Test>().configureEach {
    systemProperty("gremia.repository", rootProject.projectDir.resolve("../..").canonicalPath)
}
