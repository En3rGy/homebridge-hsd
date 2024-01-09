import { API, Service } from 'homebridge';
import { HomeServerConnector } from '../../hs';

export const addBrightnessCharacteristic = (api: API,
  service: Service,
  hsd: HomeServerConnector,
  setEndpoint: string,
  getEndpoint: string): void => {

  const brightness = service.getCharacteristic(api.hap.Characteristic.Brightness);

  // Add subscription
  hsd.addListener(reading => {
    brightness.updateValue(Number(reading));
  }, getEndpoint);

  brightness.onGet(async () => {
    return Number(hsd.getCo(getEndpoint));
  });

  brightness.onSet(async state => {
    hsd.setCo(setEndpoint, Number(state));
  });
};

