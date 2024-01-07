import { API, Service } from 'homebridge';
import { HomeServerConnector } from '../../hs';

export const addPositionStateCharacteristic = (api: API,
  service: Service,
  hsd: HomeServerConnector,
  getEndpoint: string): void => {

  const positionState = service.getCharacteristic(api.hap.Characteristic.PositionState);

  // Add subscription
  hsd.addListener(reading => {
    positionState.updateValue(Number(reading));
  }, getEndpoint);

  positionState.onGet(async () => {
    return Number(hsd.getCo(getEndpoint));
  });
};

