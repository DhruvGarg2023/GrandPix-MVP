/**
 * ScheduleWeatherManager tracks time progression, active F1 schedule event, and weather condition.
 * Robustly parses both array tuple format [time, event] and object schema format { time, event }.
 */
export function timeToSeconds(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.split(':');
  const hrs = parseInt(parts[0] || '0', 10);
  const mins = parseInt(parts[1] || '0', 10);
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
    this.schedule = (schedule || []).map(item => {
      if (Array.isArray(item)) {
        const [time, event] = item;
        return { time, seconds: timeToSeconds(time), event };
      } else if (typeof item === 'object' && item !== null) {
        const time = item.time;
        const event = (item.event || item.name || 'ENTRY').toUpperCase();
        return { time, seconds: timeToSeconds(time), event, demandMultiplier: item.demand_multiplier || 1.0 };
      }
      return null;
    }).filter(Boolean).sort((a, b) => a.seconds - b.seconds);

    this.weatherSchedule = (weatherSchedule || []).map(item => {
      if (Array.isArray(item)) {
        const [time, condition, intensity] = item;
        return { time, seconds: timeToSeconds(time), condition, intensity: intensity || 0.1 };
      } else if (typeof item === 'object' && item !== null) {
        const time = item.time;
        const condition = item.condition || 'sunny';
        const intensity = item.rain_probability !== undefined ? item.rain_probability : (item.intensity || 0.1);
        return { time, seconds: timeToSeconds(time), condition, intensity };
      }
      return null;
    }).filter(Boolean).sort((a, b) => a.seconds - b.seconds);
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
      case 'partly_cloudy':
      case 'overcast':
        speedMultiplier = 0.95;
        break;
      case 'light_rain':
      case 'rain':
        speedMultiplier = 0.85;
        break;
      case 'heavy_rain':
        speedMultiplier = 0.70;
        break;
      case 'sunny':
      case 'clear':
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
