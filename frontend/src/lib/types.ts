export type Page<T> = { items: T[]; total: number; limit: number; offset: number };

export type MeetingSource = "seed" | "upload" | "manual";
export type MeetingStatus = "processing" | "completed";

export type ParticipantRead = {
  id: number;
  name: string;
  email: string | null;
  avatar_color: string;
  is_current_user: boolean;
  initials: string;
};

export type TagRead = { id: number; name: string; color: string };

export type MeetingListItem = {
  id: number;
  title: string;
  description: string | null;
  meeting_date: string;
  duration_ms: number;
  source: MeetingSource;
  status: MeetingStatus;
  participants: ParticipantRead[];
  tags: TagRead[];
  action_item_count: number;
  open_action_item_count: number;
  has_summary: boolean;
};

export type SpeakerRead = {
  id: number;
  label: string;
  color: string;
  display_order: number;
  participant_id: number | null;
};

export type SegmentRead = {
  id: number;
  seq: number;
  start_ms: number;
  end_ms: number;
  text: string;
  speaker_id: number | null;
};

export type TranscriptRead = {
  meeting_id: number;
  duration_ms: number;
  speakers: SpeakerRead[];
  segments: SegmentRead[];
};

export type BulletSection = { title: string; points: string[] };

export type SummaryRead = {
  id: number;
  overview: string;
  keywords: string[];
  bullet_notes: BulletSection[];
  generated_by: string;
};

export type ChapterRead = {
  id: number;
  title: string;
  gist: string | null;
  start_ms: number;
  end_ms: number | null;
  position: number;
};

export type ActionItemRead = {
  id: number;
  meeting_id: number;
  text: string;
  is_done: boolean;
  due_date: string | null;
  position: number;
  assignee: ParticipantRead | null;
  source_segment_id: number | null;
};

export type MeetingDetail = {
  id: number;
  title: string;
  description: string | null;
  meeting_date: string;
  duration_ms: number;
  audio_url: string | null;
  source: MeetingSource;
  status: MeetingStatus;
  created_at: string;
  updated_at: string;
  organizer: ParticipantRead | null;
  participants: ParticipantRead[];
  tags: TagRead[];
  speakers: SpeakerRead[];
  summary: SummaryRead | null;
  chapters: ChapterRead[];
  action_items: ActionItemRead[];
};

export type MeetingCreate = {
  title: string;
  description?: string | null;
  meeting_date?: string | null;
  participants?: { name: string; email?: string; avatar_color?: string }[];
  tags?: string[];
  transcript_text?: string | null;
  generate_summary?: boolean;
};

export type MeetingUpdate = {
  title?: string;
  description?: string | null;
  meeting_date?: string | null;
  participant_ids?: number[];
  tags?: string[];
};

export type ActionItemCreate = {
  text: string;
  assignee_id?: number | null;
  due_date?: string | null;
  source_segment_id?: number | null;
};

export type ActionItemUpdate = {
  text?: string;
  assignee_id?: number | null;
  is_done?: boolean;
  due_date?: string | null;
  position?: number;
};

export type Citation = {
  meeting_id: number;
  meeting_title: string;
  start_ms: number;
  speaker_label: string | null;
  text: string;
};

export type QueryResponse = {
  answer: string;
  citations: Citation[];
  /** "keyword" for the offline path, "provider:model" when an LLM answered. */
  answered_by: string;
};
