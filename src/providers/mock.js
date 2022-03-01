
export const mockAPI = {
  id: 'mock',
  name: 'MockProvider'
};

// Provider interface

mockAPI.create = (args, nextFn) => {
  nextFn(mockInstance({
    name: args.name,
    ssh_port: args['ssh-port'],
    // Including these here to bypass filters
    virtualbox: {},
    digitalocean: {}
  }));
}

mockAPI.destroy = (instance, nextFn) => {
  nextFn();
}

mockAPI.boot = (instance, nextFn) => {
  nextFn();
}

mockAPI.shutdown = (instance, nextFn) => {
  nextFn();
}

mockAPI.reboot = (instance, nextFn) => {
  nextFn();
}

mockAPI.rebuild = (instance, image, nextFn) => {
  nextFn();
}

mockAPI.resize = (instance, size, nextFn) => {
  nextFn();
}

mockAPI.snapshot = (instance, snapshotName, nextFn) => {
  nextFn();
}

mockAPI.getImages = (nextFn) => {
  nextFn(MOCK_IMAGES);
}

mockAPI.getInstances = (args, nextFn) => {
  nextFn(MOCK_INSTANCES);
}

mockAPI.getInstance = (instance, nextFn) => {
  nextFn(instance);
}

mockAPI.sync = (instance, nextFn) => {
  mockAPI.updateInstanceMetadata(instance, nextFn);
}

mockAPI.updateInstanceMetadata = (instance, nextFn) => {
  nextFn();
}

mockAPI.getRegions = (nextFn) => {
  nextFn(MOCK_REGIONS);
}

mockAPI.getSizes = (nextFn) => {
  nextFn(MOCK_SIZES);
}

mockAPI.getSnapshots = (nextFn) => {
  nextFn([]);
}

mockAPI.getKeys = (nextFn) => {
  nextFn(MOCK_KEYS);
}

mockAPI.createKey = (keyData, nextFn) => {
  nextFn();
}

// Mock data

let IP_ID = 100;

function mockIP() {
  const ip = '192.168.100.' + IP_ID;
  IP_ID += 1;

  return ip;
}

function mockInstance(args) {
  return Object.assign({
    ip: mockIP(),
    name: 'mock-01',
    ssh_key: 'overcast.key',
    ssh_port: '22',
    user: 'root'
  }, args);
}

const MOCK_IMAGES = [
  { name: '20.04' },
  { name: '16.04' }
];

const MOCK_REGIONS = [
  { name: 'nyc1' },
  { name: 'sfo1' }
];

const MOCK_KEYS = [];

const MOCK_INSTANCES = [
  mockInstance({ name: 'mock-01' })
];
