import { computed, onUnmounted, ref, shallowRef, watch } from 'vue'

import type { ErrorData, InstitutionsData } from '@quiltt/core'
import { ConnectorsAPI } from '@quiltt/core'

import { getSDKAgent } from '../utils'
import { version } from '../version'
import { useQuilttSession } from './useQuilttSession'

/**
 * Search institutions for a connector.
 * Requires QuilttPlugin session context and throws when used without it.
 */
export const useQuilttInstitutions = (
  connectorId: string,
  onErrorCallback?: (msg: string) => void
) => {
  const { session } = useQuilttSession()

  const searchTermInput = ref('')
  const searchTerm = ref('')
  const searchResults = ref<InstitutionsData>([])
  const isSearching = ref(false)

  const debounceTimer = ref<ReturnType<typeof setTimeout> | undefined>()
  const abortController = shallowRef<AbortController | undefined>()

  const connectorsAPI = new ConnectorsAPI(connectorId, getSDKAgent(version))

  const handleError = (message: string) => {
    const errorMessage = message || 'Unknown error occurred while searching institutions'
    console.error('Quiltt Institutions Search Error:', errorMessage)
    onErrorCallback?.(errorMessage)
  }

  const setSearchTerm = (term: string) => {
    searchTermInput.value = term

    if (debounceTimer.value) {
      clearTimeout(debounceTimer.value)
    }

    if (term.trim().length < 2) {
      abortController.value?.abort()
      abortController.value = undefined
      searchTerm.value = ''
      searchResults.value = []
      isSearching.value = false
      return
    }

    isSearching.value = true
    debounceTimer.value = setTimeout(() => {
      searchTerm.value = term
    }, 350)
  }

  watch(
    [() => session.value?.token, searchTerm],
    async ([token, term]) => {
      if (!token || !connectorId || !term || term.trim().length < 2) {
        return
      }

      abortController.value?.abort()
      const controller = new AbortController()
      abortController.value = controller

      try {
        const response = await connectorsAPI.searchInstitutions(
          token,
          connectorId,
          term,
          controller.signal
        )

        if (abortController.value !== controller || controller.signal.aborted) {
          return
        }

        if (response.status === 200) {
          searchResults.value = response.data as InstitutionsData
        } else {
          handleError((response.data as ErrorData).message || 'Failed to fetch institutions')
        }
      } catch (error: any) {
        if (abortController.value === controller && !controller.signal.aborted) {
          handleError(error?.message)
        }
      } finally {
        if (abortController.value === controller && !controller.signal.aborted) {
          isSearching.value = false
        }
      }
    },
    { immediate: false }
  )

  onUnmounted(() => {
    if (debounceTimer.value) {
      clearTimeout(debounceTimer.value)
    }
    abortController.value?.abort()
  })

  return {
    searchTerm: computed(() => searchTerm.value),
    searchResults: computed(() => searchResults.value),
    isSearching: computed(() => isSearching.value),
    setSearchTerm,
  }
}
