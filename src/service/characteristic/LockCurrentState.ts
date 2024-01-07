import { API, Service } from 'homebridge';
import { HomeServerConnector } from '../../hs';

export const addOnCharacteristic = (api: API,
  service: Service,
  hsd: HomeServerConnector,
  setEndpoint: string,
  getEndpoint: string): void => {

  const lockCurrentState = service.getCharacteristic(api.hap.Characteristic.LockCurrentState);

  // Add subscription
  hsd.addListener(reading => {
    lockCurrentState.updateValue(Number(reading));
  }, getEndpoint);

  lockCurrentState.onGet(async () => {
    return Number(hsd.getCo(getEndpoint));
  });

  lockCurrentState.onSet(async turnOn => {
    hsd.setCo(setEndpoint, Number(turnOn));
  });
};

