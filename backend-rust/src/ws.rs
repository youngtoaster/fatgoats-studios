use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
};
use futures_util::{sink::SinkExt, stream::StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::broadcast;
use crate::{db::Database, models::ChatMessage};

#[derive(Clone)]
pub struct AppState {
    pub db: Database,
    pub tx: broadcast::Sender<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum WsEvent {
    #[serde(rename = "chat_message")]
    ChatMessage(ChatMessage),
    #[serde(rename = "sync_mutation")]
    SyncMutation(serde_json::Value),
    #[serde(rename = "user_presence")]
    UserPresence { user_id: String, user_name: String, status: String },
    #[serde(rename = "heartbeat")]
    Heartbeat { timestamp: String },
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: Arc<AppState>) {
    let (mut sender, mut receiver) = socket.split();
    let mut rx = state.tx.subscribe();

    // Spawn task to forward broadcast messages to this client
    let mut send_task = tokio::spawn(async move {
        while let Ok(msg_text) = rx.recv().await {
            if sender.send(Message::Text(msg_text.into())).await.is_err() {
                break;
            }
        }
    });

    // Handle messages coming from this client
    let state_clone = state.clone();
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            if let Message::Text(text) = msg {
                let text_str = text.as_str();
                if let Ok(event) = serde_json::from_str::<WsEvent>(text_str) {
                    match &event {
                        WsEvent::ChatMessage(chat_msg) => {
                            let _ = state_clone.db.insert_chat_message(chat_msg);
                            // Broadcast to everyone
                            let _ = state_clone.tx.send(text_str.to_string());
                        }
                        WsEvent::SyncMutation(_) | WsEvent::UserPresence { .. } => {
                            let _ = state_clone.tx.send(text_str.to_string());
                        }
                        WsEvent::Heartbeat { .. } => {
                            // Can echo or respond
                        }
                    }
                }
            }
        }
    });

    // Wait until either task finishes
    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    };
}
