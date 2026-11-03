// In production, always use /api proxy (Vercel rewrites to Railway backend).
// This avoids cross-origin issues that cause "Load failed" on mobile Safari.
// In development, use the env var or default to localhost.
let API_URL: string;
if (import.meta.env.DEV) {
  API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  if (API_URL && !API_URL.startsWith('http') && !API_URL.startsWith('/')) {
    API_URL = `https://${API_URL}`;
  }
} else {
  API_URL = '/api';
}

// Token management for cross-domain auth
const TOKEN_KEY = 'nexus_token';
export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// Returns auth headers with Bearer token if available
const authHeaders = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Wrapper around fetch that automatically adds auth token
const authFetch = (url: string, options: RequestInit = {}): Promise<Response> => {
  const headers = {
    ...authHeaders(),
    ...(options.headers || {}),
  };
  // Do NOT use credentials: 'include' for cross-domain requests.
  // Mobile Safari (ITP) blocks cross-site cookies causing "Load failed".
  // Token-based auth via Authorization header is used instead.
  // Default to no-store cache for API calls to ensure live analytics and avoid stale GET results.
  const { credentials, cache, ...restOptions } = options;
  const effectiveCache = cache || 'no-store';
  return fetch(url, { ...restOptions, headers, cache: effectiveCache });
};

interface LoginCredentials {
  email: string;
  password: string;
}

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

// Login function
export const login = async (credentials: LoginCredentials): Promise<User> => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Login failed');
  }

  const data = await response.json();
  // Store token for cross-domain auth
  if (data.token) {
    setToken(data.token);
  }
  return data.user;
};

// Check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const response = await authFetch(`${API_URL}/auth/me`, {
      method: 'GET',

      headers: { ...authHeaders() },
    });

    if (!response.ok) {
      return false;
    }

    const user = await response.json();
    return user !== null && user !== undefined;
  } catch {
    return false;
  }
};

// Create meeting
export const createMeeting = async (meetingData: any): Promise<any> => {
  const response = await authFetch(`${API_URL}/meetings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },

    body: JSON.stringify(meetingData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create meeting');
  }

  return response.json();
};

// Update meeting
export const updateMeeting = async (id: string, meetingData: any): Promise<any> => {
  const response = await authFetch(`${API_URL}/meetings/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },

    body: JSON.stringify(meetingData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update meeting');
  }

  return response.json();
};

// Get current user
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const response = await authFetch(`${API_URL}/auth/me`, {
      method: 'GET',
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
};

// Sync the browser's detected timezone to the user's profile
export const updateUserTimezone = async (timezone: string): Promise<void> => {
  await authFetch(`${API_URL}/users/timezone`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ timezone }),
  });
};

export const getUserPreferences = async (): Promise<Record<string, any>> => {
  const res = await authFetch(`${API_URL}/users/preferences`);
  if (!res.ok) return {};
  return res.json();
};
export const saveUserPreferences = async (preferences: Record<string, any>): Promise<Record<string, any>> => {
  const res = await authFetch(`${API_URL}/users/preferences`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ preferences }) });
  if (!res.ok) throw new Error('Could not save your settings.');
  return res.json();
};

// Logout function
export const logout = async (): Promise<void> => {
  await authFetch(`${API_URL}/auth/logout`, {
    method: 'POST',
  });
  clearToken();
};

