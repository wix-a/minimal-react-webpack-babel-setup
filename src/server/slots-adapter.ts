import {
  CalendarServer,
  Session,
  SortDirection,
} from '@wix/ambassador-calendar-server/rpc';
import { Value } from '@wix/ambassador-resources-server/rpc';
export function getterOfSessionsFactory(aspects) {
  const calendarService = CalendarServer().CalendarService();
  return async (
    scheduleIdArray: String[],
    { startTimestamp = null, timeZone = null, endTimestamp = null } = {},
  ): Promise<Session[]> => {
    const request = {
      query: {
        filter: JSON.stringify({
          $and: [
            { from: new Date(startTimestamp).toISOString() },
            { to: new Date(endTimestamp).toISOString() },
            { scheduleIds: scheduleIdArray },
          ],
        }) as Value,
        fieldsets: null,
        fields: null,
        sort: [],
        paging: {
          limit: 1,
        },
      },
    };
    const listSlotsResponse = await calendarService(aspects).listAvailableSlots(
      request,
    );
    return listSlotsResponse.slots;
  };
}
