import { API, Service } from 'homebridge';
import { HomeServerConnector } from '../../hs';

export const addObstructionDetectedCharacteristic = (api: API,
  service: Service,
  hsd: HomeServerConnector,
  getEndpoint: string): void => {

  const obstructionDetected = service.getCharacteristic(api.hap.Characteristic.ObstructionDetected);

  // Add subscription
  hsd.addListener(reading => {
    obstructionDetected.updateValue(Boolean(reading));
  }, getEndpoint);

  obstructionDetected.onGet(async () => {
    return Boolean(hsd.getCo(getEndpoint));
  });
};

