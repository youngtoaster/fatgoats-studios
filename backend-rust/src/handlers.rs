use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
};
use serde_json::{json, Value};
use std::sync::Arc;
use crate::{
    models::{AuditLog, ChatMessage, FullStudioState},
    ws::{AppState, WsEvent},
};

pub async fn health_check(State(_state): State<Arc<AppState>>) -> Json<Value> {
    Json(json!({
        "status": "healthy",
        "service": "FatGoats Studios Engine",
        "version": "1.0.0",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "database": "sqlite3_active"
    }))
}

pub async fn get_state(State(state): State<Arc<AppState>>) -> Result<Json<FullStudioState>, (StatusCode, String)> {
    match state.db.get_full_state() {
        Ok(full_state) => Ok(Json(full_state)),
        Err(err) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to read database state: {}", err))),
    }
}

pub async fn save_state(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<FullStudioState>,
) -> Result<Json<Value>, (StatusCode, String)> {
    match state.db.save_state(&payload) {
        Ok(_) => {
            // Broadcast sync mutation to connected clients
            let sync_event = WsEvent::SyncMutation(json!({ "action": "FULL_SYNC_SAVED", "timestamp": chrono::Utc::now().to_rfc3339() }));
            if let Ok(msg) = serde_json::to_string(&sync_event) {
                let _ = state.tx.send(msg);
            }

            Ok(Json(json!({
                "success": true,
                "message": "Studio state synchronized and persisted successfully"
            })))
        }
        Err(err) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to save state: {}", err))),
    }
}

pub async fn post_chat_message(
    State(state): State<Arc<AppState>>,
    Json(msg): Json<ChatMessage>,
) -> Result<Json<Value>, (StatusCode, String)> {
    match state.db.insert_chat_message(&msg) {
        Ok(_) => {
            let event = WsEvent::ChatMessage(msg);
            if let Ok(txt) = serde_json::to_string(&event) {
                let _ = state.tx.send(txt);
            }
            Ok(Json(json!({ "success": true })))
        }
        Err(err) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to post message: {}", err))),
    }
}

pub async fn post_audit_log(
    State(state): State<Arc<AppState>>,
    Json(log): Json<AuditLog>,
) -> Result<Json<Value>, (StatusCode, String)> {
    match state.db.insert_audit_log(&log) {
        Ok(_) => Ok(Json(json!({ "success": true }))),
        Err(err) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to insert audit log: {}", err))),
    }
}

