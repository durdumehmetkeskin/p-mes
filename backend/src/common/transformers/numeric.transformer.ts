import { ValueTransformer } from 'typeorm';

/**
 * Postgres numeric/decimal columns are returned as strings by the driver.
 * This transformer parses them back to JS numbers on read.
 */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : parseFloat(value),
};
