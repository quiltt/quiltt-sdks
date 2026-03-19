const { withProjectBuildGradle } = require('expo/config-plugins')

/**
 * Config plugin to add packagingOptions to resolve duplicate native library conflicts
 * This is needed for Detox E2E testing with React Native
 *
 * The fix must be applied to ALL subprojects (not just :app) because library modules
 * like react-native-gesture-handler also build test APKs that encounter the same conflict.
 *
 * Configure packaging options when Android plugins are applied, so AGP reads
 * them during normal evaluation and does not reject late mutations.
 */
const withPackagingOptions = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      const allprojectsBlock = `def pickFirstLibs = [
      'lib/arm64-v8a/libfbjni.so',
      'lib/armeabi-v7a/libfbjni.so',
      'lib/x86/libfbjni.so',
      'lib/x86_64/libfbjni.so',
      'lib/arm64-v8a/libc++_shared.so',
      'lib/armeabi-v7a/libc++_shared.so',
      'lib/x86/libc++_shared.so',
      'lib/x86_64/libc++_shared.so',
    ]

    subprojects { project ->
      def configureWithFinalizeDsl = {
        def androidComponents = project.extensions.findByName('androidComponents')
        if (androidComponents != null) {
          androidComponents.finalizeDsl { androidExtension ->
            pickFirstLibs.each { lib ->
              androidExtension.packagingOptions.jniLibs.pickFirsts.add(lib)
            }
          }
        }
      }

      project.pluginManager.withPlugin('com.android.application') {
        configureWithFinalizeDsl()
      }

      project.pluginManager.withPlugin('com.android.library') {
        configureWithFinalizeDsl()
      }
    }

`
      // Prepend block at the beginning of root build.gradle.
      if (!config.modResults.contents.includes("pickFirst 'lib/arm64-v8a/libfbjni.so'")) {
        config.modResults.contents = allprojectsBlock + config.modResults.contents
      }
    }
    return config
  })
}

module.exports = withPackagingOptions
