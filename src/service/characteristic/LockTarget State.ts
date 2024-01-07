import { API, Service } from 'homebridge';
import { HomeServerConnector } from '../../hs';

export const addOnCharacteristic = (api: API,
  service: Service,
  hsd: HomeServerConnector,
  setEndpoint: string,
  getEndpoint: string): void => {

  const lockTargetState = service.getCharacteristic(api.hap.Characteristic.LockTargetState);

  // Add subscription
  hsd.addListener(reading => {
    lockTargetState.updateValue(Number(reading));
  }, getEndpoint);

  lockTargetState.onGet(async () => {
    return Number(hsd.getCo(getEndpoint));
  });

  lockTargetState.onSet(async turnOn => {
    hsd.setCo(setEndpoint, Number(turnOn));
  });
};

