/**
 * @quiltt/vue - Vue 3 Plugin
 *
 * Provides Quiltt session management via Vue's provide/inject system.
 *
 * @example
 * ```typescript
 * import { createApp } from 'vue'
 * import { QuilttPlugin } from '@quiltt/vue'
 *
 * const app = createApp(App)
 * app.use(QuilttPlugin, { token: '<SESSION_TOKEN>' })
 * app.mount('#app')
 * ```
 */

export {
  QuilttClientIdKey,
  QuilttHeadersKey,
  type QuilttPluginOptions,
  QuilttSessionControllerKey,
  QuilttSessionKey,
  QuilttSetSessionKey,
} from './keys'
export { QuilttPlugin } from './QuilttPlugin'
