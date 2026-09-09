plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("maven-publish")
    id("signing")
}

android {
    namespace = "app.quiltt.connector"
    compileSdk = 33

    defaultConfig {
        // Support down to Android 8.0 (API level 26)
        minSdk = 26

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        consumerProguardFiles("consumer-rules.pro")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            enableUnitTestCoverage = true
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
    testOptions {
        unitTests {
            isIncludeAndroidResources = true
            all { test ->
                // Use locally installed Android SDK when available (e.g. CI runners)
                // to avoid Robolectric downloading framework JARs from Maven at test time.
                val sdkRoot = System.getenv("ANDROID_SDK_ROOT") ?: System.getenv("ANDROID_HOME")
                if (sdkRoot != null) {
                    test.jvmArgs(
                        "-Drobolectric.dependency.repo.id=local",
                        "-Drobolectric.dependency.repo.dir=$sdkRoot",
                    )
                }
            }
        }
    }
}

dependencies {
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.12.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
    
    // Direct dependencies to fix security vulnerabilities in transitive dependencies
    implementation("org.bouncycastle:bcprov-jdk18on:1.84")
    implementation("io.netty:netty-codec:4.1.137.Final")
    implementation("io.netty:netty-codec-http:4.1.137.Final")
    implementation("io.netty:netty-codec-http2:4.1.137.Final")
    implementation("io.netty:netty-handler:4.1.137.Final")
    implementation("io.netty:netty-handler-proxy:4.1.137.Final")
    implementation("org.jetbrains.kotlin:kotlin-stdlib:2.1.0")
}

publishing {
    publications {
        register<MavenPublication>("connector") {
            groupId = "io.quiltt"
            artifactId = "connector"
            version = "6.1.2"

            pom {
                name.set("Quiltt Connector")
                description.set("Quiltt Connector Android SDK")
                url.set("https://www.quiltt.dev/connector/sdk/android")

                organization {
                    name.set("Quiltt, Inc.")
                    url.set("https://www.quiltt.io/")
                }

                licenses {
                    license {
                        name.set("The MIT License (MIT)")
                        url.set("http://www.opensource.org/licenses/mit-license.php")
                    }
                }

                developers {
                    developer {
                        name.set("Quiltt, Inc.")
                        url.set("https://www.quiltt.io/")
                    }
                }

                scm {
                    connection.set("scm:git:github.com/quiltt/quiltt-sdks.git")
                    developerConnection.set("scm:git:ssh://github.com/quiltt/quiltt-sdks.git")
                    url.set("https://github.com/quiltt/quiltt-sdks/tree/main/packages/android/connector")
                }
            }

            afterEvaluate {
                artifact(tasks.named("bundleReleaseAar"))
            }
        } // io.quiltt:connector:VERSION
    }
    repositories {
        maven {
            name = "LocalStaging"
            url = uri("${rootProject.layout.buildDirectory.get()}/local-staging")
        }
    }
}

signing {
    useInMemoryPgpKeys(
        System.getenv("ANDROID_SIGNING_KEY_ID"),
        System.getenv("ANDROID_SIGNING_KEY"),
        System.getenv("ANDROID_SIGNING_PASSWORD"))
    sign(publishing.publications["connector"])
}