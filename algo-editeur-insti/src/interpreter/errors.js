export class AlgoError extends Error {
  constructor(message, { line = 0, column = 0, type = 'unknown', hint = null } = {}) {
    super(message);
    this.name = 'AlgoError';
    this.line = line;
    this.column = column;
    this.type = type;
    this.hint = hint;
  }

  toJSON() {
    return {
      type: this.type,
      line: this.line,
      column: this.column,
      message: this.message,
      hint: this.hint,
    };
  }
}

export class LexError extends AlgoError {
  constructor(message, line = 0, column = 0, hint = null) {
    super(message, { line, column, type: 'lexical', hint });
    this.name = 'LexError';
  }
}

export class SyntaxError_ extends AlgoError {
  constructor(message, line = 0, column = 0, hint = null) {
    super(message, { line, column, type: 'syntax', hint });
    this.name = 'SyntaxError';
  }
}

export class SemanticError extends AlgoError {
  constructor(message, line = 0, column = 0, hint = null) {
    super(message, { line, column, type: 'semantic', hint });
    this.name = 'SemanticError';
  }
}

export class RuntimeError extends AlgoError {
  constructor(message, line = 0, column = 0, hint = null) {
    super(message, { line, column, type: 'runtime', hint });
    this.name = 'RuntimeError';
  }
}