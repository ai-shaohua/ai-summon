export type RepoDirLevel = 'root' | 'client' | 'server';

// Cloud configuration types
export interface CloudConfig {
  ip: string;
  privateKeyFile: string;
}

export interface ServiceConfig {
  dev: CloudConfig;
  staging: CloudConfig;
  prod: CloudConfig;
}

export interface YirenConfig {
  [serviceName: string]: ServiceConfig;
}

export interface HshConfig {
  workingDirectory?: string; // Optional working directory for auto-discovery
  repos: {
    [groupName: string]: {
      [repoName: string]: string;
    };
  };
  yiren: YirenConfig;
  urls?: {
    [name: string]: string;
  };
  urlGroups?: {
    [groupName: string]: string[];
  };
}

export type Environment = 'dev' | 'staging' | 'prod';

// SCP command types
export interface ScpOptions {
  env?: Environment;
  service?: string;
  recursive?: boolean;
}

export interface PathValidationResult {
  exists: boolean;
  isDirectory: boolean;
  isFile: boolean;
  path: string;
}
