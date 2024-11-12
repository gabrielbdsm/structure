const fs = require("fs");

const tokenTypes = [
  {
    type: "KEYWORD",
    regex: /\b(if|else|while|for|function|int|float|string|bool|return)\b/,
  },
  { type: "OPERATOR", regex: /[+\-*/%|&=<>!]/ },
  { type: "PUNCTUATION", regex: /[{}();,]/ },
  { type: "BOOLEAN", regex: /\b(true|false)\b/ },
  { type: "IDENTIFIER", regex: /\b[a-zA-Z_][a-zA-Z0-9_]*\b/ },
  { type: "NUMBER", regex: /\b\d+(\.\d+)?\b/ },
  { type: "STRING", regex: /"(?:[^"\\]|\\.)*"/ },
  { type: "WHITESPACE", regex: /\s+/, ignore: true },
];

class Lexer {
  constructor(input) {
    this.input = input;
    this.cursor = 0;
  }

  tokenize() {
    let tokens = [];
    while (this.cursor < this.input.length) {
      let match = null;
      for (const tokenType of tokenTypes) {
        const regex = tokenType.regex;
        match = this.input.slice(this.cursor).match(regex);
        if (match && match.index === 0) {
          if (!tokenType.ignore) {
            tokens.push({ type: tokenType.type, value: match[0] });
            console.log(
              `Token encontrado: ${match[0]} do tipo ${tokenType.type}`
            );
          }
          this.cursor += match[0].length;
          break;
        }
      }
      if (!match) {
        throw new SyntaxError(
          `Unexpected token at position ${this.cursor}: "${
            this.input[this.cursor]
          }"`
        );
      }
    }
    return tokens;
  }
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.cursor = 0;
    this.currentToken = this.tokens[this.cursor];
  }

  nextToken() {
    this.cursor++;
    this.currentToken =
      this.cursor < this.tokens.length ? this.tokens[this.cursor] : null;
  }

  eat(type) {
    if (this.currentToken && this.currentToken.type === type) {
      const value = this.currentToken.value;
      this.nextToken();
      return value;
    }
    return null;
  }

  program() {
    let statements = [];
    while (this.currentToken) {
      if (this.currentToken.type !== "WHITESPACE") {
        try {
          statements.push(this.statement());
        } catch (error) {
          console.error("Erro na declaração:", error.message);
          this.nextToken();
        }
      } else {
        this.nextToken();
      }
    }
    return { type: "Program", body: statements };
  }

  statement() {
    if (this.currentToken && this.currentToken.type === "KEYWORD") {
      const keyword = this.currentToken.value;
      if (["int", "float", "string", "bool"].includes(keyword)) {
        return this.declaration();
      } else if (keyword === "if") {
        return this.ifStatement();
      } else if (keyword === "for") {
        return this.forStatement();
      } else if (keyword === "while") {
        return this.whileStatement();
      }
    }
    throw new SyntaxError("Expected statement.");
  }

  ifStatement() {
    this.eat("KEYWORD");
    const condition = this.expression();
    const block = this.block();
    return {
      type: "IfStatement",
      condition,
      block,
    };
  }

  block() {
    let statements = [];
    if (this.eat("PUNCTUATION") === "{") {
      while (
        this.currentToken &&
        (this.currentToken.type !== "PUNCTUATION" ||
          this.currentToken.value !== "}")
      ) {
        if (
          this.currentToken &&
          ["int", "float", "string", "bool"].includes(this.currentToken.value)
        ) {
          statements.push(this.declaration());
        } else {
          statements.push(this.statement());
        }
      }
      if (this.eat("PUNCTUATION") !== "}") {
        throw new SyntaxError("Expected closing brace '}'.");
      }
    }
    return statements;
  }

  declaration() {
    const type = this.eat("KEYWORD");
    if (type && ["int", "float", "string", "bool"].includes(type)) {
      return this.variableDeclaration(type);
    }
    if (type === "function") {
      return this.functionDeclaration();
    }
    throw new SyntaxError("Expected variable or function declaration.");
  }

  variableDeclaration(type) {
    const identifier = this.identifier();
    if (!identifier) {
      throw new SyntaxError("Expected identifier after type.");
    }
    const operator = this.eat("OPERATOR");
    if (operator !== "=") {
      throw new SyntaxError("Expected '=' after identifier.");
    }
    const initializer = this.expression();
    const punctuation = this.eat("PUNCTUATION");
    if (punctuation !== ";") {
      throw new SyntaxError("Expected ';' after expression.");
    }
    return {
      type: `${type}VariableDeclaration`,
      name: identifier,
      initializer,
    };
  }

  functionDeclaration() {
    const name = this.identifier();
    if (!name) {
      throw new SyntaxError("Expected function name.");
    }
    const params = this.parameterList();
    const body = this.block();
    return {
      type: "FunctionDeclaration",
      name,
      parameters: params,
      body,
    };
  }

  whileStatement() {
    this.eat("KEYWORD");

    if (this.eat("PUNCTUATION") !== "(") {
      throw new SyntaxError("Expected '(' after 'while'.");
    }

    const condition = this.expression();

    if (this.eat("PUNCTUATION") !== ")") {
      throw new SyntaxError("Expected ')' after while condition.");
    }

    const block = this.block();

    return {
      type: "WhileStatement",
      condition,
      block,
    };
  }

  forStatement() {
    this.eat("KEYWORD"); // Consome o 'for'

    if (this.currentToken.value !== "(") {
      throw new SyntaxError("Expected '(' after 'for'.");
    }
    this.eat("PUNCTUATION");

    let initializer = this.eat("IDENTIFIER")
      ? this.assignmentExpression()
      : null;

    if (this.currentToken.value !== ";") {
      throw new SyntaxError("Expected ';' after initializer in 'for'.");
    }
    this.eat("PUNCTUATION");

    const condition = this.expression();

    if (this.currentToken.value !== ";") {
      throw new SyntaxError("Expected ';' after condition in 'for'.");
    }
    this.eat("PUNCTUATION");

    const increment = this.expression();

    if (this.currentToken.value !== ")") {
      throw new SyntaxError("Expected ')' after increment in 'for'.");
    }
    this.eat("PUNCTUATION");
    const block = this.block();

    return {
      type: "ForStatement",
      initializer,
      condition,
      increment,
      block,
    };
  }

  assignmentExpression() {
    const identifier = this.eat("IDENTIFIER");
    if (this.eat("OPERATOR") !== "=") {
      throw new SyntaxError("Expected '=' in assignment.");
    }
    const value = this.expression();
    return { type: "AssignmentExpression", name: identifier, value };
  }

  parameterList() {
    let params = [];
    if (this.eat("PUNCTUATION") === "(") {
      while (this.currentToken && this.currentToken.type !== "PUNCTUATION") {
        const type = this.eat("KEYWORD");
        if (type && ["int", "float", "string", "bool"].includes(type)) {
          const name = this.identifier();
          if (!name) {
            throw new SyntaxError("Expected parameter name.");
          }
          params.push({ type, name });
        }
        if (this.eat("PUNCTUATION") !== ",") {
          break;
        }
      }
      if (this.eat("PUNCTUATION") !== ")") {
        throw new SyntaxError(
          "Expected closing parenthesis in parameter list."
        );
      }
    }
    return params;
  }

  identifier() {
    const token = this.eat("IDENTIFIER");
    if (!token) {
      throw new SyntaxError("Expected identifier.");
    }
    return token;
  }

  expression() {
    return this.term();
  }

  term() {
    let left = this.factor();
    while (
      this.currentToken &&
      this.currentToken.type === "OPERATOR" &&
      ["+", "-", "*", "/"].includes(this.currentToken.value)
    ) {
      let op = this.eat("OPERATOR");
      let right = this.factor();
      left = { type: "BinaryExpression", operator: op, left, right };
    }
    return left;
  }

  factor() {
    const number = this.eat("NUMBER");
    if (number) {
      return { type: "NumberLiteral", value: parseFloat(number) };
    }
    const boolean = this.eat("BOOLEAN");
    if (boolean) {
      return { type: "BooleanLiteral", value: boolean === "true" };
    }
    const string = this.eat("STRING");
    if (string) {
      const value = string
        .slice(1, -1)
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
      return { type: "StringLiteral", value };
    }
    const identifier = this.eat("IDENTIFIER");
    if (identifier) {
      return { type: "Identifier", name: identifier };
    }
    if (this.eat("PUNCTUATION") === "(") {
      const expr = this.expression();
      if (this.eat("PUNCTUATION") !== ")") {
        throw new SyntaxError("Expected closing ')'");
      }
      return expr;
    }
    throw new SyntaxError("Invalid factor.");
  }

  parse(input) {
    const lexer = new Lexer(input);
    const tokens = lexer.tokenize();
    this.tokens = tokens;
    this.currentToken = this.tokens[0];
    return this.program();
  }
  0;
}

fs.readFile("code.txt", "utf8", (err, data) => {
  if (err) {
    console.error("Erro ao ler o arquivo:", err);
    return;
  }
  try {
    const lexer = new Lexer(data);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.program();
    console.log("Árvore de sintaxe analisada:", JSON.stringify(ast, null, 2));
  } catch (error) {
    console.error("Erro durante a análise sintática:", error.message);
  }
});
