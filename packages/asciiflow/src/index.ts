type FunctionCall = {
  name: string;
  params: unknown | unknown[];
  return?: unknown | unknown[];
  exception?: string;
};

function formatValue(value: unknown): string {
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "number") return value.toString();
  if (typeof value === "boolean") return value.toString();
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return `[${value.map(formatValue).join(", ")}]`;
  return JSON.stringify(value);
}

function formatParams(params: unknown | unknown[]): string {
  const arr = Array.isArray(params) ? params : [params];
  return arr.map(formatValue).join(", ");
}

function formatFunctionCall(fn: FunctionCall): {
  text: string;
  style: string[];
} {
  const hasException = fn.exception !== undefined && fn.exception !== "";
  const emoji = hasException ? "(╥﹏╥)" : "(≧◡≦)";
  const result = hasException ? fn.exception! : formatParams(fn.return);
  const safeName = fn.name.replace(/\s+/g, "");
  const text = `%c[${safeName} | ${formatParams(fn.params)} | ${emoji}${result}]%c`;
  const style = [
    `color: #fff; background: ${fn.exception ? "red" : "green"}; padding: 2px 6px; border-radius: 3px;`,
    "color: #333",
  ];

  return {
    text,
    style,
  };
}

export function flow(calls: FunctionCall[]): { text: string; style: string[] } {
  const { text, style } = calls.reduce(
    (accu, fn) => {
      const { text, style } = formatFunctionCall(fn);
      accu.text.push(text);
      accu.style.push(...style);
      return accu;
    },
    {
      text: [],
      style: [],
    } as { text: string[]; style: string[] },
  );

  return {
    text: text.join(" → "),
    style,
  };
}
