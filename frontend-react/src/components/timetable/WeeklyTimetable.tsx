import React from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import {
  DateSelectArg,
  EventClickArg,
  EventContentArg,
  EventDropArg,
  EventInput,
} from '@fullcalendar/core';
import { Box } from '@mui/material';

/** A calendar block. `title`/`subtitle` are pre-resolved display strings. */
export interface CalendarBlock {
  id: string;
  start: string; // local ISO, no tz
  end: string;
  color: string;
  title: string;
  subtitle?: string;
}

interface WeeklyTimetableProps {
  events: CalendarBlock[];
  /** Week the grid opens on — must match the week the events are dated to. */
  initialDate: string;
  /** Read-only mode: no select/drag/resize, cards not clickable. */
  readOnly?: boolean;
  /** Grid start (HH:mm:ss). Defaults to 07:00:00. */
  slotMinTime?: string;
  /** Grid end (HH:mm:ss). Defaults to 21:00:00. */
  slotMaxTime?: string;
  onSelectRange?: (start: string, end: string) => void;
  onEventClick?: (id: string) => void;
  onEventDrop?: (id: string, start: string, end: string) => void;
  onEventResize?: (id: string, start: string, end: string) => void;
}

/** Local-ISO string (no tz) from a Date, so times stay in the user's wall clock. */
const toLocalIso = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
};

const renderEvent = (arg: EventContentArg) => {
  const { subtitle } = arg.event.extendedProps as { subtitle?: string };
  return (
    <Box sx={{ px: 0.5, py: 0.25, overflow: 'hidden', lineHeight: 1.2 }}>
      <Box sx={{ fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
        {arg.event.title}
      </Box>
      {subtitle && (
        <Box sx={{ fontSize: 11, opacity: 0.9, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
          {subtitle}
        </Box>
      )}
      <Box sx={{ fontSize: 10, opacity: 0.85 }}>{arg.timeText}</Box>
    </Box>
  );
};

const WeeklyTimetable: React.FC<WeeklyTimetableProps> = ({
  events,
  initialDate,
  readOnly = false,
  slotMinTime = '07:00:00',
  slotMaxTime = '21:00:00',
  onSelectRange,
  onEventClick,
  onEventDrop,
  onEventResize,
}) => {
  const calendarEvents: EventInput[] = events.map(e => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    backgroundColor: e.color,
    borderColor: e.color,
    textColor: '#ffffff',
    extendedProps: { subtitle: e.subtitle },
  }));

  const handleSelect = (arg: DateSelectArg) => {
    onSelectRange?.(toLocalIso(arg.start), toLocalIso(arg.end));
  };

  const handleEventClick = (arg: EventClickArg) => {
    onEventClick?.(arg.event.id);
  };

  const handleEventDrop = (arg: EventDropArg) => {
    const { event } = arg;
    if (event.start && event.end) {
      onEventDrop?.(event.id, toLocalIso(event.start), toLocalIso(event.end));
    }
  };

  const handleEventResize = (arg: EventResizeDoneArg) => {
    const { event } = arg;
    if (event.start && event.end) {
      onEventResize?.(event.id, toLocalIso(event.start), toLocalIso(event.end));
    }
  };

  return (
    <Box
      sx={{
        // FullCalendar theming to match the MUI palette.
        '& .fc': { fontFamily: 'inherit' },
        '& .fc .fc-col-header-cell-cushion': { fontWeight: 600, color: 'text.primary', textDecoration: 'none' },
        '& .fc .fc-timegrid-slot-label-cushion': { fontSize: 12, color: 'text.secondary' },
        '& .fc .fc-toolbar-title': { fontSize: 18, fontWeight: 600 },
        '& .fc .fc-event': { borderRadius: 6, cursor: readOnly ? 'default' : 'pointer', border: 'none' },
        '& .fc .fc-timegrid-now-indicator-line': { borderColor: 'secondary.main' },
      }}
    >
      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        initialDate={initialDate}
        // Recurring weekly schedule: every week is identical, so hide navigation
        // and show weekday names only (no dates).
        headerToolbar={false}
        dayHeaderFormat={{ weekday: 'long' }}
        allDaySlot={false}
        slotMinTime={slotMinTime}
        slotMaxTime={slotMaxTime}
        slotDuration="00:30:00"
        firstDay={1}
        selectable={!readOnly}
        selectMirror={!readOnly}
        editable={!readOnly}
        eventResizableFromStart={!readOnly}
        eventStartEditable={!readOnly}
        eventDurationEditable={!readOnly}
        expandRows
        height="auto"
        events={calendarEvents}
        eventContent={renderEvent}
        select={handleSelect}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
      />
    </Box>
  );
};

export default WeeklyTimetable;
