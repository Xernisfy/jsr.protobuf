import { decodeVarint } from "jsr:@std/encoding/varint";

type Message = Field[];
type Field<T = WireType> = {
  type: T;
  number: number;
  offset: number;
  length: number;
  payload: T extends WireType.VARINT ? bigint : Uint8Array;
};
// https://protobuf.dev/programming-guides/encoding/#structure
enum WireType {
  VARINT,
  I64,
  LEN,
  SGROUP,
  EGROUP,
  I32,
}

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

export function decodeMessage(buffer: Uint8Array): Message {
  return [...decodeRecords(new Buffer(buffer))];
}

function* decodeRecords(b: Buffer): Generator<Field, void, unknown> {
  while (b.offset < b.length) {
    const offset = b.offset;
    const tag = getTag(b);
    const payload = getPayload(tag.type, b);
    yield { ...tag, offset, length: b.offset - offset, payload };
  }
  if (b.offset !== b.length) throw new Error(`invalid length`);
}

function getPayload(type: WireType, b: Buffer): Uint8Array | bigint {
  if (type === WireType.VARINT) return b.getVarint();
  if (type === WireType.I64) return b.slice(64);
  if (type === WireType.LEN) return b.slice(Number(b.getVarint()));
  if (type === WireType.SGROUP) throw new Error(`deprecated type "SGROUP"`);
  if (type === WireType.EGROUP) throw new Error(`deprecated type "EGROUP"`);
  if (type === WireType.I32) return b.slice(32);
  throw new Error(`unknown type "${type}"`);
}

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
const regexMessageProp = / *(?<type>[^ ]+) (?<name>[^ ]+) = (?<number>\d+);\n/g;
const regexEnum = /enum +(?<name>.*?) *{(?<content>[\s\S]*?)}/g;
const regexEnumProp = / *(?<name>[^ ]+) = (?<number>\d+);\n/g;

export function parseDefinition(
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
