import { PlatformConfig } from 'homebridge';
import type { Service } from 'homebridge';

/// @todo adopt to new config.schema.json layout!

type HsdServiceConfig = {
    serviceType: Exclude<keyof typeof Service, 'prototype'>;
    endpoints: string[];
    options: string[];
    name: string;
};

type HsdAccessoryConfig = {
    services: HsdServiceConfig[];
    name: string;
};

interface HsdPlatformConfig extends PlatformConfig {
    accessories: HsdAccessoryConfig[];

    maxConcurrentMessages: number;
    maxTelegramsPerSecond: number;
    hsdIpGatewayIp: string;
    readTimeout: number;
}

export type { HsdPlatformConfig, HsdAccessoryConfig, HsdServiceConfig };
