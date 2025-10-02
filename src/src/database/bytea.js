// src/database/bytea.js
import { customType } from 'drizzle-orm/pg-core';

export const bytea = customType({
  dataType: () => 'bytea',
  fromDriver: (value) => {
    if (value instanceof Uint8Array) {
      return Buffer.from(value);
    }
    throw new Error('Expected Uint8Array from database');
  },
  toDriver: (buffer) => {
    if (Buffer.isBuffer(buffer)) {
      return new Uint8Array(buffer);
    }
    throw new Error('Expected Buffer');
  }
});
