"use client";

import { differenceInMinutes, parse } from "date-fns";
import { useEffect, useState } from "react";
import { Icons } from "./icons";

export function TimeRangeInput({
  value,
  onChange,
}: {
  value: { start: string | undefined; stop: string | undefined };
  onChange: (value: { start: string; stop: string }) => void;
}) {
  // Ensure we never have undefined values for controlled inputs
  const [startTime, setStartTime] = useState(value.start || "");
  const [stopTime, setStopTime] = useState(value.stop || "");
  const [duration, setDuration] = useState("");

  useEffect(() => {
    setStartTime(value.start || "");
    setStopTime(value.stop || "");
  }, [value]);

  useEffect(() => {
    if (!(startTime && stopTime)) {
      return;
    }

    const start = parse(startTime, "HH:mm", new Date());
    let stop = parse(stopTime, "HH:mm", new Date());

    // If stop time is before start time, assume it's on the next day
    if (stop < start) {
      stop = new Date(stop.getTime() + 24 * 60 * 60 * 1000); // Add 24 hours
    }

    const diff = differenceInMinutes(stop, start);
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    setDuration(`${hours}h ${minutes}min`);
  }, [startTime, stopTime]);

  return (
    <div className="flex w-full items-center border border-input bg-background px-4 py-2">
      <div className="flex flex-1 items-center space-x-2">
        <Icons.Time className="h-5 w-5 text-muted-foreground" />
        <input
          className="bg-transparent text-sm focus:outline-none"
          onChange={(e) => {
            setStartTime(e.target.value);
            onChange({ start: e.target.value, stop: stopTime });
          }}
          type="time"
          value={startTime}
        />
      </div>
      <div className="mx-4 flex flex-shrink-0 items-center justify-center">
        <Icons.ArrowRightAlt className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex flex-1 items-center justify-end space-x-2">
        <input
          className="bg-transparent text-sm focus:outline-none"
          onChange={(e) => {
            setStopTime(e.target.value);
            onChange({ start: startTime, stop: e.target.value });
          }}
          type="time"
          value={stopTime}
        />
        <span className="text-muted-foreground text-sm">{duration}</span>
      </div>
    </div>
  );
}
