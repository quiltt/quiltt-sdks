import { computed, ref } from 'vue'

import type { ErrorData, ResolvableData } from '@quiltt/core'
import { ConnectorsAPI } from '@quiltt/core'

import { getSDKAgent } from '../utils'
import { version } from '../version'
import { useQuilttSession } from './useQuilttSession'

type ProviderId = {
  plaid?: string
  mock?: string
  mx?: string
  finicity?: string
  akoya?: string
}

/**
 * Check whether a provider link is resolvable for a connector.
 * Requires QuilttPlugin session context and throws when used without it.
 */
export const useQuilttResolvable = (
  connectorId: string,
  onErrorCallback?: (msg: string) => void
) => {
  const { session } = useQuilttSession()
  const connectorsAPI = new ConnectorsAPI(connectorId, getSDKAgent(version))

  const isLoading = ref(false)
  const isResolvable = ref<boolean | null>(null)
  const error = ref<string | null>(null)

  const handleError = (message: string) => {
    const errorMessage = message || 'Unknown error occurred while checking resolvability'

    error.value = errorMessage
    console.error('Quiltt Connector Resolvable Error:', errorMessage)
    onErrorCallback?.(errorMessage)
  }

  const checkResolvable = async (providerId: ProviderId): Promise<boolean | null> => {
    if (!session.value?.token) {
      handleError('Missing session token')
      return null
    }

    if (!connectorId) {
      handleError('Missing connector ID')
      return null
    }

    const hasProviderId = Object.values(providerId).some((id) => !!id)
    if (!hasProviderId) {
      handleError('No provider ID specified')
      return null
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await connectorsAPI.checkResolvable(
        session.value.token,
        connectorId,
        providerId
      )

      if (response.status === 200) {
        const result = (response.data as ResolvableData).resolvable
        isResolvable.value = result
        return result
      }

      handleError((response.data as ErrorData).message || 'Failed to check resolvability')
      isResolvable.value = null
      return null
    } catch (caught: any) {
      handleError(caught?.message)
      isResolvable.value = null
      return null
    } finally {
      isLoading.value = false
    }
  }

  return {
    checkResolvable,
    isLoading: computed(() => isLoading.value),
    isResolvable: computed(() => isResolvable.value),
    error: computed(() => error.value),
  }
}
