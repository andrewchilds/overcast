# Implementing a New Provider for Overcast

Overcast is designed with a modular provider system that allows you to add support for different cloud providers. This guide will walk you through implementing a new provider for Overcast.

## Provider Interface Overview

A provider in Overcast consists of two main components:

1. **Provider API Module** - The implementation of cloud provider-specific API calls
2. **Provider Command Module** - The CLI commands that expose provider functionality

## Step 1: Create the Provider API Module

Create a new file in `/src/providers/your-provider.js` that exports an API object.

```javascript
import * as utils from '../utils.js';
import * as log from '../log.js';

export const api = {
  id: 'your-provider',
  name: 'Your Provider Name'
};

// Optional default values for provider
export const DEFAULT_IMAGE = 'ubuntu-20-04';
export const DEFAULT_SIZE = 'medium';
export const DEFAULT_REGION = 'us-east';

// Required provider methods implementation
```

### Required Provider Methods

The provider API must implement some or all of the following methods. At minimum, you should implement `create` and `destroy`:

```javascript
// Core instance management methods
api.create = (args, nextFn = () => {}) => {
  // Create a new instance and call nextFn with instance data
  // The instance object should include name, ip, ssh_key, ssh_port, user, and provider-specific data
};

api.destroy = (instance, nextFn = () => {}) => {
  // Destroy the instance and call nextFn when complete
};

// Instance power management methods
api.boot = (instance, nextFn = () => {}) => {
  // Power on the instance
};

api.shutdown = (instance, nextFn = () => {}) => {
  // Gracefully shut down the instance
};

api.reboot = (instance, nextFn = () => {}) => {
  // Reboot the instance
};

// Instance configuration methods
api.rebuild = (instance, image, nextFn = () => {}) => {
  // Rebuild an instance with a new image
};

api.resize = (instance, size, nextFn = () => {}) => {
  // Change the instance size/resources
};

api.snapshot = (instance, snapshotName, nextFn = () => {}) => {
  // Create a snapshot of the instance
};

// Information retrieval methods
api.getImages = (nextFn = () => {}) => {
  // Return available images
};

api.getInstances = (args, nextFn = () => {}) => {
  // Return all instances from the provider
};

api.getInstance = (instance, nextFn = () => {}) => {
  // Get detailed information about a specific instance
};

api.updateInstanceMetadata = (instance, nextFn = () => {}) => {
  // Update the stored metadata for an instance
};

api.sync = (instance, nextFn = () => {}) => {
  // Sync instance data with the provider
};

api.getRegions = (nextFn = () => {}) => {
  // Return available regions
};

api.getSizes = (nextFn = () => {}) => {
  // Return available instance sizes
};

api.getSnapshots = (nextFn = () => {}) => {
  // Return available snapshots
};
```

## Step 2: Create the Provider Command Module

Create a new file in `/src/commands/your-provider.js` that defines the CLI commands for your provider:

```javascript
import * as filters from '../filters.js';
import * as provider from '../provider.js';
import { isTestRun } from '../utils.js';
import { api } from '../providers/your-provider.js';
import { mockAPI } from '../providers/mock.js';

function getAPI() {
  return isTestRun() ? mockAPI : api;
}

export const commands = {};

// Optional banner message for this provider
export const banner = [
  'These commands require YourProvider credentials to be set.',
  'Set YOUR_PROVIDER_API_KEY in variables.json to use these commands.'
];

// Define commands that map to provider API functionality
```

### Defining Provider Commands

For each provider capability you want to expose as a CLI command:

```javascript
commands.create = {
  name: 'create',
  usage: ['overcast your-provider create [name] [options...]'],
  description: ['Creates a new instance on Your Provider.'],
  examples: [
    '# Create a basic instance:',
    '$ overcast your-provider create vm-01 --size medium --region us-east'
  ],
  required: [
    { name: 'name', filters: filters.shouldBeNewInstance }
  ],
  options: [
    { usage: '--cluster CLUSTER', default: 'default' },
    { usage: '--ssh-port PORT', default: '22' },
    { usage: '--ssh-key PATH', default: 'overcast.key' },
    { usage: '--region REGION', default: api.DEFAULT_REGION },
    { usage: '--image IMAGE', default: api.DEFAULT_IMAGE },
    { usage: '--size SIZE', default: api.DEFAULT_SIZE }
    // Add any provider-specific options here
  ],
  run: (args, nextFn) => {
    provider.create(getAPI(), args, nextFn);
  }
};

// Add other commands like destroy, boot, shutdown, etc.
```

## Step 3: Handle Provider-Specific Authentication

In most cases, your provider will need authentication credentials. These should be stored in the Overcast variables.json file:

1. Document the required credentials in your provider's banner
2. Add code to check for these credentials in your provider API module:

```javascript
function getAPI() {
  if (PRIVATE_CACHE.API) {
    return PRIVATE_CACHE.API;
  }

  const vars = utils.getVariables();
  if (!vars.YOUR_PROVIDER_API_KEY) {
    log.failure('The variable YOUR_PROVIDER_API_KEY is not set.');
    log.failure('Go to https://your-provider.com/settings/api');
    log.failure('to get your API key, then run the following command:');
    return utils.die('overcast var set YOUR_PROVIDER_API_KEY [your_api_key]');
  }

  // Initialize your provider's API client with the credentials
  PRIVATE_CACHE.API = new YourProviderClient(vars.YOUR_PROVIDER_API_KEY);

  return PRIVATE_CACHE.API;
}
```

## Step 4: Implement Instance Metadata Structure

When creating instances, your provider should return consistent instance metadata. Here's an example structure:

```javascript
const instanceMetadata = {
  name: 'vm-name',          // Instance name in Overcast
  ip: '123.456.789.0',      // Public IP address
  ssh_key: 'overcast.key',  // SSH key path
  ssh_port: '22',           // SSH port
  user: 'root',             // Default SSH user
  your_provider: {          // Provider-specific metadata
    id: 'instance-id',
    region: 'us-east',
    size: 'medium',
    image: 'ubuntu-20.04',
    // Include any other provider-specific details
  }
};
```

## Step 5: Testing Your Provider

1. Create a mock implementation for testing:
   - Either extend the existing mock API in mock.js
   - Or create test-specific mock responses

2. Test key provider flows:
   - Instance creation and destruction
   - Power management operations
   - Configuration changes (resize, rebuild)

## Best Practices

1. **Error Handling**: Use a consistent approach for error handling, similar to the `genericCatch` function in the DigitalOcean provider.

2. **Async Operations**: Most cloud provider APIs are asynchronous. Use promises or callbacks consistently.

3. **User Feedback**: Provide clear feedback about operations using `log.success`, `log.faded`, and `log.failure`.

4. **Documentation**: Add examples to command descriptions showing how to use your provider's specific features.

5. **Validation**: Validate inputs before making API calls to prevent errors.

## Complete Example Structure

Your final implementation should include:

1. `/src/providers/your-provider.js` - Provider API implementation
2. `/src/commands/your-provider.js` - CLI commands for your provider

To make your provider available in Overcast, you'll also need to:

1. Import your command module in the main `providers/index.js` and `commands/index.js` files
2. Generate documentation for your provider in the README.md using `npm run docs`

By following these guidelines, you can create a new provider that integrates seamlessly with the Overcast ecosystem.
