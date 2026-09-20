// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    id("com.android.application") version "8.5.2" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.21" apply false
    id("com.android.library") version "8.5.2" apply false
}

subprojects {
    dependencyLocking {
        lockAllConfigurations()
    }

    configurations.all {
        resolutionStrategy {
            force(
                "commons-io:commons-io:2.14.0",
                "com.google.guava:guava:32.0.1-jre",
                "com.google.protobuf:protobuf-java:3.25.5",
                "org.bouncycastle:bcprov-jdk18on:1.85",
                "io.netty:netty-buffer:4.1.138.Final",
                "io.netty:netty-codec:4.1.138.Final",
                "io.netty:netty-codec-http:4.1.138.Final",
                "io.netty:netty-codec-http2:4.1.138.Final",
                "io.netty:netty-codec-socks:4.1.138.Final",
                "io.netty:netty-common:4.1.138.Final",
                "io.netty:netty-handler:4.1.138.Final",
                "io.netty:netty-handler-proxy:4.1.138.Final",
                "io.netty:netty-resolver:4.1.138.Final",
                "io.netty:netty-transport:4.1.138.Final",
                "io.netty:netty-transport-native-unix-common:4.1.138.Final",
            )
        }
    }
}