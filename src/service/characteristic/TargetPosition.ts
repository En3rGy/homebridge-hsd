import { API, Service } from 'homebridge';
import { HomeServerConnector } from '../../hs';

export const addTargetPositionCharacteristic = (api: API,
  service: Service,
  hsd: HomeServerConnector,
  setEndpoint: string,
  getEndpoint: string): void => {

  const targetPosition = service.getCharacteristic(api.hap.Characteristic.TargetPosition);

  // Add subscription
  hsd.addListener(reading => {
    targetPosition.updateValue(Number(reading));
  }, getEndpoint);

  targetPosition.onGet(async () => {
    return Number(hsd.getCo(getEndpoint));
  });

  targetPosition.onSet(async state => {
    hsd.setCo(setEndpoint, Number(state));
  });
};

