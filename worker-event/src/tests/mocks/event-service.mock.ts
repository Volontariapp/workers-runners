import { createMock } from '@volontariapp/testing';
import type { EventService } from '@volontariapp/domain-event';

export const createEventServiceMock = () => createMock<EventService>();
