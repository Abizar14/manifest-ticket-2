/** Unit test backend (NestJS) — ts-jest, fokus service murni dengan mock Prisma. */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  moduleFileExtensions: ["ts", "js", "json"],
  // Polyfill Reflect.* agar decorator @Injectable dll bekerja di test.
  setupFiles: ["reflect-metadata"],
};
