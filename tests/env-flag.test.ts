import test from 'node:test'
import assert from 'node:assert/strict'
import { flagOn } from '../src/config.js'

test('flagOn accepts 1, true, yes and on in any case, with whitespace', () => {
  for (const value of ['1', 'true', 'TRUE', 'Yes', ' on ', 'ON']) assert.equal(flagOn(value), true, value)
})

test('flagOn is false for unset, empty, 0, false and unknown words', () => {
  for (const value of [undefined, '', '0', 'false', 'no', 'off', 'enabled', '2']) assert.equal(flagOn(value), false, String(value))
})
