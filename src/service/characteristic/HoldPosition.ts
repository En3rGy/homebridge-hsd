import { API, Service } from 'homebridge';
import { HomeServerConnector } from '../../hs';

export const addHoldPositionCharacteristic = (api: API,
  service: Service,
  hsd: HomeServerConnector,
  setEndpoint: string): void => {

  const holdPosition = service.getCharacteristic(api.hap.Characteristic.HoldPosition);

  // Add subscription
  hsd.addListener(reading => {
    holdPosition.updateValue(Boolean(reading));
  }, setEndpoint);

  holdPosition.onSet(async hold => {
    hsd.setCo(setEndpoint, Boolean(hold));
  });
};

