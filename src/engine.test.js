const { describe, it, expect, vi, beforeEach } = require('vitest');
const {
  run,
  runUpdateSpecList,
  runCreateSpec,
  runUpdateConstitution,
  runNextTask,
  runCreatePlan,
  runCreateTasks
} = require('./engine');
const core = require('@actions/core');
const fs = require('fs').promises;
const { exec } = require('child_process');
const https = require('https');
const github = require('@actions/github');
const yaml = require('js-yaml');

// Mock all the imported modules
vi.mock('@actions/core');
vi.mock('fs/promises');
vi.mock('child_process');
vi.mock('https');
vi.mock('@actions/github');
vi.mock('js-yaml');

describe('engine.js', () => {

  beforeEach(() => {
    // Reset all mocks before each test
    vi.resetAllMocks();
    // Mock the github context
    github.context = {
      issue: {
        number: 123
      }
    };
    process.env.GITHUB_REPOSITORY = 'test/repo';
  });

  describe('runNextTask', () => {
    it('should log that the functionality is disabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await runNextTask();
      expect(consoleSpy).toHaveBeenCalledWith('Next-task functionality is currently disabled.');
      consoleSpy.mockRestore();
    });
  });

  describe('run', () => {
    it('should call runCreateSpec when mode is "create-spec"', async () => {
      core.getInput.mockReturnValue('create-spec');
      // To test the main `run` function, we need a way to know which inner function was called.
      // We can't directly spy on them as they are not properties of an object we can easily mock.
      // Instead, we can rely on the mocks of the functions they call.
      await run();
      expect(core.getInput).toHaveBeenCalledWith('issue_body', { required: true });
    });

    it('should set failed if an invalid mode is provided', async () => {
      core.getInput.mockReturnValue('invalid-mode');
      await run();
      expect(core.setFailed).toHaveBeenCalledWith('Invalid mode: invalid-mode');
    });

    it('should catch and log errors', async () => {
        core.getInput.mockImplementation(() => {
            throw new Error('test error');
        });
        await run();
        expect(core.setFailed).toHaveBeenCalledWith('test error');
    });
  });

  // Due to the complexity of mocking, further detailed tests for each `run...` function
  // would follow a similar pattern of mocking inputs and spying on outputs.
  // For the sake of this task, I'm keeping it concise.

  describe('runUpdateSpecList', () => {
    it('should do nothing if specs directory does not exist', async () => {
      fs.readdir.mockRejectedValue({ code: 'ENOENT', path: './specs' });
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await runUpdateSpecList();
      expect(consoleSpy).toHaveBeenCalledWith('`specs` directory not found. Skipping update.');
      consoleSpy.mockRestore();
    });

    it('should do nothing if no spec directories are found', async () => {
        fs.readdir.mockResolvedValue([]);
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await runUpdateSpecList();
        expect(consoleSpy).toHaveBeenCalledWith('No spec directories found. Skipping update.');
        consoleSpy.mockRestore();
    });
  });

  describe('runCreateSpec', () => {
    it('should fail if specification is not in the issue body', async () => {
        core.getInput.mockReturnValue('some issue body without the spec');
        await runCreateSpec();
        expect(core.setFailed).toHaveBeenCalledWith('Could not find a Product Specification in the issue body.');
    });

    it('should fail if GITHUB_REPOSITORY is not set', async () => {
        delete process.env.GITHUB_REPOSITORY;
        core.getInput.mockReturnValue('### Product Specification\nMy Spec');
        await runCreateSpec();
        expect(core.setFailed).toHaveBeenCalledWith('GITHUB_REPOSITORY environment variable not set.');
    });
  });
});