// Get all meetings
export const getMeetings = async (): Promise<any[]> => {
  const response = await authFetch(`${API_URL}/meetings`, {
    method: 'GET',

  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch meetings');
  }

  return response.json();
};

// Get single meeting by id
export const getMeeting = async (id: string): Promise<any> => {
  const response = await authFetch(`${API_URL}/meetings/${id}`, {
    method: 'GET',

  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to fetch meeting');
  }

  return response.json();
};

// Delete a meeting by id
export const deleteMeeting = async (id: string): Promise<void> => {
  const response = await authFetch(`${API_URL}/meetings/${id}`, {
    method: 'DELETE',

  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('NotFound');
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to delete meeting');
  }
};

// Search users for autocomplete (query param)
export const searchUsers = async (query: string): Promise<Array<{ id: string; name?: string }>> => {
  const response = await authFetch(`${API_URL}/users?query=${encodeURIComponent(query)}`, {
    method: 'GET',

  });

  if (!response.ok) {
    return [];
  }

  return response.json();
};

// Get all users
export const getAllUsers = async (): Promise<Array<{ id: string; name?: string; email?: string }>> => {
  const response = await authFetch(`${API_URL}/users`, {
    method: 'GET',

  });

  if (!response.ok) {
    return [];
  }

  return response.json();
};

// Create scheduled meeting (saves to scheduled_meetings table, not meetings table)
export const createScheduledMeeting = async (scheduledMeetingData: any): Promise<any> => {
  const response = await authFetch(`${API_URL}/scheduled-meetings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },

    body: JSON.stringify(scheduledMeetingData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create scheduled meeting');
  }

  return response.json();
};

export const getScheduledMeetings = async (startDate?: string, endDate?: string, includeUsed?: boolean): Promise<any[]> => {
  let url = `${API_URL}/scheduled-meetings`;
  const params: string[] = [];
  if (startDate && endDate) {
    params.push(`startDate=${encodeURIComponent(startDate)}`);
    params.push(`endDate=${encodeURIComponent(endDate)}`);
  }
  if (includeUsed) {
    params.push(`includeUsed=true`);
  }
  if (params.length > 0) url += `?${params.join('&')}`;
  const response = await authFetch(url, { method: 'GET' });
  if (!response.ok) {
    const text = await response.text().catch(() => null);
    let message = 'Failed to fetch scheduled meetings';
    try {
      const json = text ? JSON.parse(text) : null;
      message = json?.message || message;
    } catch (e) {
      if (text) message = text;
    }
    throw new Error(message);
  }
  return response.json();
};

// Get a single scheduled meeting by id
export const getScheduledMeeting = async (id: string): Promise<any> => {
  const response = await authFetch(`${API_URL}/scheduled-meetings/${encodeURIComponent(id)}`, { method: 'GET' });
  if (!response.ok) {
    const text = await response.text().catch(() => null);
    let message = 'Failed to fetch scheduled meeting';
    try {
      const json = text ? JSON.parse(text) : null;
      message = json?.message || message;
    } catch (e) {
      if (text) message = text;
    }
    throw new Error(message);
  }
  return response.json();
};

// Update a scheduled meeting
export const updateScheduledMeeting = async (id: string, data: any): Promise<any> => {
  const response = await authFetch(`${API_URL}/scheduled-meetings/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },

    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to update scheduled meeting');
  }
  return response.json();
};

// Delete a scheduled meeting
export const deleteScheduledMeeting = async (id: string): Promise<void> => {
  const response = await authFetch(`${API_URL}/scheduled-meetings/${encodeURIComponent(id)}`, {
    method: 'DELETE',

  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to delete scheduled meeting');
  }
};

// Tasks APIs
export type Task = {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dueDate?: string; // YYYY-MM-DD
  completed: boolean;
  status?: 'todo' | 'inprogress' | 'done';
  createdAt: string;
  updatedAt: string;
};

export const getTasks = async (): Promise<Task[]> => {
  const response = await authFetch(`${API_URL}/tasks`, { method: 'GET' });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to fetch tasks');
  }
  return response.json();
};

export const createTask = async (data: { title: string; description?: string; dueDate?: string; }): Promise<Task> => {
  const response = await authFetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },

    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to create task');
  }
  return response.json();
};

export const createTaskForUser = async (userId: string, data: { title: string; description?: string; dueDate?: string; }): Promise<Task> => {
  const response = await authFetch(`${API_URL}/tasks/for-user/${encodeURIComponent(userId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },

    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to create task for user');
  }
  return response.json();
};

export const getBoardsForUser = async (userId: string) => {
  const response = await authFetch(`${API_URL}/boards/for-user/${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },

  });
  if (!response.ok) throw new Error('Failed to get boards for user');
  return response.json();
};

