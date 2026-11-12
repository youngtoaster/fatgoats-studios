use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub title: String,
    pub description: String,
    pub logo_url: Option<String>,
    pub created_at: String,
    pub status: String,
    pub target_release: String,
    pub season_count: i32,
    pub active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Episode {
    pub id: String,
    pub project_id: String,
    pub season_number: i32,
    pub episode_number: i32,
    pub title: String,
    pub synopsis: String,
    pub runtime_mins: i32,
    pub status: String,
    pub progress_pct: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Scene {
    pub id: String,
    pub project_id: String,
    pub episode_id: String,
    pub scene_number: i32,
    pub slugline: String,
    pub content: String,
    pub synopsis: String,
    pub locked_until: Option<String>,
    pub is_spoiler: bool,
    pub location: String,
    pub time_of_day: String,
    pub page_length: f64,
    pub voice_memo_url: Option<String>,
    pub voice_memo_duration: Option<f64>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Character {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub role: String,
    pub age: String,
    pub actor_name: String,
    pub linked_user_id: Option<String>,
    pub backstory: String,
    pub personality_traits: Vec<String>,
    pub avatar_url: String,
    pub gallery_images: serde_json::Value,
    pub voice_clips: serde_json::Value,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoryboardFrame {
    pub id: String,
    pub project_id: String,
    pub episode_id: String,
    pub scene_id: Option<String>,
    pub sequence_index: i32,
    pub image_url: String,
    pub camera_framing: String,
    pub camera_movement: String,
    pub dialogue_text: String,
    pub director_notes: String,
    pub sound_effects: String,
    pub duration_seconds: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WhiteboardNode {
    pub id: String,
    pub board_id: String,
    pub node_type: String,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub title: String,
    pub content: String,
    pub color: String,
    pub image_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WhiteboardEdge {
    pub id: String,
    pub board_id: String,
    pub from_node_id: String,
    pub to_node_id: String,
    pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Whiteboard {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub category: String,
    pub is_pinned: bool,
    pub is_locked: bool,
    pub nodes: Vec<WhiteboardNode>,
    pub edges: Vec<WhiteboardEdge>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub id: String,
    pub project_id: String,
    pub channel_id: String,
    pub sender_id: String,
    pub sender_name: String,
    pub sender_avatar: String,
    pub content: String,
    pub message_type: String,
    pub voice_note_url: Option<String>,
    pub voice_note_duration: Option<f64>,
    pub script_snippet_data: Option<serde_json::Value>,
    pub whiteboard_pin_data: Option<serde_json::Value>,
    pub poll_data: Option<serde_json::Value>,
    pub soundboard_clip_data: Option<serde_json::Value>,
    pub scheduled_at: Option<String>,
    pub is_starred: bool,
    pub read_by: Vec<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KanbanTask {
    pub id: String,
    pub project_id: String,
    pub episode_id: Option<String>,
    pub column_id: String,
    pub title: String,
    pub description: String,
    pub priority: String,
    pub due_date: String,
    pub assignee_id: Option<String>,
    pub assignee_name: Option<String>,
    pub tagged_character_ids: Vec<String>,
    pub labels: Vec<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetVaultItem {
    pub id: String,
    pub project_id: String,
    pub folder_path: String,
    pub filename: String,
    pub file_type: String,
    pub file_url: String,
    pub file_size_bytes: i64,
    pub tags: Vec<String>,
    pub version: String,
    pub uploaded_by: String,
    pub deep_links: Vec<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SoundboardClip {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub category: String,
    pub audio_url: String,
    pub duration_seconds: f64,
    pub waveform_points: Vec<f64>,
    pub is_looping: bool,
    pub volume: f64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LorePropertyCard {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoreArticle {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub category: String,
    pub emoji_icon: String,
    pub cover_image_url: Option<String>,
    pub summary: String,
    pub content_markdown: String,
    pub property_cards: Vec<LorePropertyCard>,
    pub tags: Vec<String>,
    pub attached_asset_ids: Vec<String>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Milestone {
    pub id: String,
    pub project_id: String,
    pub phase: String,
    pub title: String,
    pub description: String,
    pub target_date: String,
    pub status: String,
    pub progress_pct: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TeamMember {
    pub id: String,
    pub name: String,
    pub email: String,
    pub role_tier: String,
    pub studio_title: String,
    pub avatar_url: String,
    pub banner_url: String,
    pub bio: String,
    pub skill_tags: Vec<String>,
    pub portfolio_url: String,
    pub timezone: String,
    pub working_hours: String,
    pub availability_status: String,
    pub availability_status_emoji: String,
    pub linked_character_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLog {
    pub id: String,
    pub project_id: String,
    pub user_id: String,
    pub user_name: String,
    pub action_type: String,
    pub entity_type: String,
    pub entity_title: String,
    pub details: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InviteCode {
    pub id: String,
    pub code: String,
    pub role_tier: String,
    pub created_by: String,
    pub max_uses: i32,
    pub times_used: i32,
    pub expires_at: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemSettings {
    pub studio_name: String,
    pub storage_path: String,
    pub backup_frequency: String,
    pub theme_mode: String,
    pub is_setup_completed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FullStudioState {
    pub projects: Vec<Project>,
    pub episodes: Vec<Episode>,
    pub scenes: Vec<Scene>,
    pub characters: Vec<Character>,
    pub storyboard_frames: Vec<StoryboardFrame>,
    pub whiteboards: Vec<Whiteboard>,
    pub chat_messages: Vec<ChatMessage>,
    pub kanban_tasks: Vec<KanbanTask>,
    pub assets: Vec<AssetVaultItem>,
    pub soundboard_clips: Vec<SoundboardClip>,
    pub lore_articles: Vec<LoreArticle>,
    pub milestones: Vec<Milestone>,
    pub team_members: Vec<TeamMember>,
    pub audit_logs: Vec<AuditLog>,
    pub invite_codes: Vec<InviteCode>,
    pub system_settings: SystemSettings,
}
