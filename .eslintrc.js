module.exports = {
  env: {
    es6: true
  },
  extends: "eslint:recommended",
  globals: {
    alert: "readonly",
    app: "readonly",
    Atomics: "readonly",
    ExportType: "readonly",
    ExportOptionsPNG24: "readonly",
    ExportOptionsSVG: "readonly",
    File: "readonly",
    Folder: "readonly",
    SharedArrayBuffer: "readonly",
    SVGFontSubsetting: "readonly"
  },
  parserOptions: {
    ecmaVersion: 2018
  },
  rules: {}
};
