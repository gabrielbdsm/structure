const fs = require("fs");

const tokenTypes = [
  {
    type: "KEYWORD",
    regex:
      /\b(if|else-if|else|while|for|function|list|queue|stack|tree|int|float|string|bool|js)\b/,
  },
  { type: "OPERATOR", regex: /[+\-*/%|&=<>]/ },
  { type: "PUNCTUATION", regex: /[{}();]/ },
  { type: "BOOLEAN", regex: /\b(true|false)\b/ },
  { type: "IDENTIFIER", regex: /\b[a-zA-Z_][a-zA-Z0-9_]*\b/ },
  { type: "NUMBER", regex: /\b\d+(\.\d+)?\b/ },
  { type: "WHITESPACE", regex: /\s+/, ignore: true },
];

function lexer(input) {
  let tokens = [];
  let cursor = 0;

  while (cursor < input.length) {
    let match = null;

    for (const tokenType of tokenTypes) {
      const regex = tokenType.regex;
      match = input.slice(cursor).match(regex);

      if (match && match.index === 0) {
        if (!tokenType.ignore) {
          tokens.push({ type: tokenType.type, value: match[0] });
          console.log(
            `Token encontrado: ${match[0]} do tipo ${tokenType.type}`
          );
        }
        cursor += match[0].length;
        break;
      }
    }

    if (!match) {
      const unexpectedToken = input[cursor] || "EOF";
      throw new SyntaxError(
        `Unexpected token: '${unexpectedToken}' at position ${cursor}`
      );

      cursor++;
    }
  }

  return tokens;
}

fs.readFile("code.txt", "utf8", (err, data) => {
  if (err) {
    console.error("Erro ao ler o arquivo:", err);
    return;
  }
  try {
    const tokens = lexer(data);
    console.log("Tokens:", tokens);
  } catch (error) {
    console.error("Erro:", error.message);
  }
});
