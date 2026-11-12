mod db;
mod handlers;
mod models;
mod ws;

use axum::{
    routing::{get, post},
    Router,
};
use std::{net::SocketAddr, path::PathBuf, sync::Arc};
use tokio::sync::broadcast;
use tower_http::{
    cors::{Any, CorsLayer},
    services::ServeDir,
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use db::Database;
use ws::AppState;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let args: Vec<String> = std::env::args().collect();
    let mut port: u16 = 3001;
    let mut should_open = false;

    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--port" => {
                if i + 1 < args.len() {
                    if let Ok(p) = args[i + 1].parse::<u16>() {
                        port = p;
                        i += 1;
                    }
                }
            }
            "--open" => {
                should_open = true;
            }
            _ => {}
        }
        i += 1;
    }

    println!(r#"
  ______      _    _____             _          _____ _             _ _           
 |  ____|    | |  / ____|           | |        / ____| |           | (_)          
 | |__   __ _| |_| |  __  ___   __ _| |_ ___  | (___ | |_ _   _  __| |_  ___  ___ 
 |  __| / _` | __| | |_ |/ _ \ / _` | __/ __|  \___ \| __| | | |/ _` | |/ _ \/ __|
 | |   | (_| | |_| |__| | (_) | (_| | |_\__ \  ____) | |_| |_| | (_| | | (_) \__ \
 |_|    \__,_|\__|\_____|\___/ \__,_|\__|___/ |_____/ \__|\__,_|\__,_|_|\___/|___/
                                                                                  
  Digital Operating System for Film, Television, Animation & Creative Studios
    "#);

    let db_path = "fatgoats_studios.db";
    let db = Database::new(db_path)?;
    println!("Database initialized: {}", db_path);

    let (tx, _rx) = broadcast::channel(100);
    let state = Arc::new(AppState { db, tx });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let api_router = Router::new()
        .route("/api/health", get(handlers::health_check))
        .route("/api/state", get(handlers::get_state).post(handlers::save_state))
        .route("/api/chat/messages", post(handlers::post_chat_message))
        .route("/api/audit", post(handlers::post_audit_log))
        .route("/api/machines", get(handlers::get_machines))
        .route("/ws", get(ws::ws_handler))
        .with_state(state);

    let dist_path = PathBuf::from("../frontend/dist");
    let has_dist = dist_path.exists();
    let app = if has_dist {
        println!("Serving production frontend assets from: {:?}", dist_path);
        api_router.fallback_service(ServeDir::new(&dist_path))
    } else {
        println!("Running in developer API mode (Frontend dev server on http://localhost:5173)");
        api_router
    }
    .layer(cors)
    .layer(TraceLayer::new_for_http());

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    println!("FatGoats Studios Engine listening on http://localhost:{}", port);
    println!("WebSocket channel active at ws://localhost:{}/ws", port);

    if should_open {
        let open_url = if has_dist {
            format!("http://localhost:{}", port)
        } else {
            "http://localhost:5173".to_string()
        };
        println!("Opening FatGoats Studios at {}", open_url);
        let _ = open::that(open_url);
    }

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
