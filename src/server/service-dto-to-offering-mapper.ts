import { Image } from './domain/Image';
import {
  Resource,
  Image as ImageDTO,
  PaymentOptions,
  Schedule,
  GetServiceResponse,
  LocationType as LocationTypeDTO,
  Slug,
  Rate,
} from '@wix/ambassador-services-catalog-server/rpc';
import * as moment from 'moment-timezone';
import { insertIf } from './helpers';
import { LocationType } from './domain/location';
import { OfferingTypes, Day, Days, DayNames } from './domain/offering';
import {
  RecurringInterval,
  Interval,
  LinkedSchedule,
} from '@wix/ambassador-schedule-server/rpc';
import { UoUHiddenPropertyName, orderPropertyName } from './index.remote';

function customProperty(
  customPropertiesDTO: { [key: string]: String },
  property: string,
): String {
  const customProperties = customPropertiesDTO || {};
  return customProperties[property];
}

function mapResourcesDTOToStaffMemberIds(resources: Resource[]): string[] {
  return resources.map(({ id }) => id);
}

function mapImagesDTOtoImages(imagesDTO: ImageDTO[] = []): Image[] {
  return imagesDTO.map(image => ({
    width: image.width,
    height: image.height,
    relativeUri: image.url.split('/').pop(),
  }));
}

function shouldBePaidOnline(paymentOptions: PaymentOptions) {
  return paymentOptions.wixPayOnline && !paymentOptions.wixPayInPerson;
}

function mapPaymentOptionsToPaymentType(paymentOptions: PaymentOptions) {
  if (shouldBePaidOnline(paymentOptions)) {
    return 'ONLINE';
  }
  if (!paymentOptions.wixPayOnline && paymentOptions.wixPayInPerson) {
    return 'OFFLINE';
  }
  return 'ALL';
}

function isOfferedAsOneTime(canBePaidOnline, canBePaidOffline): any {
  return canBePaidOnline || canBePaidOffline;
}

const isFree = (paymentOptions: PaymentOptions) =>
  paymentOptions && paymentOptions.custom;

export function locationTypeFrom(type: LocationTypeDTO) {
  const mapping: Map<LocationTypeDTO, LocationType> = new Map([
    ['CUSTOM', LocationType.CUSTOMER],
    ['OWNER_BUSINESS', LocationType.BUSINESS],
    ['OWNER_CUSTOM', LocationType.OTHER],
  ]) as Map<LocationTypeDTO, LocationType>;

  return mapping.get(type);
}

function latestSlug(slugs: Slug[]) {
  return [...slugs]
    .sort(
      (slugA, slugB) =>
        new Date(slugB.createdAt).getTime() -
        new Date(slugA.createdAt).getTime(),
    )
    .shift().name;
}

export function getZeroPaddedTime(time: number) {
  return `0${time}`.slice(-2);
}

function getStaffIdfromLinkedSchedules(schedules: LinkedSchedule[]): string {
  return schedules && schedules[0] ? schedules[0].scheduleOwnerId : '';
}

export function convertRecurringIntervalsToClassHours(
  intervals: RecurringInterval[],
): Days {
  // init day names
  const classHours = Object.keys(DayNames).reduce((days, dayName) => {
    days[dayName] = null;
    return days;
  }, {});

  for (const recurringInterval of intervals) {
    const dayOfWeek = recurringInterval.interval.daysOfWeek.toLowerCase();

    if (!classHours[dayOfWeek]) {
      classHours[dayOfWeek] = getWorkingHours(recurringInterval);
    } else {
      classHours[dayOfWeek].workingHours.push(
        getAWorkingHour(recurringInterval),
      );
    }
  }

  return classHours;
}

function getHourTime(interval: Interval) {
  const endTime = moment(`1970-01-01T00:00:00.000Z`)
    .add(interval.hourOfDay, 'hours')
    .add(interval.minuteOfHour, 'minutes')
    .add(interval.duration, 'minutes')
    .toISOString()
    .slice(11, 16);

  return {
    startTime: `${getZeroPaddedTime(interval.hourOfDay)}:${getZeroPaddedTime(
      interval.minuteOfHour,
    )}`,
    endTime,
  };
}

function getAWorkingHour(recurringInterval: RecurringInterval) {
  return {
    id: recurringInterval.id,
    workingHour: getHourTime(recurringInterval.interval),
    staffId: getStaffIdfromLinkedSchedules(recurringInterval.affectedSchedules),
    teacher: null,
  };
}

function getWorkingHours(reccuringInterval: RecurringInterval): Day {
  return {
    workingHours: [getAWorkingHour(reccuringInterval)],
  };
}

export function getDuration(schedule: Schedule, serviceType: OfferingTypes) {
  if (serviceType === OfferingTypes.INDIVIDUAL) {
    return schedule.availability.constraints
      ? schedule.availability.constraints.slotDurations[0]
      : null;
  }
  return schedule.intervals[0].interval.duration;
}