export const createBoardForUser = async (userId: string, data: { title: string }) => {
  const response = await authFetch(`${API_URL}/boards/for-user/${encodeURIComponent(userId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },

    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create board for user');
  return response.json();
};

export const getListsApiSystem = async (boardId: string) => {
  const response = await authFetch(`${API_URL}/boards/system/${encodeURIComponent(boardId)}/lists`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },

  });
  if (!response.ok) throw new Error('Failed to get lists');
  return response.json();
};

export const createListApiSystem = async (boardId: string, data: { title: string }) => {
  const response = await authFetch(`${API_URL}/boards/system/${encodeURIComponent(boardId)}/lists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },

    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create list');
  return response.json();
};

export const createCardApiSystem = async (listId: string, data: { title: string; description?: string; dueDate?: string; assignee?: string; notifySelf?: boolean }) => {
  const response = await authFetch(`${API_URL}/boards/system/lists/${encodeURIComponent(listId)}/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },

    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create card');
  return response.json();
};

export const updateCardApiSystem = async (cardId: string, data: Partial<{ title: string; description?: string; dueDate?: string; assignee?: string; notifySelf?: boolean }>) => {
  const response = await authFetch(`${API_URL}/boards/system/cards/${encodeURIComponent(cardId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },

    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update card');
  return response.json();
};

export const deleteCardApiSystem = async (cardId: string) => {
  const response = await authFetch(`${API_URL}/boards/system/cards/${encodeURIComponent(cardId)}`, {
    method: 'DELETE',

  });
  if (!response.ok) throw new Error('Failed to delete card');
  return response.json();
};

export const getNotifications = async () => {
  const response = await authFetch(`${API_URL}/notifications`, {
    method: 'GET',

  });
  if (!response.ok) throw new Error('Failed to fetch notifications');
  return response.json();
};

export const markNotificationRead = async (id: string) => {
  const response = await authFetch(`${API_URL}/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PUT',

  });
  if (!response.ok) throw new Error('Failed to mark notification read');
  return response.json();
};

export const updateTask = async (id: string, data: Partial<{ title: string; description?: string; dueDate?: string; completed: boolean; status?: 'todo' | 'inprogress' | 'done' }>): Promise<Task> => {
  const response = await authFetch(`${API_URL}/tasks/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },

    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to update task');
  }
  return response.json();
};

export const deleteTask = async (id: string): Promise<void> => {
  const response = await authFetch(`${API_URL}/tasks/${encodeURIComponent(id)}`, {
    method: 'DELETE',

  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to delete task');
  }
};

// Boards API
export const createBoardApi = async (data: { title: string }) => {
  const res = await authFetch(`${API_URL}/boards`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to create board');
  return res.json();
};

export const getBoardsApi = async () => {
  const res = await authFetch(`${API_URL}/boards`, { method: 'GET' });
  if (!res.ok) throw new Error('Failed to fetch boards');
  return res.json();
};

export const getListsApi = async (boardId: string) => {
  const res = await authFetch(`${API_URL}/boards/${encodeURIComponent(boardId)}/lists`, { method: 'GET' });
  if (!res.ok) throw new Error('Failed to fetch lists');
  return res.json();
};

export const createListApi = async (boardId: string, data: { title: string }) => {
  const res = await authFetch(`${API_URL}/boards/${encodeURIComponent(boardId)}/lists`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to create list');
  return res.json();
};

export const createCardApi = async (listId: string, data: { title: string; description?: string; dueDate?: string }) => {
  const res = await authFetch(`${API_URL}/boards/lists/${encodeURIComponent(listId)}/cards`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to create card');
  return res.json();
};

export const getCardsApi = async (listId: string) => {
  const res = await authFetch(`${API_URL}/boards/lists/${encodeURIComponent(listId)}/cards`, { method: 'GET' });
  if (!res.ok) throw new Error('Failed to fetch cards');
  return res.json();
};

export const getAllCardsApi = async () => {
  const res = await authFetch(`${API_URL}/boards/cards/all`, { method: 'GET' });
  if (!res.ok) throw new Error('Failed to fetch all cards');
  return res.json();
};

export const getAssignedToMeCardsApi = async () => {
  const res = await authFetch(`${API_URL}/boards/cards/assigned-to-me`, { method: 'GET' });
  if (!res.ok) throw new Error('Failed to fetch assigned cards');
  return res.json();
};

export const getAllCardsForReportsApi = async (cardIds?: string[]) => {
  const url = cardIds && cardIds.length > 0
    ? `${API_URL}/boards/cards/all-for-reports?cardIds=${cardIds.join(',')}`
    : `${API_URL}/boards/cards/all-for-reports`;
  const res = await authFetch(url, { method: 'GET' });
  if (!res.ok) throw new Error('Failed to fetch cards for reports');
  return res.json();
};


export const getCardApi = async (cardId: string) => {
  const res = await authFetch(`${API_URL}/boards/cards/${encodeURIComponent(cardId)}`, { method: 'GET' });
  if (!res.ok) throw new Error('Failed to fetch card');
  return res.json();
};

export const updateCardApi = async (cardId: string, data: Partial<{ title: string; description?: string; dueDate?: string; checklist?: any; priority?: string; labels?: string[]; assignee?: string; coverColor?: string; archived?: boolean }>) => {
  const res = await authFetch(`${API_URL}/boards/cards/${encodeURIComponent(cardId)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to update card');
  return res.json();
};

export const moveCardApi = async (cardId: string, toListId: string, toOrder: number) => {
  const res = await authFetch(`${API_URL}/boards/cards/${encodeURIComponent(cardId)}/move`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toListId, toOrder }) });
  if (!res.ok) throw new Error('Failed to move card');
  return res.json();
};

export const addCommentApi = async (cardId: string, text: string) => {
  const res = await authFetch(`${API_URL}/boards/cards/${encodeURIComponent(cardId)}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
  if (!res.ok) throw new Error('Failed to add comment');
  return res.json();
};

export const getCommentsApi = async (cardId: string) => {
  const res = await authFetch(`${API_URL}/boards/cards/${encodeURIComponent(cardId)}/comments`, { method: 'GET' });
  if (!res.ok) throw new Error('Failed to fetch comments');
  return res.json();
};

export const deleteCardApi = async (cardId: string) => {
  const res = await authFetch(`${API_URL}/boards/cards/${encodeURIComponent(cardId)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete card');
  return res.json();
};

export const archiveCardApi = async (cardId: string) => {
  const res = await authFetch(`${API_URL}/boards/cards/${encodeURIComponent(cardId)}/archive`, { method: 'PUT' });
  if (!res.ok) throw new Error('Failed to archive card');
  return res.json();
};

export const deleteListApi = async (listId: string) => {
  const res = await authFetch(`${API_URL}/boards/lists/${encodeURIComponent(listId)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete list');
  return res.json();
};

export const updateListApi = async (listId: string, data: any) => {
  const res = await authFetch(`${API_URL}/boards/lists/${encodeURIComponent(listId)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to update list');
  return res.json();
};

export const duplicateCardApi = async (cardId: string) => {
  const res = await authFetch(`${API_URL}/boards/cards/${encodeURIComponent(cardId)}/duplicate`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to duplicate card');
  return res.json();
};

export const updateBoardApi = async (boardId: string, data: Partial<{ title: string }>) => {
  const res = await authFetch(`${API_URL}/boards/${encodeURIComponent(boardId)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to update board');
  return res.json();
};

export const getDailyWorkWarnings = async (): Promise<any[]> => {
  const res = await authFetch(`${API_URL}/boards/daily-work/warnings`, { method: 'GET' });
  if (!res.ok) throw new Error('Failed to fetch daily work warnings');
  return res.json();
};

export const isYesterdayWorkLogMissing = async (): Promise<{ missing: boolean; date: string }> => {
  const res = await authFetch(`${API_URL}/work-logs/missing/yesterday`, { method: 'GET' });
  if (!res.ok) throw new Error('Failed to check missing work log');
  return res.json();
};

export const deleteBoardApi = async (boardId: string) => {
  const res = await authFetch(`${API_URL}/boards/${encodeURIComponent(boardId)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete board');
  return res.json();
};

// User Settings API
const readApiError = async (res: Response, fallback: string) => {
  const error = await res.json().catch(() => ({}));
  return new Error(error.message || fallback);
};

export const updateUserProfile = async (data: { name?: string; email?: string }) => {
  const res = await authFetch(`${API_URL}/users/profile`, {
    method: 'PUT',

    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update profile');
  }
  return res.json();
};

export const requestProfilePasswordOtp = async (): Promise<{ message: string; email: string }> => {
  const res = await authFetch(`${API_URL}/users/change-password/request-otp`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw await readApiError(res, 'Failed to send verification code');
  }
  return res.json();
};

export const verifyProfilePasswordOtp = async (otp: string): Promise<{ message: string; token: string }> => {
  const res = await authFetch(`${API_URL}/users/change-password/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ otp }),
  });
  if (!res.ok) {
    throw await readApiError(res, 'Failed to verify code');
  }
  return res.json();
};

export const changeUserPassword = async (data: { token: string; newPassword: string }) => {
  const res = await authFetch(`${API_URL}/users/change-password`, {
    method: 'POST',

    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw await readApiError(res, 'Failed to change password');
  }
  return res.json();
};

export const requestForgotPasswordOtp = async (email: string): Promise<{ message: string; email: string }> => {
  const res = await fetch(`${API_URL}/auth/forgot-password/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    throw await readApiError(res, 'Failed to send verification code');
  }
  return res.json();
};

export const verifyForgotPasswordOtp = async (email: string, otp: string): Promise<{ message: string; token: string }> => {
  const res = await fetch(`${API_URL}/auth/forgot-password/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ email, otp }),
  });
  if (!res.ok) {
    throw await readApiError(res, 'Failed to verify code');
  }
  return res.json();
};

export const resetForgotPassword = async (data: { token: string; newPassword: string }) => {
  const res = await fetch(`${API_URL}/auth/forgot-password/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw await readApiError(res, 'Failed to reset password');
  }
  return res.json();
};
// Work Logs API
export const getWorkLogApi = async (date: string) => {
  const res = await authFetch(`${API_URL}/work-logs/${date}`, { method: 'GET' });
  if (!res.ok) {
    const text = await res.text().catch(() => null);
    let msg = 'Failed to fetch work log';
    try { if (text) msg = JSON.parse(text).message || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  // Some endpoints may return an empty body (204 or empty string). Safely handle that.
  const text = await res.text().catch(() => null);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export const saveWorkLogApi = async (data: {
  date: string;
  todayWork: string;
  tomorrowWork: string;
  todayOnLeave?: boolean;
  todayHoliday?: boolean;
  tomorrowOnLeave?: boolean;
  tomorrowHoliday?: boolean;
}) => {
  const res = await authFetch(`${API_URL}/work-logs`, {
    method: 'POST',

    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save work log');
  return res.json();
};

// ─── Super Admin APIs ─────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  allowedPages?: string[] | null;
  adminTabs?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export const adminGetUsers = async (): Promise<AdminUser[]> => {
  const res = await authFetch(`${API_URL}/users/admin/list`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch users');
  }
  return res.json();
};

export const adminCreateUser = async (data: {
  email: string;
  password: string;
  name?: string;
  role?: string;
  allowedPages?: string[] | null;
  adminTabs?: string[] | null;
}): Promise<AdminUser> => {
  const res = await authFetch(`${API_URL}/users/admin/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create user');
  }
  return res.json();
};

export const adminUpdateUser = async (
  id: string,
  data: { name?: string; email?: string; role?: string; allowedPages?: string[] | null; adminTabs?: string[] | null },
): Promise<AdminUser> => {
  const res = await authFetch(`${API_URL}/users/admin/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update user');
  }
  return res.json();
};

export const adminDeleteUser = async (id: string): Promise<void> => {
  const res = await authFetch(`${API_URL}/users/admin/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete user');
  }
};

// ─── Admin Center APIs ──────────────────────────────────────────────────────

const adminJson = async (path: string, options: RequestInit = {}) => {
  const res = await authFetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Request failed');
  }
  return res.json();
};

export interface AdminAnalyticsOverview {
  totalUsers: number;
  superAdmins: number;
  totalMeetings: number;
  totalCards: number;
  activeCards: number;
  archivedCards: number;
  totalTasks: number;
  totalWorkLogs: number;
  activeUsers7d: number;
  activeUsers30d: number;
}

export interface AdminTrendPoint {
  day: string;
  signups: number;
  meetings: number;
  cards: number;
}

export interface AdminActiveUser {
  userId: string;
  userEmail?: string;
  actionCount: number;
}

export const getAdminAnalyticsOverview = (): Promise<AdminAnalyticsOverview> => adminJson('/admin/analytics/overview');
export const getAdminAnalyticsTrends = (days = 30): Promise<AdminTrendPoint[]> => adminJson(`/admin/analytics/trends?days=${days}`);
export const getAdminTopUsers = (limit = 10): Promise<AdminActiveUser[]> => adminJson(`/admin/analytics/top-users?limit=${limit}`);

export interface AdminBreakdowns {
  meetingTypes: { label: string; count: number }[];
  taskPriorities: { label: string; count: number }[];
}

export const getAdminBreakdowns = (): Promise<AdminBreakdowns> => adminJson('/admin/analytics/breakdowns');

export interface AdminUserSummary {
  id: string;
  name?: string;
  email: string;
  role: string;
  createdAt: string;
  meetingsCount: number;
  tasksCount: number;
  tasksCompleted: number;
  cardsCount: number;
  workLogsCount: number;
  lastActive: string | null;
  timeliness: { early: number; onTime: number; late: number };
  workLogCompliance: { workingDays: number; loggedDays: number; missedDays: number; rate: number };
}

export const getAdminUsersOverview = (): Promise<AdminUserSummary[]> => adminJson('/admin/analytics/users');

export interface AdminUserDetail {
  user: { id: string; name?: string; email: string; role: string; timezone?: string; createdAt: string };
  meetings: {
    total: number;
    byType: { label: string; count: number }[];
    recent: { id: string; date: string; meetingType: string; center?: string; place?: string; day?: string }[];
  };
  tasks: {
    total: number;
    completed: number;
    overdue: number;
    byStatus: { label: string; count: number }[];
    timeliness: { early: number; onTime: number; late: number };
    recent: { id: string; title: string; status: string; completed: boolean; dueDate?: string; createdAt: string; timeliness: 'early' | 'onTime' | 'late' | null }[];
  };
  cards: {
    total: number;
    active: number;
    archived: number;
    overdue: number;
    byPriority: { label: string; count: number }[];
    timeliness: { early: number; onTime: number; late: number };
    recent: { id: string; title: string; priority?: string; archived: boolean; dueDate?: string; timeliness: 'early' | 'onTime' | 'late' | null }[];
  };
  workLogs: {
    total: number;
    onLeave: number;
    holiday: number;
    compliance: { workingDays: number; loggedDays: number; missedDays: number; rate: number; missedRecentDates: string[] };
    recent: { date: string; todayWork?: string; todayOnLeave: boolean; todayHoliday: boolean; tomorrowWork?: string; tomorrowOnLeave: boolean; tomorrowHoliday: boolean }[];
  };
  activity: {
    total: number;
    last7d: number;
    last30d: number;
    recent: { method: string; path: string; statusCode?: number; createdAt: string }[];
  };
}

export const getAdminUserDetail = (id: string): Promise<AdminUserDetail> => adminJson(`/admin/analytics/users/${id}`);

export interface ActivityLogEntry {
  id: string;
  userId?: string;
  userEmail?: string;
  method: string;
  path: string;
  statusCode?: number;
  durationMs?: number;
  ip?: string;
  createdAt: string;
}

export const getActivityLog = (limit = 200): Promise<ActivityLogEntry[]> => adminJson(`/admin/activity?limit=${limit}`);

export interface ErrorLogEntry {
  id: string;
  source: 'backend' | 'frontend';
  message: string;
  stack?: string;
  path?: string;
  userId?: string;
  userEmail?: string;
  statusCode?: number;
  status: 'open' | 'in_progress' | 'resolved';
  meta?: any;
  createdAt: string;
  resolvedAt?: string;
}

export const getErrorLogs = (filters: { source?: string; status?: string } = {}): Promise<ErrorLogEntry[]> => {
  const params = new URLSearchParams();
  if (filters.source) params.set('source', filters.source);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  return adminJson(`/admin/errors${qs ? `?${qs}` : ''}`);
};

export const getErrorLogCounts = (): Promise<{ open: number; inProgress: number; resolved: number; total: number }> =>
  adminJson('/admin/errors/counts');

export const updateErrorLogStatus = (id: string, status: 'open' | 'in_progress' | 'resolved'): Promise<ErrorLogEntry> =>
  adminJson(`/admin/errors/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });

export const reportClientError = async (payload: { message: string; stack?: string; path?: string; source?: 'frontend'; meta?: any }): Promise<void> => {
  try {
    await fetch(`${API_URL}/admin/errors/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // best-effort — never let error reporting itself throw
  }
};

export interface AppSettingsData {
  id: string;
  siteName: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  updatedAt: string;
}

export const getAppSettings = (): Promise<AppSettingsData> =>
  fetch(`${API_URL}/admin/settings`).then((res) => res.json());

export const updateAppSettings = (data: Partial<Pick<AppSettingsData, 'siteName' | 'logoUrl' | 'faviconUrl' | 'primaryColor'>>): Promise<AppSettingsData> =>
  adminJson('/admin/settings', { method: 'PUT', body: JSON.stringify(data) });

export interface SiteConfigDraft { draft: Record<string, any>; published: Record<string, any>; publishedAt: string | null; dirty: boolean }
export const getSiteConfig = (): Promise<Record<string, any>> =>
  fetch(`${API_URL}/admin/site-config`).then((res) => (res.ok ? res.json() : {}));
export const adminGetSiteDraft = (): Promise<SiteConfigDraft> => adminJson('/admin/site-config/draft');
export const adminSaveSiteDraft = (config: Record<string, any>): Promise<SiteConfigDraft> =>
  adminJson('/admin/site-config/draft', { method: 'PUT', body: JSON.stringify({ config }) });
export const adminPublishSite = (): Promise<SiteConfigDraft> => adminJson('/admin/site-config/publish', { method: 'POST' });
export const adminDiscardSiteDraft = (): Promise<SiteConfigDraft> => adminJson('/admin/site-config/discard', { method: 'POST' });

export interface BackupRecordEntry {
  id: string;
  filename: string;
  sizeBytes: string;
  status: 'success' | 'failed';
  error?: string;
  emailed: boolean;
  manual: boolean;
  tableCounts?: Record<string, number>;
  createdAt: string;
  fileExists: boolean;
}

export const getBackups = (): Promise<BackupRecordEntry[]> => adminJson('/admin/backups');
export const runBackupNow = (): Promise<BackupRecordEntry> => adminJson('/admin/backups/run', { method: 'POST' });

// Downloads require the auth header (Bearer token for cross-domain sessions),
// so this fetches the file via authFetch and triggers the save as a Blob
// rather than exposing a plain <a href> URL that wouldn't carry auth.
export const downloadBackup = async (id: string, filename: string): Promise<void> => {
  const res = await authFetch(`${API_URL}/admin/backups/${id}/download`);
  if (!res.ok) throw new Error('Failed to download backup');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'backup.json';
  a.click();
  window.URL.revokeObjectURL(url);
};

export interface SystemHealth {
  db: { ok: boolean; latencyMs: number };
  mail: { configured: boolean };
  uptimeSeconds: number;
  memory: { rssMb: number; heapUsedMb: number };
  nodeVersion: string;
  backupSchedule: string;
}

export const getSystemHealth = (): Promise<SystemHealth> => adminJson('/admin/system/health');

export interface BroadcastEntry {
  id: string;
  title: string;
  body?: string;
  audience: 'all' | 'user' | 'super_admin';
  recipientCount: number;
  sentByEmail?: string;
  createdAt: string;
}

export const getBroadcastHistory = (): Promise<BroadcastEntry[]> => adminJson('/admin/broadcasts');
export const sendBroadcast = (data: { title: string; body?: string; audience: 'all' | 'user' | 'super_admin' }): Promise<BroadcastEntry> =>
  adminJson('/admin/broadcasts', { method: 'POST', body: JSON.stringify(data) });

// ─── Centers (managed list, used app-wide) ─────────────────────────────────

export interface CenterEntry {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

// Public: any authenticated user can read the active list (meeting forms, etc).
export const getCenters = (): Promise<CenterEntry[]> => adminJson('/centers');

export const getAllCentersAdmin = (): Promise<CenterEntry[]> => adminJson('/admin/centers');
export const createCenter = (name: string): Promise<CenterEntry> => adminJson('/admin/centers', { method: 'POST', body: JSON.stringify({ name }) });
export const updateCenter = (id: string, patch: { name?: string; isActive?: boolean }): Promise<CenterEntry> =>
  adminJson(`/admin/centers/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
export const deleteCenter = (id: string): Promise<void> => adminJson(`/admin/centers/${id}`, { method: 'DELETE' });

// ─── Roles (managed list, used app-wide) ───────────────────────────────────

export interface RoleEntry {
  id: string;
  key: string;
  label: string;
  description?: string;
  isSystem: boolean;
  createdAt: string;
}

// Public: any authenticated user can read role labels (e.g. Users page dropdown).
export const getRoles = (): Promise<RoleEntry[]> => adminJson('/roles');

export const createRole = (data: { key: string; label: string; description?: string }): Promise<RoleEntry> =>
  adminJson('/admin/roles', { method: 'POST', body: JSON.stringify(data) });
export const updateRole = (id: string, patch: { label?: string; description?: string }): Promise<RoleEntry> =>
  adminJson(`/admin/roles/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
export const deleteRole = (id: string): Promise<void> => adminJson(`/admin/roles/${id}`, { method: 'DELETE' });

// ─── Database Schema Manager ────────────────────────────────────────────────

export interface SchemaTableSummary {
  name: string;
  approxRows: number;
  isCustom: boolean;
  isProtected: boolean;
}

export interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  default?: string | null;
}

export interface NewColumnInput {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
}

export const getSchemaTables = (): Promise<SchemaTableSummary[]> => adminJson('/admin/schema/tables');
export const getSchemaColumns = (table: string): Promise<SchemaColumn[]> => adminJson(`/admin/schema/tables/${table}/columns`);
export const createSchemaTable = (name: string, columns: NewColumnInput[]): Promise<any> =>
  adminJson('/admin/schema/tables', { method: 'POST', body: JSON.stringify({ name, columns }) });
export const dropSchemaTable = (table: string): Promise<void> => adminJson(`/admin/schema/tables/${table}`, { method: 'DELETE' });
export const addSchemaColumn = (table: string, col: NewColumnInput): Promise<SchemaColumn[]> =>
  adminJson(`/admin/schema/tables/${table}/columns`, { method: 'POST', body: JSON.stringify(col) });
export const dropSchemaColumn = (table: string, column: string): Promise<SchemaColumn[]> =>
  adminJson(`/admin/schema/tables/${table}/columns/${column}`, { method: 'DELETE' });

export const getSchemaRows = (table: string, limit = 100): Promise<{ columns: SchemaColumn[]; rows: any[] }> =>
  adminJson(`/admin/schema/tables/${table}/rows?limit=${limit}`);
export const createSchemaRow = (table: string, data: Record<string, any>): Promise<any> =>
  adminJson(`/admin/schema/tables/${table}/rows`, { method: 'POST', body: JSON.stringify(data) });
export const updateSchemaRow = (table: string, id: string, data: Record<string, any>): Promise<any> =>
  adminJson(`/admin/schema/tables/${table}/rows/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteSchemaRow = (table: string, id: string): Promise<void> =>
  adminJson(`/admin/schema/tables/${table}/rows/${id}`, { method: 'DELETE' });
