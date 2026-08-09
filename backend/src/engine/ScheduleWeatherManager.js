/**
 * ScheduleWeatherManager tracks time progression, active F1 schedule event, and weather condition.
 */
export function timeToSeconds(timeStr) {
  const [hrs, mins] = timeStr.split(':').map(n => parseInt(n, 10));
  return hrs * 3600 + mins * 60;
}

export function secondsToTime(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600) % 24;
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(hrs)}:${pad(mins)}`;
}

export class ScheduleWeatherManager {
  constructor(schedule, weatherSchedule) {
    this.schedule = (schedule || []).map(([time, event]) => ({
      time,
      seconds: timeToSeconds(time),
      event
    })).sort((a, b) => a.seconds - b.seconds);

    this.weatherSchedule = (weatherSchedule || []).map(([time, condition, intensity]) => ({
      time,
      seconds: timeToSeconds(time),
      condition,
      intensity
    })).sort((a, b) => a.seconds - b.seconds);
  }

  getActiveEvent(simSeconds) {
    if (this.schedule.length === 0) return 'ENTRY';
    
    let active = this.schedule[0].event;
    for (const item of this.schedule) {
      if (simSeconds >= item.seconds) {
        active = item.event;
      } else {
        break;
      }
    }
    return active;
  }

  getWeatherAt(simSeconds) {
    if (this.weatherSchedule.length === 0) {
      return { condition: 'sunny', intensity: 0.1, speedMultiplier: 1.0 };
    }

    let active = this.weatherSchedule[0];
    for (const item of this.weatherSchedule) {
      if (simSeconds >= item.seconds) {
        active = item;
      } else {
        break;
      }
    }

    let speedMultiplier = 1.0;
    switch (active.condition) {
      case 'cloudy':
        speedMultiplier = 0.95;
        break;
      case 'rain':
        speedMultiplier = 0.85;
        break;
      case 'heavy_rain':
        speedMultiplier = 0.70;
        break;
      case 'sunny':
      default:
        speedMultiplier = 1.0;
        break;
    }

    return {
      condition: active.condition,
      intensity: active.intensity,
      speedMultiplier
    };
  }
}