pub async fn get_machines(State(state): State<Arc<AppState>>) -> Json<Value> {
    let full_state = state.db.get_full_state().ok();
    let locked_count = full_state.as_ref().map(|s| {
        let now = chrono::Utc::now().to_rfc3339();
        s.scenes.iter().filter(|sc| sc.locked_until.as_ref().map_or(false, |lu| lu > &now)).count()
    }).unwrap_or(0);

    let task_counts = full_state.as_ref().map(|s| {
        let mut map = std::collections::HashMap::new();
        for t in &s.kanban_tasks {
            *map.entry(t.column_id.clone()).or_insert(0) += 1;
        }
        map
    });

    Json(json!({
        "version": "1.0.0",
        "system": "FatGoats Studios Explicit State Machine Registry",
        "description": "Formal state machine specifications elevating UX (zero impossible states), DX (typed transitions), and AX (introspectable agent workflows)",
        "machines": [
            {
                "id": "scene_embargo_machine",
                "name": "Screenplay Scene Embargo & Spoiler Time-Lock Machine",
                "initial_state": "UNLOCKED",
                "states": [
                    { "id": "UNLOCKED", "label": "Draft Open", "description": "Scene is freely readable and editable by writers and cast." },
                    { "id": "LOCKED_COUNTDOWN", "label": "Sealed Embargo", "description": "Scene content is cryptographically hidden behind a future countdown clock." },
                    { "id": "TIME_EXPIRED", "label": "Embargo Matured", "description": "Countdown reached zero; scene is ready for automatic unsealing." },
                    { "id": "OVERRIDDEN", "label": "Super Admin Override", "description": "Emergency unlock bypassed by Super Admin authorization." }
                ],
                "transitions": [
                    { "from": "UNLOCKED", "event": "APPLY_EMBARGO", "to": "LOCKED_COUNTDOWN", "guard": "locked_until timestamp is in the future" },
                    { "from": "LOCKED_COUNTDOWN", "event": "TICK_EXPIRE", "to": "TIME_EXPIRED", "guard": "current_time >= locked_until" },
                    { "from": "LOCKED_COUNTDOWN", "event": "ADMIN_OVERRIDE", "to": "OVERRIDDEN", "guard": "caller has Super Admin role" },
                    { "from": "TIME_EXPIRED", "event": "ACKNOWLEDGE_UNLOCK", "to": "UNLOCKED", "guard": "none" },
                    { "from": "OVERRIDDEN", "event": "RESET_UNLOCKED", "to": "UNLOCKED", "guard": "none" }
                ],
                "active_instances_count": locked_count
            },
            {
                "id": "kanban_pipeline_machine",
                "name": "Production Kanban Stage Machine",
                "initial_state": "backlog",
                "states": [
                    { "id": "backlog", "label": "Backlog", "description": "Idea or requirement logged in production hopper." },
                    { "id": "scripting", "label": "In Scripting", "description": "Assigned to writers room for screenplay draft." },
                    { "id": "animation", "label": "Animation & VFX", "description": "In 3D layout, modeling, or visual animatic phase." },
                    { "id": "review", "label": "Review & Dailies", "description": "Screened for director and supervisor sign-off." },
                    { "id": "approved", "label": "Approved / Locked", "description": "Accepted into master production reel." }
                ],
                "transitions": [
                    { "from": "backlog", "event": "START_SCRIPTING", "to": "scripting", "guard": "assignee assigned" },
                    { "from": "scripting", "event": "SEND_TO_ANIMATION", "to": "animation", "guard": "Fountain script scene linked" },
                    { "from": "scripting", "event": "FAST_TRACK_REVIEW", "to": "review", "guard": "script ready" },
                    { "from": "animation", "event": "SUBMIT_FOR_REVIEW", "to": "review", "guard": "assets attached" },
                    { "from": "review", "event": "APPROVE_TASK", "to": "approved", "guard": "reviewer has Admin or Super Admin role" },
                    { "from": "review", "event": "REQUEST_REWORK", "to": "scripting", "guard": "rejection notes provided" }
                ],
                "distribution": task_counts
            },
            {
                "id": "audio_recorder_machine",
                "name": "Studio Microphone & Foley Recorder Machine",
                "initial_state": "IDLE",
                "states": [
                    { "id": "IDLE", "label": "Standby", "description": "Ready to capture voice take or foley soundbite." },
                    { "id": "REQUESTING_PERMISSION", "label": "Requesting Mic", "description": "Prompting OS/browser for audio input access." },
                    { "id": "RECORDING", "label": "Recording", "description": "Audio buffer actively capturing from media stream." },
                    { "id": "REVIEWING", "label": "Review & Playback", "description": "Take completed; auditing waveform before commitment." },
                    { "id": "SAVING", "label": "Persisting Take", "description": "Writing audio blob to dossier, soundboard, or scene memo." },
                    { "id": "ERROR", "label": "Hardware Error", "description": "Permission denied or input device unavailable." }
                ],
                "transitions": [
                    { "from": "IDLE", "event": "START_RECORD", "to": "REQUESTING_PERMISSION", "guard": "hardware supported" },
                    { "from": "REQUESTING_PERMISSION", "event": "PERMISSION_GRANTED", "to": "RECORDING", "guard": "stream active" },
                    { "from": "REQUESTING_PERMISSION", "event": "PERMISSION_DENIED", "to": "ERROR", "guard": "stream rejected" },
                    { "from": "RECORDING", "event": "STOP_RECORD", "to": "REVIEWING", "guard": "chunks length > 0" },
                    { "from": "REVIEWING", "event": "DISCARD", "to": "IDLE", "guard": "none" },
                    { "from": "REVIEWING", "event": "COMMIT_SAVE", "to": "SAVING", "guard": "title valid" },
                    { "from": "SAVING", "event": "SAVE_COMPLETE", "to": "IDLE", "guard": "none" },
                    { "from": "ERROR", "event": "DISMISS", "to": "IDLE", "guard": "none" }
                ]
            },
            {
                "id": "teleprompter_machine",
                "name": "Rehearsal Teleprompter Engine",
                "initial_state": "CLOSED",
                "states": [
                    { "id": "CLOSED", "label": "Inactive", "description": "Standard script view." },
                    { "id": "READY", "label": "Cue Standby", "description": "Fullscreen prompter mounted at beginning of scene." },
                    { "id": "COUNTDOWN", "label": "Lead-In 3..2..1", "description": "Cast countdown pacing before autoscroll engages." },
                    { "id": "SCROLLING", "label": "Autoscrolling", "description": "Viewport dynamically translating at configured words-per-minute speed." },
                    { "id": "PAUSED", "label": "Director Hold", "description": "Rehearsal paused on line cue." },
                    { "id": "COMPLETED", "label": "Scene Cut", "description": "Bottom of script reached." }
                ],
                "transitions": [
                    { "from": "CLOSED", "event": "OPEN", "to": "READY", "guard": "scene has content" },
                    { "from": "READY", "event": "CUE_ACTION", "to": "COUNTDOWN", "guard": "speed > 0" },
                    { "from": "COUNTDOWN", "event": "ACTION_START", "to": "SCROLLING", "guard": "countdown zero" },
                    { "from": "SCROLLING", "event": "TOGGLE_PAUSE", "to": "PAUSED", "guard": "none" },
                    { "from": "PAUSED", "event": "RESUME", "to": "SCROLLING", "guard": "none" },
                    { "from": "SCROLLING", "event": "END_REACHED", "to": "COMPLETED", "guard": "scroll >= max" },
                    { "from": "*", "event": "CLOSE", "to": "CLOSED", "guard": "none" }
                ]
            },
            {
                "id": "connection_sync_machine",
                "name": "Offline Resilience & Bidirectional Sync Machine",
                "initial_state": "CONNECTED_IDLE",
                "states": [
                    { "id": "CONNECTED_IDLE", "label": "Rust DB Synced", "description": "WebSocket alive and SQLite backend responsive." },
                    { "id": "OFFLINE_BACKLOG", "label": "Offline Backlog", "description": "Network or backend unreachable; local mutations queued." },
                    { "id": "SYNCING_BATCH", "label": "Syncing Backlog", "description": "Flushing queued mutations sequentially to Rust server." },
                    { "id": "RECONNECTING", "label": "Re-establishing Channel", "description": "Probing health check and opening WebSocket." }
                ],
                "transitions": [
                    { "from": "CONNECTED_IDLE", "event": "HEARTBEAT_TIMEOUT", "to": "OFFLINE_BACKLOG", "guard": "failed consecutive pings" },
                    { "from": "OFFLINE_BACKLOG", "event": "DETECT_ONLINE", "to": "SYNCING_BATCH", "guard": "health endpoint ok" },
                    { "from": "SYNCING_BATCH", "event": "BATCH_ACCEPTED", "to": "CONNECTED_IDLE", "guard": "queue empty" },
                    { "from": "SYNCING_BATCH", "event": "BATCH_ERROR", "to": "OFFLINE_BACKLOG", "guard": "error returned" }
                ]
            }
        ]
    }))
}
