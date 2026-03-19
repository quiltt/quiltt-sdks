import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  srcDir: 'src/',
  compatibilityDate: '2026-02-20',
  devtools: { enabled: false },
  plugins: ['~/plugins/quiltt'],
  css: ['~/assets/css/main.css'],
  devServer: {
    port: 3301,
  },
  runtimeConfig: {
    public: {
      quilttClientId: process.env.NUXT_PUBLIC_QUILTT_CLIENT_ID ?? 'test-client-id',
      quilttAuthToken: process.env.NUXT_PUBLIC_QUILTT_AUTH_TOKEN ?? 'test-auth-token',
      quilttConnectorId: process.env.NUXT_PUBLIC_CONNECTOR_ID ?? '1h6bz4vo9z',
      quilttInstitutionSearchTerm: process.env.NUXT_PUBLIC_INSTITUTION_SEARCH_TERM ?? 'test',
    },
  },
})
