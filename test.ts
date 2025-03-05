import { assertEquals } from "jsr:@std/assert@1.0.11/equals";
import { assertObjectMatch } from "jsr:@std/assert@1.0.11/object-match";
import { decodeBase64 } from "jsr:@std/encoding@1.0.6/base64";
import Protobuf, { type Message } from "./mod.ts";

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
    "CgR0ZXN0EgL/DxgCIgICBCoICgZuZXN0ZWQwAQ==",
  );
  const testMessageObject: Message = [
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
    {
      number: 3,
      type: 0,
      offset: 10,
      length: 2,
      payload: 2n,
    },
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
    {
      number: 6,
      type: 0,
      offset: 26,
      length: 2,
      payload: 1n,
    },
  ];
  const message = Protobuf.decodeMessage(testMessageBinary);
  assertEquals(message.length, testMessageObject.length);
  for (const fieldIndex in testMessageObject) {
    assertObjectMatch(message[fieldIndex], testMessageObject[fieldIndex]);
  }
  // test nested object as well
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

Deno.test("parse definition", () => {
  const testDefinition = `syntax = "proto3";

message exampleMessage {
  string exampleString = 1;
  bytes exampleBytes = 2;
  uint32 exampleInt = 3;
  repeated uint32 exampleArray = 4;
  nestedMessage exampleObject = 5;
  exampleEnum exampleEnum = 6;
}

message nestedMessage {
  string exampleString = 1;
}

enum exampleEnum {
  A = 0;
  B = 1;
}`;
  const testDefinitionObject = {
    messages: {
      exampleMessage: new Map([
        [1, { type: "string", name: "exampleString" }],
        [2, { type: "bytes", name: "exampleBytes" }],
        [3, { type: "uint32", name: "exampleInt" }],
        [4, { type: "repeated uint32", name: "exampleArray" }],
        [5, { type: "nestedMessage", name: "exampleObject" }],
        [6, { type: "exampleEnum", name: "exampleEnum" }],
      ]),
    },
    enums: {
      exampleEnum: new Map([[0, "A"], [1, "B"]]),
    },
  } as ReturnType<typeof Protobuf.parseDefinition>;
  assertObjectMatch(
    Protobuf.parseDefinition(testDefinition),
    testDefinitionObject,
  );
});
