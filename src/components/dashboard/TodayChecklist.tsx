import React, { useState, useEffect } from 'react';
import { Activity, ActivityRecord } from '@/types';
import { activityAPI, recordAPI } from '@/services/api';
import { formatDate, shiftDateKey, todayKey } from '@/utils/labels';

export const TodayChecklist: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [records, setRecords] = useState<ActivityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const today = todayKey();
  const yesterday = shiftDateKey(today, -1);
  const [selectedDate, setSelectedDate] = useState(today);

  const fetchRecords = async (date: string) => {
    const recordsRes = await recordAPI.getRecords(undefined, date, date);
    setRecords(recordsRes.data);
  };

  useEffect(() => {
    activityAPI
      .getActivities()
      .then((res) => setActivities(res.data.filter((a) => a.isActive)))
      .catch((err) => console.error('Failed to fetch activities:', err))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    setError('');
    fetchRecords(selectedDate).catch((err) => console.error('Failed to fetch records:', err));
  }, [selectedDate]);

  const handleRecordUpdate = async (activityId: number, completed: number) => {
    try {
      setError('');
      const existingRecord = records.find(
        (r) => r.activityId === activityId && r.date.startsWith(selectedDate)
      );

      if (existingRecord) {
        await recordAPI.updateRecord(existingRecord.id, { completed });
      } else {
        await recordAPI.createRecord(activityId, completed, '', selectedDate);
      }

      await fetchRecords(selectedDate);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menyimpan laporan');
    }
  };

  const handleDateChange = (value: string) => {
    if (value && value <= today) setSelectedDate(value);
  };

  if (isLoading) return <div className="loading">Memuat checklist...</div>;

  const isToday = selectedDate === today;

  return (
    <div className="today-checklist">
      <div className="checklist-header">
        <h2>{isToday ? 'Checklist Hari Ini' : `Checklist ${formatDate(selectedDate)}`}</h2>
        <div className="period-picker">
          <div className="segmented">
            <button
              type="button"
              className={isToday ? 'selected' : ''}
              onClick={() => setSelectedDate(today)}
            >
              Hari ini
            </button>
            <button
              type="button"
              className={selectedDate === yesterday ? 'selected' : ''}
              onClick={() => setSelectedDate(yesterday)}
            >
              Kemarin
            </button>
          </div>
          <input
            type="date"
            value={selectedDate}
            max={today}
            onChange={(e) => handleDateChange(e.target.value)}
            aria-label="Tanggal laporan"
          />
        </div>
      </div>
      {!isToday && (
        <p className="checklist-note">Kamu sedang mengisi laporan susulan.</p>
      )}
      {error && <p className="error">{error}</p>}
      {activities.length === 0 && (
        <p className="muted">Belum ada aktivitas aktif. Tambahkan dulu di menu Aktivitas, yuk.</p>
      )}
      {activities.map((activity) => {
        const record = records.find(
          (r) => r.activityId === activity.id && r.date.startsWith(selectedDate)
        );

        return (
          <div key={activity.id} className="checklist-item">
            <h3>{activity.name}</h3>
            <input
              type="number"
              min="0"
              value={record?.completed || 0}
              onChange={(e) =>
                handleRecordUpdate(activity.id, parseInt(e.target.value) || 0)
              }
              max={activity.target}
            />
            <span>
              / {activity.target} {activity.unit}
            </span>
          </div>
        );
      })}
    </div>
  );
};
