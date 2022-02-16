// A module to contain all in-memory application state.

const STORE = {};

export function clearStore() {
  STORE = {};
}

export function setStore(key, val) {
  STORE[key] = val;
};

export function getStore(key) {
  return STORE[key];
}

export function appendToStore(key, val) {
  STORE[key] = STORE[key] || [];
  STORE[key].push(val);
}

export function setArgString(str) {
  STORE.ARG_STRING = str;
}

export function getArgString() {
  return STORE.ARG_STRING;
}

export function setConfigDirs(path) {
  setConfigDir(path);
  setClustersJSON(path + '/clusters.json');
  setVariablesJSON(path + '/variables.json');
}

export function setConfigDir(path) {
  return STORE.CONFIG_DIR = path;
}

export function getConfigDir() {
  return STORE.CONFIG_DIR;
}

export function setClustersJSON(path) {
  return STORE.CLUSTERS_JSON = path;
}

export function getClustersJSON() {
  return STORE.CLUSTERS_JSON;
}

export function setVariablesJSON(path) {
  return STORE.VARIABLES_JSON = path;
}

export function getVariablesJSON() {
  return STORE.VARIABLES_JSON;
}

export function increaseSSHCount() {
  STORE.SSH_COUNT += 1;
}

export function getSSHCount() {
  return STORE.SSH_COUNT || 0;
}

export function decreaseSSHCount() {
  STORE.SSH_COUNT -= 1;
}
