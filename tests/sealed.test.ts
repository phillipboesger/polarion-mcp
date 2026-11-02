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

const OLD_SECRET = "sealed-unit-test-previous-secret-0123456789"

test("deployment context is bound into every sealed value", () => {
  const token = new Sealer(SECRET, "tenant-a").seal("a", { user: "alice" })
  assert.deepEqual(new Sealer(SECRET, "tenant-a").open("a", token), { user: "alice" })
  assert.equal(new Sealer(SECRET, "tenant-b").open("a", token), undefined)
  assert.equal(new Sealer(SECRET).open("a", token), undefined)
  const plain = new Sealer(SECRET).seal("a", { user: "alice" })
  assert.deepEqual(new Sealer(SECRET, "").open("a", plain), { user: "alice" })
})

test("open rejects values with a different prefix kind or a flipped ciphertext byte", () => {
  const sealer = new Sealer(SECRET)
  const token = sealer.seal("a", { user: "alice" })
  assert.equal(sealer.open("a", token.replace(`${SEALED_PREFIX}a.`, `${SEALED_PREFIX}r.`)), undefined)
  assert.equal(sealer.open("a", token.slice(SEALED_PREFIX.length)), undefined)
  const raw = Buffer.from(token.slice(`${SEALED_PREFIX}a.`.length), "base64url")
  raw[raw.length - 1] ^= 1
  assert.equal(sealer.open("a", `${SEALED_PREFIX}a.${raw.toString("base64url")}`), undefined)
})

test("previous secrets open old values while new values use the current secret", () => {
  const oldToken = new Sealer(OLD_SECRET).seal("r", { user: "alice" })
  const rotated = new Sealer(SECRET, "", [OLD_SECRET])
  assert.deepEqual(rotated.open("r", oldToken), { user: "alice" })
  assert.equal(new Sealer(SECRET).open("r", oldToken), undefined)
  const fresh = rotated.seal("r", { user: "bob" })
  assert.deepEqual(new Sealer(SECRET).open("r", fresh), { user: "bob" })
  assert.equal(new Sealer(OLD_SECRET).open("r", fresh), undefined)
})

test("derive keeps the key of the secret that sealed the client id", () => {
  const oldSealer = new Sealer(OLD_SECRET)
  const clientId = oldSealer.seal("c", { name: "claude" })
  const rotated = new Sealer(SECRET, "", [OLD_SECRET])
  assert.equal(rotated.derive(clientId, clientId), oldSealer.derive(clientId))
  assert.notEqual(rotated.derive(clientId, clientId), rotated.derive(clientId))
  assert.equal(rotated.derive(clientId), new Sealer(SECRET).derive(clientId))
})

test("derive falls back to the current key for foreign, wrong-kind, short or unopenable sealed values", () => {
  const rotated = new Sealer(SECRET, "", [OLD_SECRET])
  const current = rotated.derive("x")
  const accessToken = new Sealer(OLD_SECRET).seal("a", {})
  const otherSecretClient = new Sealer(`${SECRET}!`).seal("c", {})
  assert.equal(rotated.derive("x", "polarion-pat"), current)
  assert.equal(rotated.derive("x", accessToken), current)
  assert.equal(rotated.derive("x", `${SEALED_PREFIX}c.AA`), current)
  assert.equal(rotated.derive("x", otherSecretClient), current)
})
