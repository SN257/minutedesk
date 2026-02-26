const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '/api');

interface LoginCredentials {
  email: string;
  password: string;
}

interface User {
  id: string;
  email: string;
  name?: string;
}

// Login function
export const login = async (credentials: LoginCredentials): Promise<User> => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important for session cookies
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Login failed');
  }

  const data = await response.json();
  return data.user;
};

// Check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      return false;
    }

    const user = await response.json();
    // User is authenticated if endpoint returns a user object (not null)
    return user !== null && user !== undefined;
  } catch {
    return false;
  }
};

// Create meeting
export const createMeeting = async (meetingData: any): Promise<any> => {
  const response = await fetch(`${API_URL}/meetings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
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
  const response = await fetch(`${API_URL}/meetings/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
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
    const response = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
};

// Logout function
export const logout = async (): Promise<void> => {
  await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
};

// Get all meetings
export const getMeetings = async (): Promise<any[]> => {
  const response = await fetch(`${API_URL}/meetings`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch meetings');
  }

  return response.json();
};

// Get single meeting by id
export const getMeeting = async (id: string): Promise<any> => {
  const response = await fetch(`${API_URL}/meetings/${id}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to fetch meeting');
  }

  return response.json();
};

// Delete a meeting by id
export const deleteMeeting = async (id: string): Promise<void> => {
  const response = await fetch(`${API_URL}/meetings/${id}`, {
    method: 'DELETE',
    credentials: 'include',
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
  const response = await fetch(`${API_URL}/users?query=${encodeURIComponent(query)}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    return [];
  }

  return response.json();
};

// Get all users
export const getAllUsers = async (): Promise<Array<{ id: string; name?: string; email?: string }>> => {
  const response = await fetch(`${API_URL}/users`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    return [];
  }

  return response.json();
};

// Create scheduled meeting (saves to scheduled_meetings table, not meetings table)
export const createScheduledMeeting = async (scheduledMeetingData: any): Promise<any> => {
  const response = await fetch(`${API_URL}/scheduled-meetings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
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
  const response = await fetch(url, { method: 'GET', credentials: 'include' });
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
  const response = await fetch(`${API_URL}/scheduled-meetings/${encodeURIComponent(id)}`, { method: 'GET', credentials: 'include' });
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
  const response = await fetch(`${API_URL}/scheduled-meetings/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
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
  const response = await fetch(`${API_URL}/scheduled-meetings/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
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
  const response = await fetch(`${API_URL}/tasks`, { method: 'GET', credentials: 'include' });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to fetch tasks');
  }
  return response.json();
};

export const createTask = async (data: { title: string; description?: string; dueDate?: string; }): Promise<Task> => {
  const response = await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to create task');
  }
  return response.json();
};

export const createTaskForUser = async (userId: string, data: { title: string; description?: string; dueDate?: string; }): Promise<Task> => {
  const response = await fetch(`${API_URL}/tasks/for-user/${encodeURIComponent(userId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to create task for user');
  }
  return response.json();
};

export const getBoardsForUser = async (userId: string) => {
  const response = await fetch(`${API_URL}/boards/for-user/${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to get boards for user');
  return response.json();
};

export const createBoardForUser = async (userId: string, data: { title: string }) => {
  const response = await fetch(`${API_URL}/boards/for-user/${encodeURIComponent(userId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create board for user');
  return response.json();
};

export const getListsApiSystem = async (boardId: string) => {
  const response = await fetch(`${API_URL}/boards/system/${encodeURIComponent(boardId)}/lists`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to get lists');
  return response.json();
};

export const createListApiSystem = async (boardId: string, data: { title: string }) => {
  const response = await fetch(`${API_URL}/boards/system/${encodeURIComponent(boardId)}/lists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create list');
  return response.json();
};

export const createCardApiSystem = async (listId: string, data: { title: string; description?: string; dueDate?: string; assignee?: string; notifySelf?: boolean }) => {
  const response = await fetch(`${API_URL}/boards/system/lists/${encodeURIComponent(listId)}/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create card');
  return response.json();
};

export const updateCardApiSystem = async (cardId: string, data: Partial<{ title: string; description?: string; dueDate?: string; assignee?: string; notifySelf?: boolean }>) => {
  const response = await fetch(`${API_URL}/boards/system/cards/${encodeURIComponent(cardId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update card');
  return response.json();
};

export const deleteCardApiSystem = async (cardId: string) => {
  const response = await fetch(`${API_URL}/boards/system/cards/${encodeURIComponent(cardId)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to delete card');
  return response.json();
};

export const getNotifications = async () => {
  const response = await fetch(`${API_URL}/notifications`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch notifications');
  return response.json();
};

export const markNotificationRead = async (id: string) => {
  const response = await fetch(`${API_URL}/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PUT',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to mark notification read');
  return response.json();
};

export const updateTask = async (id: string, data: Partial<{ title: string; description?: string; dueDate?: string; completed: boolean; status?: 'todo' | 'inprogress' | 'done' }>): Promise<Task> => {
  const response = await fetch(`${API_URL}/tasks/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to update task');
  }
  return response.json();
};

export const deleteTask = async (id: string): Promise<void> => {
  const response = await fetch(`${API_URL}/tasks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to delete task');
  }
};

// Boards API
export const createBoardApi = async (data: { title: string }) => {
  const res = await fetch(`${API_URL}/boards`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to create board');
  return res.json();
};

export const getBoardsApi = async () => {
  const res = await fetch(`${API_URL}/boards`, { method: 'GET', credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch boards');
  return res.json();
};

export const getListsApi = async (boardId: string) => {
  const res = await fetch(`${API_URL}/boards/${encodeURIComponent(boardId)}/lists`, { method: 'GET', credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch lists');
  return res.json();
};

export const createListApi = async (boardId: string, data: { title: string }) => {
  const res = await fetch(`${API_URL}/boards/${encodeURIComponent(boardId)}/lists`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to create list');
  return res.json();
};

export const createCardApi = async (listId: string, data: { title: string; description?: string; dueDate?: string }) => {
  const res = await fetch(`${API_URL}/boards/lists/${encodeURIComponent(listId)}/cards`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to create card');
  return res.json();
};

export const getCardsApi = async (listId: string) => {
  const res = await fetch(`${API_URL}/boards/lists/${encodeURIComponent(listId)}/cards`, { method: 'GET', credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch cards');
  return res.json();
};

export const getAllCardsApi = async () => {
  const res = await fetch(`${API_URL}/boards/cards/all`, { method: 'GET', credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch all cards');
  return res.json();
};

export const getAllCardsForReportsApi = async (cardIds?: string[]) => {
  const url = cardIds && cardIds.length > 0
    ? `${API_URL}/boards/cards/all-for-reports?cardIds=${cardIds.join(',')}`
    : `${API_URL}/boards/cards/all-for-reports`;
  const res = await fetch(url, { method: 'GET', credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch cards for reports');
  return res.json();
};


export const getCardApi = async (cardId: string) => {
  const res = await fetch(`${API_URL}/boards/cards/${encodeURIComponent(cardId)}`, { method: 'GET', credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch card');
  return res.json();
};

export const updateCardApi = async (cardId: string, data: Partial<{ title: string; description?: string; dueDate?: string; checklist?: any; priority?: string; labels?: string[]; assignee?: string; coverColor?: string; archived?: boolean }>) => {
  const res = await fetch(`${API_URL}/boards/cards/${encodeURIComponent(cardId)}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to update card');
  return res.json();
};

export const moveCardApi = async (cardId: string, toListId: string, toOrder: number) => {
  const res = await fetch(`${API_URL}/boards/cards/${encodeURIComponent(cardId)}/move`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toListId, toOrder }) });
  if (!res.ok) throw new Error('Failed to move card');
  return res.json();
};

export const addCommentApi = async (cardId: string, text: string) => {
  const res = await fetch(`${API_URL}/boards/cards/${encodeURIComponent(cardId)}/comments`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
  if (!res.ok) throw new Error('Failed to add comment');
  return res.json();
};

export const getCommentsApi = async (cardId: string) => {
  const res = await fetch(`${API_URL}/boards/cards/${encodeURIComponent(cardId)}/comments`, { method: 'GET', credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch comments');
  return res.json();
};

export const deleteCardApi = async (cardId: string) => {
  const res = await fetch(`${API_URL}/boards/cards/${encodeURIComponent(cardId)}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) throw new Error('Failed to delete card');
  return res.json();
};

export const archiveCardApi = async (cardId: string) => {
  const res = await fetch(`${API_URL}/boards/cards/${encodeURIComponent(cardId)}/archive`, { method: 'PUT', credentials: 'include' });
  if (!res.ok) throw new Error('Failed to archive card');
  return res.json();
};

export const deleteListApi = async (listId: string) => {
  const res = await fetch(`${API_URL}/boards/lists/${encodeURIComponent(listId)}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) throw new Error('Failed to delete list');
  return res.json();
};

export const duplicateCardApi = async (cardId: string) => {
  const res = await fetch(`${API_URL}/boards/cards/${encodeURIComponent(cardId)}/duplicate`, { method: 'POST', credentials: 'include' });
  if (!res.ok) throw new Error('Failed to duplicate card');
  return res.json();
};

export const updateBoardApi = async (boardId: string, data: Partial<{ title: string }>) => {
  const res = await fetch(`${API_URL}/boards/${encodeURIComponent(boardId)}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to update board');
  return res.json();
};

export const getDailyWorkWarnings = async (): Promise<any[]> => {
  const res = await fetch(`${API_URL}/boards/daily-work/warnings`, { method: 'GET', credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch daily work warnings');
  return res.json();
};

export const isYesterdayWorkLogMissing = async (): Promise<{ missing: boolean; date: string }> => {
  const res = await fetch(`${API_URL}/work-logs/missing/yesterday`, { method: 'GET', credentials: 'include' });
  if (!res.ok) throw new Error('Failed to check missing work log');
  return res.json();
};

export const deleteBoardApi = async (boardId: string) => {
  const res = await fetch(`${API_URL}/boards/${encodeURIComponent(boardId)}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) throw new Error('Failed to delete board');
  return res.json();
};

// User Settings API
export const updateUserProfile = async (data: { name?: string; email?: string }) => {
  const res = await fetch(`${API_URL}/users/profile`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update profile');
  }
  return res.json();
};

export const changeUserPassword = async (data: { currentPassword: string; newPassword: string }) => {
  const res = await fetch(`${API_URL}/users/change-password`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to change password');
  }
  return res.json();
};
// Work Logs API
export const getWorkLogApi = async (date: string) => {
  const res = await fetch(`${API_URL}/work-logs/${date}`, { method: 'GET', credentials: 'include' });
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
  const res = await fetch(`${API_URL}/work-logs`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save work log');
  return res.json();
};
