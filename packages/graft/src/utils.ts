export function isString(x: any): x is string {
  return typeof x === "string";
}

export function isObject(x: any): x is object {
  const type = typeof x;
  return x != null && (type === "object" || type === "function");
}

export function isArray(x: any): x is Array<any> {
  return Array.isArray(x);
}
