/**
 * Performs a deep equality comparison between two values
 *
 * This function recursively compares all properties to determine if they are equal.
 *
 * @example
 * ```ts
 * isDeepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }) // true
 * isDeepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 3 } }) // false
 * isDeepEqual(undefined, undefined) // true
 * isDeepEqual(null, null) // true
 * ```
 */
export const isDeepEqual = (obj1: unknown, obj2: unknown): boolean => {
  // Handle primitive types and null/undefined
  if (obj1 === obj2) return true
  if (obj1 === null || obj2 === null || typeof obj1 !== 'object' || typeof obj2 !== 'object')
    return false

  // Handle special object types
  if (obj1 instanceof Date && obj2 instanceof Date) {
    return obj1.getTime() === obj2.getTime()
  }
  if (obj1 instanceof RegExp && obj2 instanceof RegExp) {
    return obj1.toString() === obj2.toString()
  }
  if (obj1 instanceof Map && obj2 instanceof Map) {
    if (obj1.size !== obj2.size) return false
    for (const [key, value] of obj1) {
      if (!obj2.has(key) || !isDeepEqual(value, obj2.get(key))) return false
    }
    return true
  }
  if (obj1 instanceof Set && obj2 instanceof Set) {
    if (obj1.size !== obj2.size) return false
    const arr2 = Array.from(obj2)
    for (const item of obj1) {
      if (!arr2.some((value) => isDeepEqual(item, value))) return false
    }
    return true
  }

  // Handle arrays
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return false
    return obj1.every((value, index) => isDeepEqual(value, obj2[index]))
  }

  // If one is array and other isn't, they're not equal
  if (Array.isArray(obj1) || Array.isArray(obj2)) return false

  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)

  if (keys1.length !== keys2.length) return false

  return keys1.every((key) => {
    return Object.hasOwn(obj2, key) && isDeepEqual((obj1 as any)[key], (obj2 as any)[key])
  })
}
