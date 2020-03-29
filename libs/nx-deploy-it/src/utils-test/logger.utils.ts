export function clearTimestampFromLogEntry(logEntry: any) {
  delete logEntry.timestamp;
}
