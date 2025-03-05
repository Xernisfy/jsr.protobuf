import { assertEquals, assertObjectMatch } from "jsr:@std/assert";
import { decodeBase64 } from "jsr:@std/encoding/base64";
import Protobuf from "./mod.ts";

Deno.test("decode simple object", () => {
  const testMessageBinary = decodeBase64("CgR0ZXN0EgL/DxgCIgICBA==");
  const testMessageObject = [
    {
      number: 1,
      type: 2,
      offset: 0,
      length: 6,
      payload: Uint8Array.from([116, 101, 115, 116]),
    },
    {
      number: 2,
      type: 2,
      offset: 6,
      length: 4,
      payload: Uint8Array.from([255, 15]),
    },
    { number: 3, type: 0, offset: 10, length: 2, payload: 2n },
    {
      number: 4,
      type: 2,
      offset: 12,
      length: 4,
      payload: Uint8Array.from([2, 4]),
    },
  ];
  const message = Protobuf.decodeMessage(testMessageBinary);
  assertEquals(message.length, testMessageObject.length);
  for (const fieldIndex in testMessageObject) {
    assertObjectMatch(message[fieldIndex], testMessageObject[fieldIndex]);
  }
});

Deno.test("decode complex object", () => {
  const testMessageBinary = decodeBase64(
    "CgR0ZXN0EgL/DxgCIgICBCoICgZuZXN0ZWQ=",
  );
  const testMessageObject = [
    {
      number: 1,
      type: 2,
      offset: 0,
      length: 6,
      payload: Uint8Array.from([116, 101, 115, 116]),
    },
    {
      number: 2,
      type: 2,
      offset: 6,
      length: 4,
      payload: Uint8Array.from([255, 15]),
    },
    { number: 3, type: 0, offset: 10, length: 2, payload: 2n },
    {
      number: 4,
      type: 2,
      offset: 12,
      length: 4,
      payload: Uint8Array.from([2, 4]),
    },
    {
      number: 5,
      type: 2,
      offset: 16,
      length: 10,
      payload: Uint8Array.from([10, 6, 110, 101, 115, 116, 101, 100]),
    },
  ];
  const message = Protobuf.decodeMessage(testMessageBinary);
  assertEquals(message.length, testMessageObject.length);
  for (const fieldIndex in testMessageObject) {
    assertObjectMatch(message[fieldIndex], testMessageObject[fieldIndex]);
  }
  const testMessageNestedObject = [
    {
      number: 1,
      type: 2,
      offset: 0,
      length: 8,
      payload: Uint8Array.from([110, 101, 115, 116, 101, 100]),
    },
  ];
  const nestedMessage = Protobuf.decodeMessage(
    message[4].payload as Uint8Array,
  );
  assertEquals(nestedMessage.length, testMessageNestedObject.length);
  for (const fieldIndex in testMessageNestedObject) {
    assertObjectMatch(
      nestedMessage[fieldIndex],
      testMessageNestedObject[fieldIndex],
    );
  }
});
