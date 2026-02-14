import { createContext, useContext, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { getMeetings as apiGetMeetings } from '../services/api';

type Note = {
  id: string;
  points: Array<{ id: string; text: string }>;
  important: boolean;
  followUp: boolean;
};

type Meeting = {
  id: string;
  center: string;
  personName?: string;
  date: string;
  day?: string;
  startTime: string;
  endTime: string;
  place?: string;
  attendance?: string;
  meetingType: string;
  notes: Note[];
  createdAt: string;
};

interface MeetingsContextType {
  meetings: Meeting[];
  loading: boolean;
  fetchMeetings: (force?: boolean) => Promise<void>;
  invalidateCache: () => void;
}

const MeetingsContext = createContext<MeetingsContextType | undefined>(undefined);

export const MeetingsProvider = ({ children }: { children: ReactNode }) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef<{ data: Meeting[] | null; timestamp: number | null }>({
    data: null,
    timestamp: null,
  });
  const fetchingRef = useRef(false);

  const fetchMeetings = async (force = false) => {
    // If already fetching, don't start another request
    if (fetchingRef.current) return;

    // Check cache (valid for 30 seconds)
    const now = Date.now();
    const CACHE_DURATION = 30000; // 30 seconds
    
    if (
      !force &&
      cacheRef.current.data &&
      cacheRef.current.timestamp &&
      now - cacheRef.current.timestamp < CACHE_DURATION
    ) {
      // Use cached data
      setMeetings(cacheRef.current.data);
      return;
    }

    try {
      fetchingRef.current = true;
      setLoading(true);
      const data = await apiGetMeetings();
      setMeetings(data);
      
      // Update cache
      cacheRef.current = {
        data,
        timestamp: now,
      };
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  const invalidateCache = () => {
    cacheRef.current = { data: null, timestamp: null };
  };

  return (
    <MeetingsContext.Provider
      value={{
        meetings,
        loading,
        fetchMeetings,
        invalidateCache,
      }}
    >
      {children}
    </MeetingsContext.Provider>
  );
};

export const useMeetings = () => {
  const context = useContext(MeetingsContext);
  if (context === undefined) {
    throw new Error('useMeetings must be used within a MeetingsProvider');
  }
  return context;
};
