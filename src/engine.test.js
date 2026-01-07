
import { describe, it, expect, vi, beforeEach } from 'vitest';
import https from 'https';
import { Writable } from 'stream';
import * as core from '@actions/core';
import { callJulesApi } from './engine.js';

// Mock @actions/core
vi.mock('@actions/core');

// Mock https.request
const mockRequest = {
  on: vi.fn((event, callback) => {
    if (event === 'error') {
      // Do nothing to prevent the error handler from being called in successful tests
    }
  }),
  write: vi.fn(),
  end: vi.fn(),
};

const mockResponse = {
  statusCode: 200,
  on: vi.fn((event, callback) => {
    if (event === 'data') {
      callback('{}'); // Empty JSON object for a successful response
    }
    if (event === 'end') {
      callback();
    }
  }),
};

vi.mock('https', () => ({
  default: {
    request: vi.fn((options, callback) => {
      callback(mockResponse);
      return mockRequest;
    }),
  },
}));

describe('callJulesApi', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Provide a default mock implementation for getInput
    core.getInput.mockImplementation((name) => {
      if (name === 'jules_api_key') {
        return 'test-api-key';
      }
      return '';
    });

    // Default mock for https.request
    https.request.mockImplementation((options, callback) => {
      callback(mockResponse);
      return mockRequest;
    });
  });

  it('should calculate Content-Length correctly for simple ASCII payload', async () => {
    const payload = { prompt: 'test' };
    await callJulesApi(payload);

    expect(https.request).toHaveBeenCalledTimes(1);
    const options = https.request.mock.calls[0][0];
    const data = JSON.stringify(payload);
    const expectedLength = Buffer.byteLength(data, 'utf8');
    expect(options.headers['Content-Length']).toBe(expectedLength);
  });

  it('should calculate Content-Length correctly for payload with emojis', async () => {
    const payload = { prompt: 'test with emoji 🚀' };
    await callJulesApi(payload);

    expect(https.request).toHaveBeenCalledTimes(1);
    const options = https.request.mock.calls[0][0];
    const data = JSON.stringify(payload);
    const expectedLength = Buffer.byteLength(data, 'utf8');
    expect(options.headers['Content-Length']).toBe(expectedLength);
  });

  it('should calculate Content-Length correctly for payload with various special characters', async () => {
    const payload = { prompt: 'test with special chars ©µñ±' };
    await callJulesApi(payload);

    expect(https.request).toHaveBeenCalledTimes(1);
    const options = https.request.mock.calls[0][0];
    const data = JSON.stringify(payload);
    const expectedLength = Buffer.byteLength(data, 'utf8');
    expect(options.headers['Content-Length']).toBe(expectedLength);
  });

  it('should make a POST request to the correct Jules API endpoint', async () => {
    const payload = { prompt: 'test' };
    await callJulesApi(payload);

    expect(https.request).toHaveBeenCalledTimes(1);
    const options = https.request.mock.calls[0][0];
    expect(options.hostname).toBe('jules.googleapis.com');
    expect(options.path).toBe('/v1alpha/sessions');
    expect(options.method).toBe('POST');
  });

  it('should include the API key in the headers', async () => {
    const payload = { prompt: 'test' };
    await callJulesApi(payload);

    expect(https.request).toHaveBeenCalledTimes(1);
    const options = https.request.mock.calls[0][0];
    expect(options.headers['X-Goog-Api-Key']).toBe('test-api-key');
  });
});