function getServicePageUrl(urls) {
  if (urls.servicePageUrl) {
    return `${urls.servicePageUrl.base}/${urls.servicePageUrl.path}`;
  }
  return '';
}

function repeatedEveryXWeeksFrom(intervals: RecurringInterval[] = []) {
  return intervals.length && intervals[0].frequency.repetition;
}

function mapTimestampDTOToDateString(timestamp: string) {
  return timestamp ? moment(timestamp) : null;
}

function priceFrom(rate: Rate): Rate | any {
  return rate.labeledPriceOptions ? rate.labeledPriceOptions.general : {};
}

export function determineOfferingTypeBy(tags: String[]) {
  return tags
    ? (tags.find(
        tag =>
          tag === OfferingTypes.COURSE ||
          tag === OfferingTypes.GROUP ||
          tag === OfferingTypes.INDIVIDUAL,
      ) as OfferingTypes) || OfferingTypes.INDIVIDUAL
    : OfferingTypes.INDIVIDUAL;
}

export function getOfferingFromResponse(
  {
    service = null,
    resources = [],
    pricingPlans = [],
    schedules,
    slugs = [],
    urls,
  }: GetServiceResponse,
  totalNumberOfSessions = 1,
) {
  if (!service) {
    return;
  }

  const schedule = schedules[0];
  const rate = priceFrom(schedule.rate);
  const type = determineOfferingTypeBy(schedule.tags);

  let start = schedule.firstSessionStart;

  if (!start && schedule.intervals) {
    schedule.intervals.forEach(interval => {
      if (!start) {
        start = interval.start;
      }
      if (new Date(interval.start) < new Date(start)) {
        start = interval.start;
      }
    });
  }

  // individual does not have lastSessionEnd, so we just add 1 year to the current time
  const endDate =
    type === OfferingTypes.INDIVIDUAL
      ? moment()
          .add(1, 'years')
          .format()
      : schedule.lastSessionEnd;

  const duration = getDuration(schedule, type);

  return {
    id: service.id,
    categoryId: service.categoryId,
    urlName: latestSlug(slugs),
    order: Number(customProperty(service.customProperties, orderPropertyName)),
    uouHidden:
      customProperty(service.customProperties, UoUHiddenPropertyName) ===
      'true',
    type, //service.customProperties.type,
    info: {
      name: service.info.name,
      description: service.info.description,
      tagLine: service.info.tagLine,
      order: Number(
        customProperty(service.customProperties, orderPropertyName),
      ),
      images: mapImagesDTOtoImages(service.info.images),
    },
    schedulePolicy: {
      staffMembersIds: mapResourcesDTOToStaffMemberIds(resources),
      uouHidden:
        customProperty(service.customProperties, UoUHiddenPropertyName) ===
        'true',
      capacity: schedule.capacity,
      maxParticipantsPerOrder: service.policy.maxParticipantsPerBooking,
      displayOnlyNoBookFlow: !service.policy.isBookOnlineAllowed,
      futureBookingsPolicy: service.policy.futureBookingsPolicy,
      bookUpToXMinutesBefore: service.policy.bookUpToXMinutesBefore || 0,
      isBookable: true,
      minutesBetweenAppointments:
        (schedule.availability.constraints || ({} as any)).timeBetweenSlots ||
        0,
    },
    schedule: {
      scheduleIds: service.scheduleIds,
      startDate: mapTimestampDTOToDateString(start),
      endDate: mapTimestampDTOToDateString(endDate),
      noEndDate: true,
      durationInMinutes: duration,
      ...(schedule.intervals
        ? {
            classHours: convertRecurringIntervalsToClassHours(
              schedule.intervals,
            ),
          }
        : null),
      repeatEveryXWeeks: repeatedEveryXWeeksFrom(schedule.intervals),
      totalNumberOfSessions,
    },
    payment: {
      paymentType: mapPaymentOptionsToPaymentType(service.paymentOptions),
      price: isFree(service.paymentOptions) ? 0 : Number(rate.amount),
      currency: rate.currency,
      isFree: isFree(service.paymentOptions),
      priceText: schedule.rate.priceText,
      minCharge: Number(priceFrom(schedule.rate).downPayAmount),
    },
    location: {
      type: locationTypeFrom(schedule.location.locationType),
      locationText: schedule.location.address,
    },
    offeredAs: [
      ...insertIf(service.paymentOptions.wixPaidPlan, 'PRICING_PLAN'),
      ...insertIf(
        isOfferedAsOneTime(
          service.paymentOptions.wixPayInPerson,
          service.paymentOptions.wixPayOnline,
        ),
        'ONE_TIME',
      ),
    ],
    pricingPlanInfo: {
      displayText: schedule.rate.priceText,
      pricingPlans,
    },
    slugs: slugs.map(({ name }) => name),
    servicePageUrl: getServicePageUrl(urls),
  };
}
