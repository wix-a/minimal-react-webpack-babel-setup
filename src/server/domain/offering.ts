export enum PaymentType {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  ALL = 'ALL',
}

export enum OfferingTypes {
  GROUP = 'GROUP',
  INDIVIDUAL = 'INDIVIDUAL',
  COURSE = 'COURSE',
}

export interface Image {
  width: number;
  height: number;
  relativeUri: string;
}

export interface Days {
  mon?: Day;
  tue?: Day;
  wed?: Day;
  thu?: Day;
  fri?: Day;
  sat?: Day;
  sun?: Day;
}

export enum DayNames {
  mon = 'mon',
  tue = 'tue',
  wed = 'wed',
  thu = 'thu',
  fri = 'fri',
  sat = 'sat',
  sun = 'sun',
}

export interface WorkingHour {
  startTime: string;
  endTime?: string;
}

export interface Day {
  workingHours?: {
    id?: string;
    teacher?: string;
    staffId?: string;
    workingHour?: WorkingHour;
  }[];
  enabled?: boolean;
}
