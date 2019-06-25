import {
  ServicesCatalogServer,
  ServiceStatus,
} from '@wix/ambassador-services-catalog-server/rpc';
import {
  determineOfferingTypeBy,
  getOfferingFromResponse as mapServiceResponseDTOtoOffering,
} from './service-dto-to-offering-mapper';
import { OfferingTypes } from './domain/offering';
import { getterOfSessionsFactory } from './slots-adapter';

export const orderPropertyName = 'order';
export const UoUHiddenPropertyName = 'uouHidden';

async function getServiceDTO(aspects, id) {
  console.log(`getServiceDTO('${aspects}', '${id}')`);
  const servicesCatalogService = ServicesCatalogServer().ServicesCatalog();
  return servicesCatalogService(aspects).get({
    id,
    fields: [],
  });
}

async function getOffering(aspects, id) {
  console.log(`getOffering('${aspects}', '${id}')`);
  const serviceResponse = await getServiceDTO(aspects, id);
  if (serviceResponse.status === ServiceStatus.DELETED) {
    return;
  }
  const schedule = serviceResponse.schedules[0];
  const offeringType = determineOfferingTypeBy(schedule.tags);
  let totalNumberOfSessions = 1;
  if (offeringType === OfferingTypes.COURSE) {
    totalNumberOfSessions = await getNumOfSessions(
      getterOfSessionsFactory(aspects),
      schedule,
    );
  }
  return mapServiceResponseDTOtoOffering(
    serviceResponse as any,
    totalNumberOfSessions,
  );
}

async function getNumOfSessions(getterOfSessions, schedule): Promise<number> {
  console.log(`getNumOfSessions('${getterOfSessions}', '${schedule}')`);
  const sessions = await getterOfSessions([schedule.id], {
    startTimestamp: schedule.firstSessionStart,
    endTimestamp: schedule.lastSessionEnd,
  });
  return sessions.length;
}

export default getOffering;
