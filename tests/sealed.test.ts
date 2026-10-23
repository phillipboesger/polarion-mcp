import test from "node:test"
import assert from "node:assert/strict"

import { isSealed, MIN_SECRET_LENGTH, safeEqual, SEALED_PREFIX, Sealer } from "../src/sealed.js"

const SECRET = "sealed-unit-test-secret-long-enough-0123456789"

test("sealed tokens use the recognized prefix and reject foreign bearer values", () => {
  const token = new Sealer(SECRET).seal("a", { subject: "alice" })
  assert.ok(token.startsWith(`${SEALED_PREFIX}a.`))
  assert.equal(isSealed(token), true)
  assert.equal(isSealed("pmcp2.a.foreign"), false)
  assert.equal(isSealed("polarion-pat"), false)
})

test("sealing requires the documented minimum secret length", () => {
  assert.throws(() => new Sealer("x".repeat(MIN_SECRET_LENGTH - 1)), /at least 32 characters/)
  assert.doesNotThrow(() => new Sealer("x".repeat(MIN_SECRET_LENGTH)))
})

test("open refuses values of another kind, another secret, and malformed short payloads", () => {
  const sealer = new Sealer(SECRET)
  const otherSecret = new Sealer(`${SECRET}!`)
  const access = sealer.seal("a", { user: "alice" })
  assert.equal(sealer.open("r", access), undefined)
  assert.equal(otherSecret.open("a", access), undefined)
  assert.equal(sealer.open("a", `${SEALED_PREFIX}a.`), undefined)
  assert.equal(sealer.open("a", `${SEALED_PREFIX}a.AA`), undefined)
})

test("derive is stable for one value and distinct for different client ids", () => {
  const sealer = new Sealer(SECRET)
  assert.equal(sealer.derive("client-a"), sealer.derive("client-a"))
  assert.notEqual(sealer.derive("client-a"), sealer.derive("client-b"))
  assert.notEqual(sealer.derive("client-a"), new Sealer(`${SECRET}!`).derive("client-a"))
})

test("safeEqual accepts only byte-for-byte matches, including length differences", () => {
  assert.equal(safeEqual("same", "same"), true)
  assert.equal(safeEqual("same", "samf"), false)
  assert.equal(safeEqual("same", "same-longer"), false)
  assert.equal(safeEqual("é", "e"), false)
})
