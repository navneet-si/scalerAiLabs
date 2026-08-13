import {
  ActionItemCreate,
  ActionItemRead,
  ActionItemUpdate,
  MeetingCreate,
  MeetingDetail,
  MeetingListItem,
  MeetingUpdate,
  Page,
  ParticipantRead,
  TagRead,
  TranscriptRead,
  QueryResponse,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

class ApiError extends Error {
  constructor(public status: number, public data: any) {
    super(`API Error: ${status}`);
    this.name = "ApiError";
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = { ...options.headers };

  if (!(options.body instanceof FormData)) {
    // @ts-ignore
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, { ...options, headers });
  
  if (res.status === 204) {
    return null as T;
  }
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(res.status, errorData);
  }
  
  return res.json();
}

export const api = {
  health: () => request<{ status: string }>("/health"),
  
  getMeetings: (params: Record<string, string | number | undefined | null> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        query.append(k, String(v));
      }
    });
    const qs = query.toString();
    return request<Page<MeetingListItem>>(`/meetings${qs ? `?${qs}` : ""}`);
  },
  
  getMeeting: (id: number) => request<MeetingDetail>(`/meetings/${id}`),
  
  getTranscript: (id: number) => request<TranscriptRead>(`/meetings/${id}/transcript`),
  
  createMeeting: (data: MeetingCreate) => request<MeetingDetail>("/meetings", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  
  uploadMeeting: (formData: FormData) => request<MeetingDetail>("/meetings/upload", {
    method: "POST",
    body: formData,
  }),
  
  updateMeeting: (id: number, data: MeetingUpdate) => request<MeetingDetail>(`/meetings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }),
  
  deleteMeeting: (id: number) => request<void>(`/meetings/${id}`, { method: "DELETE" }),
  
  createActionItem: (meetingId: number, data: ActionItemCreate) => request<ActionItemRead>(`/meetings/${meetingId}/action-items`, {
    method: "POST",
    body: JSON.stringify(data),
  }),
  
  updateActionItem: (id: number, data: ActionItemUpdate) => request<ActionItemRead>(`/action-items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }),
  
  deleteActionItem: (id: number) => request<void>(`/action-items/${id}`, { method: "DELETE" }),
  
  getParticipants: () => request<ParticipantRead[]>("/participants"),

  askQuestion: (question: string, meetingIds?: number[]) =>
    request<QueryResponse>("/query", {
      method: "POST",
      body: JSON.stringify({ question, meeting_ids: meetingIds ?? null }),
    }),
  getMe: () => request<ParticipantRead>("/me"),
  getTags: () => request<TagRead[]>("/tags"),
};
