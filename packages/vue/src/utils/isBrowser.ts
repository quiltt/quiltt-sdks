/** Whether this process has a browser to render into, as opposed to a server rendering a string. */
export const isBrowser = (): boolean => typeof window !== 'undefined'
