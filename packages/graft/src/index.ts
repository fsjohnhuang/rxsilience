import { z, ZodError } from "zod";
import { createGraft as doCreateGraft, type GraftOptions } from "@graftjs/zod";
import { isString, isObject, isArray } from "./utils";
import { logE } from "./logging";

export function createGraft<
  L extends z.core.$ZodShape,
  R extends z.core.$ZodShape,
>(
  left: z.ZodObject<L>,
  right: z.ZodObject<R>,
  mapping?: { [k in keyof R]?: keyof L | z.ZodCodec | [keyof L, z.ZodCodec] },
  options?: GraftOptions,
) {
  const encoders: { [k in keyof R]?: z.ZodCodec } = {};
  const decoders: { [k in keyof L]?: z.ZodCodec } = {};
  const config: { [k in keyof R]?: keyof L } = {};
  for (const [key, value] of Object.entries(mapping || {})) {
    if (isArray(value)) {
      const [name, codec] = value as [string, z.ZodCodec];
      //@ts-ignore
      encoders[key] = codec;
      //@ts-ignore
      decoders[name] = codec;
      //@ts-ignore
      config[key] = name;
    } else {
      let name = key;
      if (isString(value)) {
        name = value;
      } else if (isObject(value)) {
        //@ts-ignore
        encoders[key] = value;
        //@ts-ignore
        decoders[name] = value;
      }

      //@ts-ignore
      config[key] = name;
    }
  }

  const toLeftGraft = doCreateGraft(
    left,
    right,
    config as any,
    Object.assign({}, options, { validate: "from" }),
  );
  const toRightGraft = doCreateGraft(
    left,
    right,
    config as any,
    Object.assign({}, options, { validate: "to" }),
  );

  return {
    toLeft: (inst: any) => {
      let record = {},
        currentName: undefined | string = undefined;
      try {
        for (const [name, value] of Object.entries(inst)) {
          currentName = name;
          //@ts-ignore
          record[name] = encoders[name] ? encoders[name].encode(value) : value;
        }
      } catch (e) {
        if (currentName) {
          (e as ZodError).issues[0].path.push(currentName);
          //@ts-ignore
          (e as ZodError).addIssues([]);
        }
        logE(e);
        throw e;
      }

      try {
        return toLeftGraft.toLeft(record);
      } catch (e) {
        logE(e);
        throw e;
      }
    },
    toRight: (inst: any) => {
      let record = {},
        currentName: undefined | string = undefined;
      try {
        for (const [name, value] of Object.entries(inst)) {
          currentName = name;
          //@ts-ignore
          record[name] = decoders[name] ? decoders[name].decode(value) : value;
        }
      } catch (e) {
        if (currentName) {
          (e as ZodError).issues[0].path.push(currentName);
          //@ts-ignore
          (e as ZodError).addIssues([]);
        }
        logE(e);
        throw e;
      }

      try {
        return toRightGraft.toRight(record);
      } catch (e) {
        logE(e);
        throw e;
      }
    },
  };
}
