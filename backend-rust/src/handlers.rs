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
