import { PlatformConfig } from 'homebridge';
import type { Service } from 'homebridge';

/// @todo adopt to new config.schema.json layout!

type HsdCharacteristicsConfig = {
    characteristicName: string;
    endpoints: string[];
};

type HsdServiceConfig = {
    serviceName: string;
    serviceType: Exclude<keyof typeof Service, 'prototype'>;
    characteristics: HsdCharacteristicsConfig[];
};

type HsdAccessoryConfig = {
    accessoryName: string;
    services: HsdServiceConfig[];
};

interface HsdPlatformConfig extends PlatformConfig {
    hsIp: string;
    hsUserName: string;
    hsUserPw: string;
    hsPort: number;
    accessories: HsdAccessoryConfig[];
}

export type { HsdPlatformConfig, HsdAccessoryConfig, HsdServiceConfig, HsdCharacteristicsConfig };

/*
"hsIp"
"hsUserName"
"hsUserPw"
"hsPort"
"accessories"
    [
        "accessoryName"
        "services"
            [
                "serviceName"
                "serviceType" e.g. "Lightbulb",
                "characteristics"
                    [
                        "characteristicName" e.g. "default": "On"
                        "endpoints" []
                    ]
            ]
    ]
*/