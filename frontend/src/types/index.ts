export type RoleTier = 'Super Admin' | 'Admin' | 'Editor' | 'Viewer' | 'Custom';

export interface Project {
  id: string;
  title: string;
  description: string;
  logo_url?: string;
  created_at: string;
  status: 'In Production' | 'Pre-Production' | 'Post-Production' | 'Released';
  target_release: string;
  season_count: number;
  active: boolean;
}

export interface Episode {
  id: string;
  project_id: string;
  season_number: number;
  episode_number: number;
  title: string;
  synopsis: string;
  runtime_mins: number;
  status: 'Development' | 'Scripting' | 'Production' | 'Locked' | 'Released';
  progress_pct: number;
}

export interface Scene {
  id: string;
  project_id: string;
  episode_id: string;
  scene_number: number;
  slugline: string;
  content: string; // Fountain formatted script
  synopsis: string;
  locked_until?: string | null; // ISO timestamp
  is_spoiler: boolean;
  location: string;
  time_of_day: string;
  page_length: number;
  voice_memo_url?: string | null;
  voice_memo_duration?: number | null;
  created_at: string;
}

export interface CharacterVoiceClip {
  id: string;
  title: string;
  audioUrl: string;
  duration: number;
  recordedAt: string;
}

export interface CharacterGalleryItem {
  id: string;
  url: string;
  caption: string;
}

export interface Character {
  id: string;
  project_id: string;
  name: string;
  role: 'Protagonist' | 'Antagonist' | 'Supporting' | 'Recurring' | 'Guest';
  age: number | string;
  actor_name: string;
  linked_user_id?: string | null;
  backstory: string;
  personality_traits: string[];
  avatar_url: string;
  gallery_images: CharacterGalleryItem[];
  voice_clips: CharacterVoiceClip[];
  created_at: string;
}

export interface StoryboardFrame {
  id: string;
  project_id: string;
  episode_id: string;
  scene_id?: string | null;
  sequence_index: number;
  image_url: string;
  camera_framing: 'Extreme Close-Up' | 'Close-Up' | 'Medium Shot' | 'Wide Shot' | 'Extreme Wide' | 'Dutch Angle' | 'Over-the-Shoulder' | 'Low Angle' | 'High Angle';
  camera_movement: 'Static' | 'Pan Left' | 'Pan Right' | 'Tilt Up' | 'Tilt Down' | 'Tracking' | 'Dolly Zoom' | 'Crane';
  dialogue_text: string;
  director_notes: string;
  sound_effects: string;
  duration_seconds: number;
}

export type WhiteboardNodeType = 'sticky_note' | 'moodboard_image' | 'narrative_card' | 'text_annotation';

export interface WhiteboardNode {
  id: string;
  board_id: string;
  node_type: WhiteboardNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  content: string;
  color: string;
  image_url?: string;
}

export interface WhiteboardEdge {
  id: string;
  board_id: string;
  from_node_id: string;
  to_node_id: string;
  label?: string;
}

export interface Whiteboard {
  id: string;
  project_id: string;
  title: string;
  category: string;
  is_pinned: boolean;
  is_locked: boolean;
  nodes: WhiteboardNode[];
  edges: WhiteboardEdge[];
  created_at: string;
}

export type MessageType = 'text' | 'voice_note' | 'script_snippet' | 'whiteboard_pin' | 'poll' | 'soundboard_clip';

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // user IDs
}

export interface ChatMessage {
  id: string;
  project_id: string;
  channel_id: string; // or direct message thread id
  sender_id: string;
  sender_name: string;
  sender_avatar: string;
  content: string;
  message_type: MessageType;
  voice_note_url?: string;
  voice_note_duration?: number;
  script_snippet_data?: {
    sceneSlug: string;
    scriptText: string;
  };
  whiteboard_pin_data?: {
    boardId: string;
    boardTitle: string;
    x: number;
    y: number;
  };
  poll_data?: {
    question: string;
    options: PollOption[];
  };
  soundboard_clip_data?: {
    clipId: string;
    title: string;
    category: string;
    audioUrl: string;
  };
  scheduled_at?: string | null;
  is_starred: boolean;
  read_by: string[];
  created_at: string;
}

export interface KanbanTask {
  id: string;
  project_id: string;
  episode_id?: string | null;
  column_id: 'backlog' | 'scripting' | 'animation' | 'review' | 'approved';
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  due_date: string;
  assignee_id?: string | null;
  assignee_name?: string | null;
  tagged_character_ids: string[];
  labels: string[];
  created_at: string;
}

export interface AssetVaultItem {
  id: string;
  project_id: string;
  folder_path: string;
  filename: string;
  file_type: 'image' | 'audio' | 'document' | 'model' | 'video';
  file_url: string;
  file_size_bytes: number;
  tags: string[];
  version: string;
  uploaded_by: string;
  deep_links: string[];
  created_at: string;
}

export interface SoundboardClip {
  id: string;
  project_id: string;
  title: string;
  category: 'Dialogue' | 'Score' | 'Foley' | 'SFX' | 'Ambient';
  audio_url: string;
  duration_seconds: number;
  waveform_points: number[];
  is_looping: boolean;
  volume: number;
  created_at: string;
}

export interface LorePropertyCard {
  key: string;
  value: string;
}

export interface LoreArticle {
  id: string;
  project_id: string;
  title: string;
  category: 'Faction' | 'Location' | 'Technology' | 'Magic & Rules' | 'History & Timeline' | 'Cosmology';
  emoji_icon: string;
  cover_image_url?: string;
  summary: string;
  content_markdown: string;
  property_cards: LorePropertyCard[];
  tags: string[];
  attached_asset_ids: string[];
  updated_at: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  phase: 'Scripting & Writing' | 'Casting & Table Reads' | 'Production & Principle Photography' | 'Post-Production & Scoring' | 'Distribution & Release';
  title: string;
  description: string;
  target_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  progress_pct: number;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role_tier: RoleTier;
  studio_title: string;
  avatar_url: string;
  banner_url: string;
  bio: string;
  skill_tags: string[];
  portfolio_url: string;
  timezone: string;
  working_hours: string;
  availability_status: string;
  availability_status_emoji: string;
  linked_character_id?: string | null;
}

export interface AuditLog {
  id: string;
  project_id: string;
  user_id: string;
  user_name: string;
  action_type: string;
  entity_type: string;
  entity_title: string;
  details: string;
  timestamp: string;
}

export interface InviteCode {
  id: string;
  code: string;
  role_tier: RoleTier;
  created_by: string;
  max_uses: number;
  times_used: number;
  expires_at: string;
  created_at: string;
}

export interface SystemSettings {
  studio_name: string;
  storage_path: string;
  backup_frequency: string;
  theme_mode: 'dark' | 'light';
  is_setup_completed: boolean;
}

export interface StudioDatabaseState {
  projects: Project[];
  episodes: Episode[];
  scenes: Scene[];
  characters: Character[];
  storyboard_frames: StoryboardFrame[];
  whiteboards: Whiteboard[];
  chat_messages: ChatMessage[];
  kanban_tasks: KanbanTask[];
  assets: AssetVaultItem[];
  soundboard_clips: SoundboardClip[];
  lore_articles: LoreArticle[];
  milestones: Milestone[];
  team_members: TeamMember[];
  audit_logs: AuditLog[];
  invite_codes: InviteCode[];
  system_settings: SystemSettings;
}
