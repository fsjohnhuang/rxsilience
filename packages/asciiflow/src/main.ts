import { flow } from ".";

const { text, style } = flow([
  { name: "Function A", params: [1, 2, 3], exception: "Invalid URL" },
  { name: "Function B", params: [1, 2, 3], return: 12 },
]);

console.log(text, ...style);
