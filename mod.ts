import { decodeVarint } from "jsr:@std/encoding@1.0.6/varint";

/**
 * This module contains functions to decode protobuf
 *
 * @example
 * ```ts
 * import Protobuf from "@xernisfy/protobuf";
 *
 * const message = Protobuf.decodeMessage(Uint8Array.from([10, 4, 116, 101, 115, 116, 18, 2, 255, 15, 24, 2, 34, 2, 2, 4]));
 * ```
 *
 * @module
 */

export default {
  decodeMessage,
  parseDefinition,
};

/**
 * List of all records/fields in the Protobuf message
 */
export type Message = Field[];
/**
 * Representation of a record/field
 *
 * Contains only information that is present in the Protobuf message, so e.g. field names are not included
 */
export type Field<T = WireType> = {
  type: T;
  number: number;
  offset: number;
  length: number;
  payload: T extends WireType.VARINT ? bigint : Uint8Array;
};
/**
 * Types used by Protobuf
 * @see https://protobuf.dev/programming-guides/encoding/#structure
 */
enum WireType {
  VARINT,
  I64,
  LEN,
  SGROUP,
  EGROUP,
  I32,
}

/**
 * Helper class to iterate over bytes
 */
class Buffer {
  offset: number = 0;
  constructor(private buffer: Uint8Array) {}
  get length() {
    return this.buffer.length;
  }
  getVarint() {
    const [value, offset] = decodeVarint(this.buffer, this.offset);
    this.offset = offset;
    return value;
  }
  slice(length: number) {
    const slice = this.buffer.slice(this.offset, this.offset + length);
    this.offset += length;
    return slice;
  }
}

/**
 * Decode a Protobuf message from "wire format" to JSON
 *
 * Contains only information that is present in the Protobuf message, so e.g. field names are not included
 */
function decodeMessage(buffer: Uint8Array): Message {
  return [...decodeRecords(new Buffer(buffer))];
}

/**
 * Helper function to iterate over Protobuf records/fields
 */
function* decodeRecords(b: Buffer): Generator<Field, void, unknown> {
  while (b.offset < b.length) {
    const offset = b.offset;
    const tag = getTag(b);
    const payload = getPayload(tag.type, b);
    yield { ...tag, offset, length: b.offset - offset, payload };
  }
  if (b.offset !== b.length) throw new Error(`invalid length`);
}

/**
 * Helper function to retrieve the payload depending on the record/field type
 */
function getPayload(type: WireType, b: Buffer): Uint8Array | bigint {
  if (type === WireType.VARINT) return b.getVarint();
  if (type === WireType.I64) return b.slice(64);
  if (type === WireType.LEN) return b.slice(Number(b.getVarint()));
  if (type === WireType.SGROUP) throw new Error(`deprecated type "SGROUP"`);
  if (type === WireType.EGROUP) throw new Error(`deprecated type "EGROUP"`);
  if (type === WireType.I32) return b.slice(32);
  throw new Error(`unknown type "${type}"`);
}

/**
 * Helper function to split the tag into the field number and type
 */
function getTag(b: Buffer): Pick<Field, "number" | "type"> {
  const tag = Number(b.getVarint());
  return { number: tag >> 3, type: tag & 0b111 };
}

type MessageDefinitions = Record<
  string,
  Map<number, { type: string; name: string }>
>;
type EnumDefinitions = Record<string, Map<number, string>>;

const regexMessage = /message +(?<name>.*?) *{(?<content>[\s\S]*?)}/g;
const regexMessageProp =
  / *(?<type>(?:repeated )?[^ ]+) (?<name>[^ ]+) = (?<number>\d+);\n/g;
const regexEnum = /enum +(?<name>.*?) *{(?<content>[\s\S]*?)}/g;
const regexEnumProp = / *(?<name>[^ ]+) = (?<number>\d+);\n/g;

/**
 * Parse a Protobuf definition into a JSON representation
 *
 * The result can be used to hydrate a decoded Protobuf message
 */
function parseDefinition(
  protoDefinition: string,
): { messages: MessageDefinitions; enums: EnumDefinitions } {
  const messages = Object.fromEntries(
    [...protoDefinition.matchAll(regexMessage)].map((
      message,
    ) => [
      message.groups?.name,
      new Map(
        [...message.groups?.content.matchAll(regexMessageProp) || []].map((
          field,
        ) => [+field.groups?.number!, {
          type: field.groups?.type!,
          name: field.groups?.name!,
        }]),
      ),
    ]),
  );
  const enums = Object.fromEntries(
    [...protoDefinition.matchAll(regexEnum)].map((
      enm,
    ) => [
      enm.groups?.name,
      new Map(
        [...enm.groups?.content.matchAll(regexEnumProp) || []].map((
          field,
        ) => [+field.groups?.number!, field.groups?.name!]),
      ),
    ]),
  );
  return { messages, enums };
}
