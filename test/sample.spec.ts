/* eslint-disable no-console */

describe('HomeserverConnector', () => {
  beforeAll(() => {
    // Runs once before all tests start
  });

  beforeEach(() => {
    // Runs before each test in the describe block
  });

  afterEach(() => {
    // Runs after each test in the describe block
  });

  afterAll(() => {
    // Runs once after all tests in the describe block are done
  });

  test('My Test', () => {
    // Test code here
  });

  it('correctly adds two numbers', () => {
    expect(1 + 2).toBe(3);
    expect(-1 + 1).toBe(0);
    expect(0 + 0).toBe(0);
  });

  it('handles non-integer values', () => {
    expect(1.5 + 2.3).toBeCloseTo(3.8);
  });
});