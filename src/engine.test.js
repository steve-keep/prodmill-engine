const engine = require('./engine');
const core = require('@actions/core');
const fs = require('fs').promises;
const { exec } = require('child_process');
const https = require('https');
const github = require('@actions/github');
const yaml = require('js-yaml');

// Mock all imported modules using factory functions
vi.mock('@actions/core', () => ({
  getInput: vi.fn(),
  setFailed: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
  stat: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('child_process', () => ({
  exec: vi.fn((command, callback) => callback(null, { stdout: '', stderr: '' })),
}));

const mockRequest = {
  on: vi.fn(),
  write: vi.fn(),
  end: vi.fn(),
};
const mockResponse = {
  on: vi.fn((event, callback) => {
    if (event === 'end') {
      callback();
    }
  }),
  statusCode: 200,
};
vi.mock('https', () => ({
  request: vi.fn((options, callback) => {
    callback(mockResponse);
    return mockRequest;
  }),
}));

vi.mock('@actions/github', () => ({
  context: {
    issue: {
      number: 123,
    },
  },
}));

vi.mock('js-yaml', () => ({
  load: vi.fn(),
  dump: vi.fn(),
}));


describe('engine.js', () => {

  beforeEach(() => {
    // Reset all mocks and spies before each test
    vi.clearAllMocks();
    vi.restoreAllMocks();
    process.env.GITHUB_REPOSITORY = 'test/repo';
  });

  describe('runNextTask', () => {
    it('should log that the functionality is disabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await engine.runNextTask();
      expect(consoleSpy).toHaveBeenCalledWith('Next-task functionality is currently disabled.');
    });
  });

  describe('run', () => {
    it('should call runCreateSpec when mode is "create-spec"', async () => {
      const runCreateSpecSpy = vi.spyOn(engine, 'runCreateSpec').mockImplementation(async () => {});
      core.getInput.mockReturnValue('create-spec');

      await engine.run();

      expect(runCreateSpecSpy).toHaveBeenCalledTimes(1);
      expect(core.setFailed).not.toHaveBeenCalled();
    });

    it('should set failed if an invalid mode is provided', async () => {
      core.getInput.mockReturnValue('invalid-mode');
      await engine.run();
      expect(core.setFailed).toHaveBeenCalledWith('Invalid mode: invalid-mode');
    });

    it('should catch and log errors', async () => {
        core.getInput.mockImplementation(() => {
            throw new Error('test error');
        });
        await engine.run();
        expect(core.setFailed).toHaveBeenCalledWith('test error');
    });
  });

  describe('runUpdateSpecList', () => {
    it('should do nothing if specs directory does not exist', async () => {
      fs.readdir.mockRejectedValue({ code: 'ENOENT', path: './specs' });
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await engine.runUpdateSpecList();
      expect(consoleSpy).toHaveBeenCalledWith('`specs` directory not found. Skipping update.');
    });

    it('should do nothing if no spec directories are found', async () => {
        fs.readdir.mockResolvedValue([]);
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await engine.runUpdateSpecList();
        expect(consoleSpy).toHaveBeenCalledWith('No spec directories found. Skipping update.');
    });
  });

  describe('runCreateSpec', () => {
    it('should fail if specification is not in the issue body', async () => {
        core.getInput.mockReturnValue('some issue body without the spec');
        await engine.runCreateSpec();
        expect(core.setFailed).toHaveBeenCalledWith('Could not find a Product Specification in the issue body.');
    });

    it('should fail if GITHUB_REPOSITORY is not set', async () => {
        delete process.env.GITHUB_REPOSITORY;
        core.getInput.mockReturnValue('### Product Specification\nMy Spec');
        await engine.runCreateSpec();
        expect(core.setFailed).toHaveBeenCalledWith('GITHUB_REPOSITORY environment variable not set.');
    });
  });
});
