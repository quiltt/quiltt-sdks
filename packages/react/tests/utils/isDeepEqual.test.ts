import { describe, expect, it } from 'vitest'

import { isDeepEqual } from '@/utils'

describe('isDeepEqual', () => {
  // Primitive types
  it('handles primitive values correctly', () => {
    expect(isDeepEqual(1, 1)).toBe(true)
    expect(isDeepEqual('test', 'test')).toBe(true)
    expect(isDeepEqual(true, true)).toBe(true)
    expect(isDeepEqual(1, 2)).toBe(false)
    expect(isDeepEqual('test', 'other')).toBe(false)
    expect(isDeepEqual(true, false)).toBe(false)
  })

  // Null and undefined
  it('handles null and undefined', () => {
    expect(isDeepEqual(null, null)).toBe(true)
    expect(isDeepEqual(undefined, undefined)).toBe(true)
    expect(isDeepEqual(null, undefined)).toBe(false)
    expect(isDeepEqual(undefined, null)).toBe(false)
    expect(isDeepEqual(null, {})).toBe(false)
    expect(isDeepEqual(undefined, {})).toBe(false)
  })

  // Objects
  it('compares plain objects deeply', () => {
    expect(isDeepEqual({}, {})).toBe(true)
    expect(isDeepEqual({ a: 1 }, { a: 1 })).toBe(true)
    expect(isDeepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true)
    expect(isDeepEqual({ a: 1 }, { a: 2 })).toBe(false)
    expect(isDeepEqual({ a: 1 }, { b: 1 })).toBe(false)
    expect(isDeepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
  })

  // Nested objects
  it('handles nested objects', () => {
    expect(isDeepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(true)
    expect(isDeepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(false)
  })

  // Arrays
  it('compares arrays correctly', () => {
    expect(isDeepEqual([], [])).toBe(true)
    expect(isDeepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
    expect(isDeepEqual([1, 2, 3], [1, 2, 4])).toBe(false)
    expect(isDeepEqual([1, 2, 3], [1, 2])).toBe(false)
    expect(isDeepEqual([{ a: 1 }], [{ a: 1 }])).toBe(true)
    expect(isDeepEqual([{ a: 1 }], [{ a: 2 }])).toBe(false)
  })

  // Dates
  it('compares Date objects', () => {
    const date1 = new Date('2024-01-01')
    const date2 = new Date('2024-01-01')
    const date3 = new Date('2024-01-02')

    expect(isDeepEqual(date1, date2)).toBe(true)
    expect(isDeepEqual(date1, date3)).toBe(false)
    expect(isDeepEqual({ date: date1 }, { date: date2 })).toBe(true)
    expect(isDeepEqual({ date: date1 }, { date: date3 })).toBe(false)
  })

  // RegExp
  it('compares RegExp objects', () => {
    expect(isDeepEqual(/test/, /test/)).toBe(true)
    expect(isDeepEqual(/test/i, /test/i)).toBe(true)
    expect(isDeepEqual(/test/, /other/)).toBe(false)
    expect(isDeepEqual(/test/i, /test/g)).toBe(false)
  })

  // Maps
  it('compares Map objects', () => {
    const map1 = new Map([['key', 'value']])
    const map2 = new Map([['key', 'value']])
    const map3 = new Map([['key', 'other']])

    expect(isDeepEqual(map1, map2)).toBe(true)
    expect(isDeepEqual(map1, map3)).toBe(false)
    expect(isDeepEqual(new Map([['key', { a: 1 }]]), new Map([['key', { a: 1 }]]))).toBe(true)
    expect(isDeepEqual(new Map([['a', 1]]), new Map())).toBe(false) // size mismatch
  })

  // Sets
  it('compares Set objects', () => {
    const set1 = new Set([1, 2, 3])
    const set2 = new Set([1, 2, 3])
    const set3 = new Set([1, 2, 4])

    expect(isDeepEqual(set1, set2)).toBe(true)
    expect(isDeepEqual(set1, set3)).toBe(false)
    expect(isDeepEqual(new Set([{ a: 1 }]), new Set([{ a: 1 }]))).toBe(true)
    expect(isDeepEqual(new Set([1, 2, 3]), new Set([1]))).toBe(false) // size mismatch
  })

  // Mixed types
  it('handles mixed nested structures', () => {
    const obj1 = {
      date: new Date('2024-01-01'),
      regex: /test/i,
      map: new Map([['key', 'value']]),
      set: new Set([1, 2, 3]),
      nested: {
        array: [{ a: 1 }, { b: 2 }],
        string: 'test',
      },
    }
    const obj2 = {
      date: new Date('2024-01-01'),
      regex: /test/i,
      map: new Map([['key', 'value']]),
      set: new Set([1, 2, 3]),
      nested: {
        array: [{ a: 1 }, { b: 2 }],
        string: 'test',
      },
    }

    expect(isDeepEqual(obj1, obj2)).toBe(true)

    // Modify one nested value
    obj2.nested.array[0].a = 2
    expect(isDeepEqual(obj1, obj2)).toBe(false)
  })

  // Edge cases
  it('handles edge cases', () => {
    // Different types with same valueOf
    expect(isDeepEqual(new Number(1), 1)).toBe(false)
    expect(isDeepEqual(new String('test'), 'test')).toBe(false)

    // Empty values
    expect(isDeepEqual({}, [])).toBe(false)
    expect(isDeepEqual([], {})).toBe(false)
  })
})
