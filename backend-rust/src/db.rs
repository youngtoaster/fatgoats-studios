use rusqlite::{params, Connection, Result};
use std::sync::{Arc, Mutex};
use crate::models::*;

#[derive(Clone)]
pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    pub fn new(path: &str) -> Result<Self> {
        let conn = Connection::open(path)?;
        let db = Database {
            conn: Arc::new(Mutex::new(conn)),
        };
        db.init_schema()?;
        db.seed_if_empty()?;
        Ok(db)
    }

    fn init_schema(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                logo_url TEXT,
                created_at TEXT NOT NULL,
                status TEXT NOT NULL,
                target_release TEXT NOT NULL,
                season_count INTEGER NOT NULL,
                active BOOLEAN NOT NULL
            );

            CREATE TABLE IF NOT EXISTS episodes (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                season_number INTEGER NOT NULL,
                episode_number INTEGER NOT NULL,
                title TEXT NOT NULL,
                synopsis TEXT NOT NULL,
                runtime_mins INTEGER NOT NULL,
                status TEXT NOT NULL,
                progress_pct INTEGER NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id)
            );

            CREATE TABLE IF NOT EXISTS scenes (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                episode_id TEXT NOT NULL,
                scene_number INTEGER NOT NULL,
                slugline TEXT NOT NULL,
                content TEXT NOT NULL,
                synopsis TEXT NOT NULL,
                locked_until TEXT,
                is_spoiler BOOLEAN NOT NULL,
                location TEXT NOT NULL,
                time_of_day TEXT NOT NULL,
                page_length REAL NOT NULL,
                voice_memo_url TEXT,
                voice_memo_duration REAL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id),
                FOREIGN KEY (episode_id) REFERENCES episodes(id)
            );

            CREATE TABLE IF NOT EXISTS characters (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                age TEXT NOT NULL,
                actor_name TEXT NOT NULL,
                linked_user_id TEXT,
                backstory TEXT NOT NULL,
                personality_traits TEXT NOT NULL,
                avatar_url TEXT NOT NULL,
                gallery_images TEXT NOT NULL,
                voice_clips TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id)
            );

            CREATE TABLE IF NOT EXISTS storyboard_frames (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                episode_id TEXT NOT NULL,
                scene_id TEXT,
                sequence_index INTEGER NOT NULL,
                image_url TEXT NOT NULL,
                camera_framing TEXT NOT NULL,
                camera_movement TEXT NOT NULL,
                dialogue_text TEXT NOT NULL,
                director_notes TEXT NOT NULL,
                sound_effects TEXT NOT NULL,
                duration_seconds REAL NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id)
            );

            CREATE TABLE IF NOT EXISTS whiteboards (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                is_pinned BOOLEAN NOT NULL,
                is_locked BOOLEAN NOT NULL,
                nodes TEXT NOT NULL,
                edges TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id)
            );

            CREATE TABLE IF NOT EXISTS chat_messages (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                sender_id TEXT NOT NULL,
                sender_name TEXT NOT NULL,
                sender_avatar TEXT NOT NULL,
                content TEXT NOT NULL,
                message_type TEXT NOT NULL,
                voice_note_url TEXT,
                voice_note_duration REAL,
                script_snippet_data TEXT,
                whiteboard_pin_data TEXT,
                poll_data TEXT,
                soundboard_clip_data TEXT,
                scheduled_at TEXT,
                is_starred BOOLEAN NOT NULL,
                read_by TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id)
            );

            CREATE TABLE IF NOT EXISTS kanban_tasks (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                episode_id TEXT,
                column_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                priority TEXT NOT NULL,
                due_date TEXT NOT NULL,
                assignee_id TEXT,
                assignee_name TEXT,
                tagged_character_ids TEXT NOT NULL,
                labels TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id)
            );

            CREATE TABLE IF NOT EXISTS assets (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                folder_path TEXT NOT NULL,
                filename TEXT NOT NULL,
                file_type TEXT NOT NULL,
                file_url TEXT NOT NULL,
                file_size_bytes INTEGER NOT NULL,
                tags TEXT NOT NULL,
                version TEXT NOT NULL,
                uploaded_by TEXT NOT NULL,
                deep_links TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id)
            );

            CREATE TABLE IF NOT EXISTS soundboard_clips (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                audio_url TEXT NOT NULL,
                duration_seconds REAL NOT NULL,
                waveform_points TEXT NOT NULL,
                is_looping BOOLEAN NOT NULL,
                volume REAL NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id)
            );

            CREATE TABLE IF NOT EXISTS lore_articles (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                emoji_icon TEXT NOT NULL,
                cover_image_url TEXT,
                summary TEXT NOT NULL,
                content_markdown TEXT NOT NULL,
                property_cards TEXT NOT NULL,
                tags TEXT NOT NULL,
                attached_asset_ids TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id)
            );

            CREATE TABLE IF NOT EXISTS milestones (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                phase TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                target_date TEXT NOT NULL,
                status TEXT NOT NULL,
                progress_pct INTEGER NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id)
            );

            CREATE TABLE IF NOT EXISTS team_members (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                role_tier TEXT NOT NULL,
                studio_title TEXT NOT NULL,
                avatar_url TEXT NOT NULL,
                banner_url TEXT NOT NULL,
                bio TEXT NOT NULL,
                skill_tags TEXT NOT NULL,
                portfolio_url TEXT NOT NULL,
                timezone TEXT NOT NULL,
                working_hours TEXT NOT NULL,
                availability_status TEXT NOT NULL,
                availability_status_emoji TEXT NOT NULL,
                linked_character_id TEXT
            );

            CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                user_name TEXT NOT NULL,
                action_type TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_title TEXT NOT NULL,
                details TEXT NOT NULL,
                timestamp TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS invite_codes (
                id TEXT PRIMARY KEY,
                code TEXT NOT NULL,
                role_tier TEXT NOT NULL,
                created_by TEXT NOT NULL,
                max_uses INTEGER NOT NULL,
                times_used INTEGER NOT NULL,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            ",
        )?;

        Ok(())
    }

    fn seed_if_empty(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM projects", [], |r| r.get(0))?;
        if count > 0 {
            return Ok(());
        }

        println!("Seeding initial FatGoats Studios production database...");

        // 1. Projects
        conn.execute(
            "INSERT INTO projects (id, title, description, logo_url, created_at, status, target_release, season_count, active)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                "proj_nebula_01",
                "Nebula Chronicles",
                "A hard sci-fi space opera tracking the voyage of the deep-recon starcruiser Aethel through unmapped rift anomalies.",
                "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&auto=format&fit=crop&q=80",
                "2026-01-15T00:00:00Z",
                "In Production",
                "Q4 2027",
                2,
                true
            ],
        )?;

        // 2. Episodes
        conn.execute(
            "INSERT INTO episodes (id, project_id, season_number, episode_number, title, synopsis, runtime_mins, status, progress_pct)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                "ep_101",
                "proj_nebula_01",
                1,
                1,
                "Signals in the Static",
                "An unmanned communications beacon goes dark at the edge of the Kuiper belt, broadcasting a subsonic pulse.",
                52,
                "Locked",
                100
            ],
        )?;

        conn.execute(
            "INSERT INTO episodes (id, project_id, season_number, episode_number, title, synopsis, runtime_mins, status, progress_pct)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                "ep_102",
                "proj_nebula_01",
                1,
                2,
                "The Derelict Orbital",
                "Commander Vance leads a boarding detachment into an ancient pre-collapse research habitat.",
                48,
                "Production",
                65
            ],
        )?;

        conn.execute(
            "INSERT INTO episodes (id, project_id, season_number, episode_number, title, synopsis, runtime_mins, status, progress_pct)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                "ep_103",
                "proj_nebula_01",
                1,
                3,
                "Event Horizon Protocol",
                "With propulsion critically failing, Dr. Rostova proposes a gravimetric slingshot through the dark rift.",
                55,
                "Scripting",
                30
            ],
        )?;

        // 3. Scenes (Fountain Format with Time-Lock Embargo)
        let s101_content = r#"EXT. DEEP SPACE RELAY - ORBITAL DAWN

The black void of Sector 9 glimmers with cold, distant stars.
Drifting silently, the AETHEL-CLASS RECON CRUISER comes into frame.
Its navigational deflectors emit a faint amber pulse.

INT. BRIDGE - STARCRUISER AETHEL - CONTINUOUS

COMMANDER TYLER VANCE (38) stands before the central holographic tactical sphere.
His uniform is worn at the cuffs. Exhaustion lines his jaw.

VANCE
(leaning forward)
Elena, isolate that harmonic. Tell me that's solar flare reverberation.

DR. ELENA ROSTOVA (34) doesn't look up from her sensor console. Her fingers dance across the tactile tactile interface.

ELENA
Solar flares don't modulate in Fibonacci sequences, Tyler. It's an intelligent broadcast. And it's coming from inside the derelict.

VECTOR-7 (V.O.)
Hull temperature dropping three degrees per second. Atmospheric seal on Docking Ring B has been breached.

VANCE
Lock down the bulkheads. Nobody touches that airlock until we know who sent that greeting.

CUT TO:

INT. CORRIDOR - DOCKING RING B - MOMENTS LATER

Frost creeps over the steel walls. Klaxons pulse in rhythm.

FADE OUT."#;

        let s102_content = r#"EXT. THE DERELICT ORBITAL SPIRE - DEEP SHADOW

A monolithic metallic ring, overgrown with crystallized dust. It spins slowly against the dark nebula.

INT. AIRLOCK VESTIBULE - CONTINUOUS

VANCE and ELENA in pressurized EVA suits. Oxygen hiss fills the helmets.

VANCE
(into comms)
Remember the protocol. We observe, we sample, we withdraw. No heroics.

ELENA
When have I ever done heroics?

VANCE
Titan colony. Station 4.

ELENA
(smiling under visor)
That was science. Completely different."#;

        // Scene with embargo lock 48 hours into future
        let lock_time = chrono::Utc::now() + chrono::Duration::hours(48);
        let lock_time_str = lock_time.to_rfc3339();

        conn.execute(
            "INSERT INTO scenes (id, project_id, episode_id, scene_number, slugline, content, synopsis, locked_until, is_spoiler, location, time_of_day, page_length, voice_memo_url, voice_memo_duration, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
            params![
                "sc_101",
                "proj_nebula_01",
                "ep_101",
                1,
                "EXT. DEEP SPACE RELAY - ORBITAL DAWN",
                s101_content,
                "The Starcruiser Aethel approaches the silent deep space relay and intercepts an impossible signal.",
                rusqlite::types::Null,
                false,
                "Deep Space Sector 9",
                "Orbital Dawn",
                2.5,
                "https://actions.google.com/sounds/v1/science_fiction/alien_beacon.ogg",
                14.2,
                "2026-02-01T10:00:00Z"
            ],
        )?;

        conn.execute(
            "INSERT INTO scenes (id, project_id, episode_id, scene_number, slugline, content, synopsis, locked_until, is_spoiler, location, time_of_day, page_length, voice_memo_url, voice_memo_duration, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
            params![
                "sc_102",
                "proj_nebula_01",
                "ep_102",
                4,
                "EXT. THE DERELICT ORBITAL SPIRE - DEEP SHADOW",
                s102_content,
                "Vance and Elena breach the outer ring of the ancient orbital spire.",
                lock_time_str,
                true,
                "Derelict Spire",
                "Deep Shadow",
                3.0,
                rusqlite::types::Null,
                rusqlite::types::Null,
                "2026-02-05T14:30:00Z"
            ],
        )?;

        // 4. Characters
        let vance_traits = serde_json::to_string(&vec!["Pragmatic", "Protective", "Haunted by Titan Incident", "Decisive"])
            .unwrap();
        let elena_traits = serde_json::to_string(&vec!["Brilliant Astophysicist", "Curious", "Uncompromising", "Witty"])
            .unwrap();
        let vector_traits = serde_json::to_string(&vec!["Tactical AI", "Logical", "Quiet Dry Humor", "Ultra-Perceptive"])
            .unwrap();

        let vance_gallery = serde_json::to_string(&vec![
            serde_json::json!({ "id": "g1", "url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80", "caption": "Flight Suit Standard Uniform" }),
            serde_json::json!({ "id": "g2", "url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80", "caption": "EVA pressurized gear concept" }),
        ]).unwrap();

        let elena_gallery = serde_json::to_string(&vec![
            serde_json::json!({ "id": "g3", "url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80", "caption": "Laboratory diagnostics attire" }),
        ]).unwrap();

        let vance_voice = serde_json::to_string(&vec![
            serde_json::json!({ "id": "vc_1", "title": "Bridge Command Callout", "audioUrl": "https://actions.google.com/sounds/v1/science_fiction/alien_breath.ogg", "duration": 8.4, "recordedAt": "2026-02-01" }),
            serde_json::json!({ "id": "vc_2", "title": "Airlock EVA Monologue", "audioUrl": "https://actions.google.com/sounds/v1/science_fiction/humming_engine.ogg", "duration": 12.1, "recordedAt": "2026-02-03" }),
        ]).unwrap();

        conn.execute(
            "INSERT INTO characters (id, project_id, name, role, age, actor_name, linked_user_id, backstory, personality_traits, avatar_url, gallery_images, voice_clips, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                "char_vance",
                "proj_nebula_01",
                "Commander Tyler Vance",
                "Protagonist",
                "38",
                "Tyler Vance",
                "user_tyler",
                "Veteran of the Kuiper Border conflict. Retired from fleet command before being recruited for the unmapped Rift Expedition.",
                vance_traits,
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
                vance_gallery,
                vance_voice,
                "2026-01-20T12:00:00Z"
            ],
        )?;

        conn.execute(
            "INSERT INTO characters (id, project_id, name, role, age, actor_name, linked_user_id, backstory, personality_traits, avatar_url, gallery_images, voice_clips, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                "char_elena",
                "proj_nebula_01",
                "Dr. Elena Rostova",
                "Protagonist",
                "34",
                "Sofia Chen",
                "user_sofia",
                "Chief Science Officer of the Aethel. Her theoretical equations on rift gravimetrics made the voyage possible.",
                elena_traits,
                "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
                elena_gallery,
                "[]",
                "2026-01-20T12:00:00Z"
            ],
        )?;

        conn.execute(
            "INSERT INTO characters (id, project_id, name, role, age, actor_name, linked_user_id, backstory, personality_traits, avatar_url, gallery_images, voice_clips, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                "char_vector7",
                "proj_nebula_01",
                "Vector-7",
                "Supporting",
                "N/A",
                "Marcus Holt",
                "user_marcus",
                "Synthetic Tactical Cybernetic Unit integrated into the ship systems, holding emergency override authority.",
                vector_traits,
                "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&auto=format&fit=crop&q=80",
                "[]",
                "[]",
                "2026-01-21T09:00:00Z"
            ],
        )?;

        // 5. Storyboards
        conn.execute(
            "INSERT INTO storyboard_frames (id, project_id, episode_id, scene_id, sequence_index, image_url, camera_framing, camera_movement, dialogue_text, director_notes, sound_effects, duration_seconds)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                "sb_01",
                "proj_nebula_01",
                "ep_101",
                "sc_101",
                1,
                "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80",
                "Extreme Wide Shot",
                "Tracking",
                "VANCE (V.O.): Out here, silence isn't empty. It's waiting.",
                "Start with low aperture. Stars slowly illuminate hull detailing as cruiser glides left to right.",
                "Low subsonic drone, intermittent transmitter beep",
                4.5
            ],
        )?;

        conn.execute(
            "INSERT INTO storyboard_frames (id, project_id, episode_id, scene_id, sequence_index, image_url, camera_framing, camera_movement, dialogue_text, director_notes, sound_effects, duration_seconds)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                "sb_02",
                "proj_nebula_01",
                "ep_101",
                "sc_101",
                2,
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80",
                "Close-Up",
                "Static",
                "VANCE: Tell me that's solar flare reverberation.",
                "Tight focus on Vance's eyes reflecting the green amber tactical hologram.",
                "Console telemetry clicking",
                3.0
            ],
        )?;

        conn.execute(
            "INSERT INTO storyboard_frames (id, project_id, episode_id, scene_id, sequence_index, image_url, camera_framing, camera_movement, dialogue_text, director_notes, sound_effects, duration_seconds)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                "sb_03",
                "proj_nebula_01",
                "ep_102",
                "sc_102",
                3,
                "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
                "Dutch Angle",
                "Dolly Zoom",
                "VECTOR-7: Atmospheric seal breached.",
                "Rapid snap zoom into the frosted airlock seal to heighten claustrophobic urgency.",
                "Air pressurization klaxon, metal groaning",
                2.8
            ],
        )?;

        // 6. Whiteboards
        let wb_nodes = serde_json::to_string(&vec![
            serde_json::json!({
                "id": "node_1",
                "board_id": "wb_01",
                "node_type": "sticky_note",
                "x": 80,
                "y": 100,
                "width": 240,
                "height": 160,
                "title": "Act 1 Inciting Incident",
                "content": "Aethel detects ancient harmonic beacon modulated with human vocal frequencies from before the spaceflight era.",
                "color": "#f59e0b"
            }),
            serde_json::json!({
                "id": "node_2",
                "board_id": "wb_01",
                "node_type": "narrative_card",
                "x": 380,
                "y": 100,
                "width": 280,
                "height": 200,
                "title": "Act 2 Midpoint Twist",
                "content": "The derelict station is not abandoned: it is a time-dilated ark holding the original colony expedition from 2140.",
                "color": "#38bdf8"
            }),
            serde_json::json!({
                "id": "node_3",
                "board_id": "wb_01",
                "node_type": "sticky_note",
                "x": 720,
                "y": 100,
                "width": 240,
                "height": 160,
                "title": "Climax Dilemma",
                "content": "Slingshot through the Rift to return home vs preserve the ark's remaining power core.",
                "color": "#ef4444"
            }),
            serde_json::json!({
                "id": "node_4",
                "board_id": "wb_01",
                "node_type": "text_annotation",
                "x": 380,
                "y": 340,
                "width": 300,
                "height": 60,
                "title": "Director Note",
                "content": "Keep color palette desaturated blue in Act 1, transitioning to gold/amber upon entering the ark.",
                "color": "#94a3b8"
            })
        ]).unwrap();

        let wb_edges = serde_json::to_string(&vec![
            serde_json::json!({ "id": "edge_1", "board_id": "wb_01", "from_node_id": "node_1", "to_node_id": "node_2", "label": "Leads To Investigation" }),
            serde_json::json!({ "id": "edge_2", "board_id": "wb_01", "from_node_id": "node_2", "to_node_id": "node_3", "label": "Forces Moral Choice" }),
        ]).unwrap();

        conn.execute(
            "INSERT INTO whiteboards (id, project_id, title, category, is_pinned, is_locked, nodes, edges, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                "wb_01",
                "proj_nebula_01",
                "Season 1 Master Narrative Arc",
                "Narrative",
                true,
                false,
                wb_nodes,
                wb_edges,
                "2026-01-18T10:00:00Z"
            ],
        )?;

        // 7. Chat Messages
        let poll_json = serde_json::to_string(&serde_json::json!({
            "question": "Should Vance sacrifice the relay array in Episode 3 to save the ark crew?",
            "options": [
                { "id": "opt1", "text": "Yes, high stakes moral sacrifice", "votes": ["user_sofia", "user_marcus"] },
                { "id": "opt2", "text": "No, preserve the lifeline to Earth", "votes": ["user_tyler"] }
            ]
        })).unwrap();

        let snippet_json = serde_json::to_string(&serde_json::json!({
            "sceneSlug": "EXT. DEEP SPACE RELAY - ORBITAL DAWN",
            "scriptText": "ELENA\nSolar flares don't modulate in Fibonacci sequences, Tyler. It's an intelligent broadcast."
        })).unwrap();

        conn.execute(
            "INSERT INTO chat_messages (id, project_id, channel_id, sender_id, sender_name, sender_avatar, content, message_type, voice_note_url, voice_note_duration, script_snippet_data, whiteboard_pin_data, poll_data, soundboard_clip_data, scheduled_at, is_starred, read_by, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
            params![
                "msg_01",
                "proj_nebula_01",
                "writers-room",
                "user_tyler",
                "Tyler Vance",
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
                "Welcome to the Season 1 production room. Script drafts for episodes 1 & 2 are in the suite. Check out the snippet below:",
                "script_snippet",
                rusqlite::types::Null,
                rusqlite::types::Null,
                snippet_json,
                rusqlite::types::Null,
                rusqlite::types::Null,
                rusqlite::types::Null,
                rusqlite::types::Null,
                true,
                "[\"user_tyler\", \"user_sofia\", \"user_marcus\"]",
                "2026-02-08T09:15:00Z"
            ],
        )?;

        conn.execute(
            "INSERT INTO chat_messages (id, project_id, channel_id, sender_id, sender_name, sender_avatar, content, message_type, voice_note_url, voice_note_duration, script_snippet_data, whiteboard_pin_data, poll_data, soundboard_clip_data, scheduled_at, is_starred, read_by, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
            params![
                "msg_02",
                "proj_nebula_01",
                "writers-room",
                "user_sofia",
                "Sofia Chen",
                "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80",
                "Here is the key decision point for the Ep 3 table read. Cast your votes:",
                "poll",
                rusqlite::types::Null,
                rusqlite::types::Null,
                rusqlite::types::Null,
                rusqlite::types::Null,
                poll_json,
                rusqlite::types::Null,
                rusqlite::types::Null,
                false,
                "[\"user_sofia\"]",
                "2026-02-08T10:30:00Z"
            ],
        )?;

        // 8. Kanban Tasks
        conn.execute(
            "INSERT INTO kanban_tasks (id, project_id, episode_id, column_id, title, description, priority, due_date, assignee_id, assignee_name, tagged_character_ids, labels, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                "task_01",
                "proj_nebula_01",
                "ep_101",
                "approved",
                "Finalize Act 1 Screenplay Table Polish",
                "Polish dialog cadence for Vance and Elena in scene 101. Fountain cues verified.",
                "High",
                "2026-02-15",
                "user_tyler",
                "Tyler Vance",
                "[\"char_vance\", \"char_elena\"]",
                "[\"Screenplay\", \"Polish\"]",
                "2026-02-02T10:00:00Z"
            ],
        )?;

        conn.execute(
            "INSERT INTO kanban_tasks (id, project_id, episode_id, column_id, title, description, priority, due_date, assignee_id, assignee_name, tagged_character_ids, labels, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                "task_02",
                "proj_nebula_01",
                "ep_102",
                "animation",
                "Derelict Spire 3D Lighting & Texture Turnaround",
                "Create matte painting and 3D geometric breakdown of ancient orbital architecture.",
                "Urgent",
                "2026-02-28",
                "user_marcus",
                "Marcus Holt",
                "[]",
                "[\"VFX\", \"3D Assets\"]",
                "2026-02-04T11:00:00Z"
            ],
        )?;

        conn.execute(
            "INSERT INTO kanban_tasks (id, project_id, episode_id, column_id, title, description, priority, due_date, assignee_id, assignee_name, tagged_character_ids, labels, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                "task_03",
                "proj_nebula_01",
                "ep_101",
                "review",
                "Voice Actor Audition Review for Vector-7",
                "Listen to processed cybernetic modulation auditions in the character dossier.",
                "Medium",
                "2026-03-01",
                "user_sofia",
                "Sofia Chen",
                "[\"char_vector7\"]",
                "[\"Casting\", \"Audio\"]",
                "2026-02-05T16:00:00Z"
            ],
        )?;

        // 9. Assets
        conn.execute(
            "INSERT INTO assets (id, project_id, folder_path, filename, file_type, file_url, file_size_bytes, tags, version, uploaded_by, deep_links, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                "ast_01",
                "proj_nebula_01",
                "/Concept Art/Vehicles",
                "Aethel_Starcruiser_Blueprint_v3.png",
                "image",
                "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80",
                4200150,
                "[\"Aethel\", \"Starcruiser\", \"Blueprint\", \"Hero Ship\"]",
                "v3.2",
                "Tyler Vance",
                "[\"lore_02\", \"sc_101\"]",
                "2026-01-25T14:00:00Z"
            ],
        )?;

        conn.execute(
            "INSERT INTO assets (id, project_id, folder_path, filename, file_type, file_url, file_size_bytes, tags, version, uploaded_by, deep_links, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                "ast_02",
                "proj_nebula_01",
                "/Soundtracks/Stems",
                "Nebula_Main_Theme_Master_24bit.wav",
                "audio",
                "https://actions.google.com/sounds/v1/science_fiction/alien_beacon.ogg",
                18432000,
                "[\"Score\", \"OST\", \"Theme\"]",
                "v1.0",
                "Sofia Chen",
                "[\"snd_02\"]",
                "2026-02-01T09:30:00Z"
            ],
        )?;

        // 10. Soundboard Clips
        conn.execute(
            "INSERT INTO soundboard_clips (id, project_id, title, category, audio_url, duration_seconds, waveform_points, is_looping, volume, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                "snd_01",
                "proj_nebula_01",
                "Vance: All Crew Battle Stations",
                "Dialogue",
                "https://actions.google.com/sounds/v1/science_fiction/alien_breath.ogg",
                3.4,
                "[12, 28, 45, 62, 78, 60, 42, 25, 10]",
                false,
                0.9,
                "2026-02-02T10:00:00Z"
            ],
        )?;

        conn.execute(
            "INSERT INTO soundboard_clips (id, project_id, title, category, audio_url, duration_seconds, waveform_points, is_looping, volume, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                "snd_02",
                "proj_nebula_01",
                "Sub-light Warp Engine Hum",
                "Ambient",
                "https://actions.google.com/sounds/v1/science_fiction/humming_engine.ogg",
                15.0,
                "[30, 32, 35, 33, 31, 34, 32, 35, 30]",
                true,
                0.6,
                "2026-02-02T10:15:00Z"
            ],
        )?;

        conn.execute(
            "INSERT INTO soundboard_clips (id, project_id, title, category, audio_url, duration_seconds, waveform_points, is_looping, volume, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                "snd_03",
                "proj_nebula_01",
                "Airlock Decompression Pulse",
                "SFX",
                "https://actions.google.com/sounds/v1/science_fiction/airlock_door_open.ogg",
                4.2,
                "[5, 15, 85, 95, 70, 45, 20, 8, 2]",
                false,
                1.0,
                "2026-02-03T11:00:00Z"
            ],
        )?;

        // 11. Lore Articles
        let cards_01 = serde_json::to_string(&vec![
            serde_json::json!({ "key": "Government", "value": "Interstellar Coalition Council" }),
            serde_json::json!({ "key": "Capital", "value": "High Orbital Spire Olympus" }),
            serde_json::json!({ "key": "Military Arm", "value": "Recon Vanguard Fleet" }),
            serde_json::json!({ "key": "Status", "value": "Mobilized" }),
        ]).unwrap();

        let cards_02 = serde_json::to_string(&vec![
            serde_json::json!({ "key": "Ship Class", "value": "Mark IV Deep Recon" }),
            serde_json::json!({ "key": "Length", "value": "420 meters" }),
            serde_json::json!({ "key": "Crew Compliment", "value": "48 Officers & Specialists" }),
            serde_json::json!({ "key": "Propulsion", "value": "Ion-Graviton Dual Drive" }),
        ]).unwrap();

        conn.execute(
            "INSERT INTO lore_articles (id, project_id, title, category, emoji_icon, cover_image_url, summary, content_markdown, property_cards, tags, attached_asset_ids, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                "lore_01",
                "proj_nebula_01",
                "The Astraea Accord",
                "Faction",
                "🏛️",
                "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
                "The unified governing treaty binding Earth, Mars colonies, and the Outer Rim Mining Consortium.",
                "# The Astraea Accord\n\nRatified in 2188 following the Kuiper Skirmishes, the Accord established neutral transit corridors across the Sol system and founded the Joint Deep Recon Fleet.\n\n### Core Tenets\n- Universal scientific data sharing across member colonies.\n- Demilitarization of unmapped outer-belt jump gates.\n- Collective defense response against unknown extra-solar incursions.",
                cards_01,
                "[\"Accord\", \"Politics\", \"Treaty\", \"Lore\"]",
                "[\"ast_01\"]",
                "2026-02-05T12:00:00Z"
            ],
        )?;

        conn.execute(
            "INSERT INTO lore_articles (id, project_id, title, category, emoji_icon, cover_image_url, summary, content_markdown, property_cards, tags, attached_asset_ids, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                "lore_02",
                "proj_nebula_01",
                "Aethel-Class Long-Range Frigate",
                "Technology",
                "🚀",
                "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80",
                "A specialized reconnaissance vessel built to sustain autonomous three-year deployments into rift anomalies.",
                "# Aethel-Class Specifications\n\nEquipped with a reinforced titanium-carbyne hull and a dual graviton drive, the Aethel is the flagship vessel of the Expeditionary Arm.",
                cards_02,
                "[\"Ship\", \"Tech\", \"Aethel\"]",
                "[\"ast_01\"]",
                "2026-02-06T15:00:00Z"
            ],
        )?;

        // 12. Milestones
        conn.execute(
            "INSERT INTO milestones (id, project_id, phase, title, description, target_date, status, progress_pct)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                "ms_01",
                "proj_nebula_01",
                "Scripting & Writing",
                "Season 1 Episodes 1-3 Lock",
                "Final script lock, Fountain scene formatting, teleprompter read-throughs.",
                "2026-03-15",
                "completed",
                100
            ],
        )?;

        conn.execute(
            "INSERT INTO milestones (id, project_id, phase, title, description, target_date, status, progress_pct)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                "ms_02",
                "proj_nebula_01",
                "Casting & Table Reads",
                "Cast Voice Auditions & Character Signoffs",
                "Voice actor casting sessions for Vance, Elena, and Vector-7. Character dossiers completed.",
                "2026-04-01",
                "in_progress",
                85
            ],
        )?;

        conn.execute(
            "INSERT INTO milestones (id, project_id, phase, title, description, target_date, status, progress_pct)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                "ms_03",
                "proj_nebula_01",
                "Production & Principle Photography",
                "Storyboard Sequence & Shot Block Approval",
                "Shot-by-shot sequence animatics for derelict boarding action.",
                "2026-05-15",
                "in_progress",
                40
            ],
        )?;

        // 13. Team Members
        conn.execute(
            "INSERT INTO team_members (id, name, email, role_tier, studio_title, avatar_url, banner_url, bio, skill_tags, portfolio_url, timezone, working_hours, availability_status, availability_status_emoji, linked_character_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
            params![
                "user_tyler",
                "Tyler Vance",
                "tyler@fatgoats.studio",
                "Super Admin",
                "Showrunner & Director",
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80",
                "Creator of Nebula Chronicles. Oversees cinematic writing rooms, episodic pacing, and direct production pipeline.",
                "[\"Directing\", \"Screenwriting\", \"Worldbuilding\", \"Pipeline Management\"]",
                "https://fatgoats.studio/tyler",
                "America/New_York (UTC-5)",
                "09:00 - 18:00 EST",
                "Reviewing Episode 2 Boarding Animatics",
                "🎬",
                "char_vance"
            ],
        )?;

        conn.execute(
            "INSERT INTO team_members (id, name, email, role_tier, studio_title, avatar_url, banner_url, bio, skill_tags, portfolio_url, timezone, working_hours, availability_status, availability_status_emoji, linked_character_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
            params![
                "user_sofia",
                "Sofia Chen",
                "sofia@fatgoats.studio",
                "Admin",
                "Lead Writer & Science Consultant",
                "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80",
                "Astrophysics background turned narrative designer. Crafts hard sci-fi dialogue and franchise continuity bible.",
                "[\"Screenwriting\", \"Astrophysics\", \"Dialogue Polish\", \"Lore Design\"]",
                "https://fatgoats.studio/sofia",
                "America/Los_Angeles (UTC-8)",
                "08:00 - 17:00 PST",
                "In Writers Room Sprint",
                "✍️",
                "char_elena"
            ],
        )?;

        conn.execute(
            "INSERT INTO team_members (id, name, email, role_tier, studio_title, avatar_url, banner_url, bio, skill_tags, portfolio_url, timezone, working_hours, availability_status, availability_status_emoji, linked_character_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
            params![
                "user_marcus",
                "Marcus Holt",
                "marcus@fatgoats.studio",
                "Editor",
                "Lead Sound Designer & Foley Artist",
                "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80",
                "Composer and sound supervisor. Manages show soundboard, ambient acoustics, and voice actor auditions.",
                "[\"Audio Engineering\", \"Soundboard FX\", \"Foley\", \"Scoring\"]",
                "https://fatgoats.studio/marcus",
                "Europe/London (UTC+0)",
                "10:00 - 19:00 GMT",
                "Mastering Warp Resonance Stems",
                "🎧",
                "char_vector7"
            ],
        )?;

        // 14. Audit Logs
        conn.execute(
            "INSERT INTO audit_logs (id, project_id, user_id, user_name, action_type, entity_type, entity_title, details, timestamp)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                "log_01",
                "proj_nebula_01",
                "user_tyler",
                "Tyler Vance",
                "CREATE",
                "Project",
                "Nebula Chronicles",
                "Initialized workspace pipeline and registered initial season episodes.",
                "2026-01-15T00:00:00Z"
            ],
        )?;

        conn.execute(
            "INSERT INTO audit_logs (id, project_id, user_id, user_name, action_type, entity_type, entity_title, details, timestamp)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                "log_02",
                "proj_nebula_01",
                "user_sofia",
                "Sofia Chen",
                "UPDATE",
                "Scene",
                "EXT. DEEP SPACE RELAY - ORBITAL DAWN",
                "Updated Fountain script cues and verified character continuity links.",
                "2026-02-01T10:05:00Z"
            ],
        )?;

        // 15. Invite Codes
        conn.execute(
            "INSERT INTO invite_codes (id, code, role_tier, created_by, max_uses, times_used, expires_at, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                "inv_01",
                "FATGOATS-WRITERS-2026",
                "Editor",
                "user_tyler",
                10,
                2,
                "2027-01-01T00:00:00Z",
                "2026-01-20T00:00:00Z"
            ],
        )?;

        // 16. System Settings
        conn.execute(
            "INSERT INTO system_settings (key, value) VALUES (?1, ?2)",
            params!["studio_name", "FatGoats Studios Creative Suite"],
        )?;
        conn.execute(
            "INSERT INTO system_settings (key, value) VALUES (?1, ?2)",
            params!["storage_path", "./vault_storage"],
        )?;
        conn.execute(
            "INSERT INTO system_settings (key, value) VALUES (?1, ?2)",
            params!["backup_frequency", "Every 6 Hours"],
        )?;
        conn.execute(
            "INSERT INTO system_settings (key, value) VALUES (?1, ?2)",
            params!["theme_mode", "dark"],
        )?;
        conn.execute(
            "INSERT INTO system_settings (key, value) VALUES (?1, ?2)",
            params!["is_setup_completed", "true"],
        )?;

        println!("Database seeded successfully!");
        Ok(())
    }

    pub fn get_full_state(&self) -> Result<FullStudioState> {
        let conn = self.conn.lock().unwrap();

        // 1. Projects
        let mut stmt = conn.prepare("SELECT id, title, description, logo_url, created_at, status, target_release, season_count, active FROM projects")?;
        let projects = stmt.query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                logo_url: row.get(3)?,
                created_at: row.get(4)?,
                status: row.get(5)?,
                target_release: row.get(6)?,
                season_count: row.get(7)?,
                active: row.get(8)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        // 2. Episodes
        let mut stmt = conn.prepare("SELECT id, project_id, season_number, episode_number, title, synopsis, runtime_mins, status, progress_pct FROM episodes")?;
        let episodes = stmt.query_map([], |row| {
            Ok(Episode {
                id: row.get(0)?,
                project_id: row.get(1)?,
                season_number: row.get(2)?,
                episode_number: row.get(3)?,
                title: row.get(4)?,
                synopsis: row.get(5)?,
                runtime_mins: row.get(6)?,
                status: row.get(7)?,
                progress_pct: row.get(8)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        // 3. Scenes
        let mut stmt = conn.prepare("SELECT id, project_id, episode_id, scene_number, slugline, content, synopsis, locked_until, is_spoiler, location, time_of_day, page_length, voice_memo_url, voice_memo_duration, created_at FROM scenes")?;
        let scenes = stmt.query_map([], |row| {
            Ok(Scene {
                id: row.get(0)?,
                project_id: row.get(1)?,
                episode_id: row.get(2)?,
                scene_number: row.get(3)?,
                slugline: row.get(4)?,
                content: row.get(5)?,
                synopsis: row.get(6)?,
                locked_until: row.get(7)?,
                is_spoiler: row.get(8)?,
                location: row.get(9)?,
                time_of_day: row.get(10)?,
                page_length: row.get(11)?,
                voice_memo_url: row.get(12)?,
                voice_memo_duration: row.get(13)?,
                created_at: row.get(14)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        // 4. Characters
        let mut stmt = conn.prepare("SELECT id, project_id, name, role, age, actor_name, linked_user_id, backstory, personality_traits, avatar_url, gallery_images, voice_clips, created_at FROM characters")?;
        let characters = stmt.query_map([], |row| {
            let traits_str: String = row.get(8)?;
            let traits: Vec<String> = serde_json::from_str(&traits_str).unwrap_or_default();
            let gallery_str: String = row.get(10)?;
            let gallery: serde_json::Value = serde_json::from_str(&gallery_str).unwrap_or(serde_json::json!([]));
            let voice_str: String = row.get(11)?;
            let voice: serde_json::Value = serde_json::from_str(&voice_str).unwrap_or(serde_json::json!([]));

            Ok(Character {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                role: row.get(3)?,
                age: row.get(4)?,
                actor_name: row.get(5)?,
                linked_user_id: row.get(6)?,
                backstory: row.get(7)?,
                personality_traits: traits,
                avatar_url: row.get(9)?,
                gallery_images: gallery,
                voice_clips: voice,
                created_at: row.get(12)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        // 5. Storyboard Frames
        let mut stmt = conn.prepare("SELECT id, project_id, episode_id, scene_id, sequence_index, image_url, camera_framing, camera_movement, dialogue_text, director_notes, sound_effects, duration_seconds FROM storyboard_frames ORDER BY sequence_index ASC")?;
        let storyboard_frames = stmt.query_map([], |row| {
            Ok(StoryboardFrame {
                id: row.get(0)?,
                project_id: row.get(1)?,
                episode_id: row.get(2)?,
                scene_id: row.get(3)?,
                sequence_index: row.get(4)?,
                image_url: row.get(5)?,
                camera_framing: row.get(6)?,
                camera_movement: row.get(7)?,
                dialogue_text: row.get(8)?,
                director_notes: row.get(9)?,
                sound_effects: row.get(10)?,
                duration_seconds: row.get(11)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        // 6. Whiteboards
        let mut stmt = conn.prepare("SELECT id, project_id, title, category, is_pinned, is_locked, nodes, edges, created_at FROM whiteboards")?;
        let whiteboards = stmt.query_map([], |row| {
            let nodes_str: String = row.get(6)?;
            let nodes: Vec<WhiteboardNode> = serde_json::from_str(&nodes_str).unwrap_or_default();
            let edges_str: String = row.get(7)?;
            let edges: Vec<WhiteboardEdge> = serde_json::from_str(&edges_str).unwrap_or_default();

            Ok(Whiteboard {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                category: row.get(3)?,
                is_pinned: row.get(4)?,
                is_locked: row.get(5)?,
                nodes,
                edges,
                created_at: row.get(8)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        // 7. Chat Messages
        let mut stmt = conn.prepare("SELECT id, project_id, channel_id, sender_id, sender_name, sender_avatar, content, message_type, voice_note_url, voice_note_duration, script_snippet_data, whiteboard_pin_data, poll_data, soundboard_clip_data, scheduled_at, is_starred, read_by, created_at FROM chat_messages ORDER BY created_at ASC")?;
        let chat_messages = stmt.query_map([], |row| {
            let snippet_str: Option<String> = row.get(10)?;
            let snippet = snippet_str.and_then(|s| serde_json::from_str(&s).ok());
            let pin_str: Option<String> = row.get(11)?;
            let pin = pin_str.and_then(|s| serde_json::from_str(&s).ok());
            let poll_str: Option<String> = row.get(12)?;
            let poll = poll_str.and_then(|s| serde_json::from_str(&s).ok());
            let sound_str: Option<String> = row.get(13)?;
            let sound = sound_str.and_then(|s| serde_json::from_str(&s).ok());
            let read_by_str: String = row.get(16)?;
            let read_by: Vec<String> = serde_json::from_str(&read_by_str).unwrap_or_default();

            Ok(ChatMessage {
                id: row.get(0)?,
                project_id: row.get(1)?,
                channel_id: row.get(2)?,
                sender_id: row.get(3)?,
                sender_name: row.get(4)?,
                sender_avatar: row.get(5)?,
                content: row.get(6)?,
                message_type: row.get(7)?,
                voice_note_url: row.get(8)?,
                voice_note_duration: row.get(9)?,
                script_snippet_data: snippet,
                whiteboard_pin_data: pin,
                poll_data: poll,
                soundboard_clip_data: sound,
                scheduled_at: row.get(14)?,
                is_starred: row.get(15)?,
                read_by,
                created_at: row.get(17)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        // 8. Kanban Tasks
        let mut stmt = conn.prepare("SELECT id, project_id, episode_id, column_id, title, description, priority, due_date, assignee_id, assignee_name, tagged_character_ids, labels, created_at FROM kanban_tasks")?;
        let kanban_tasks = stmt.query_map([], |row| {
            let chars_str: String = row.get(10)?;
            let tagged_character_ids: Vec<String> = serde_json::from_str(&chars_str).unwrap_or_default();
            let labels_str: String = row.get(11)?;
            let labels: Vec<String> = serde_json::from_str(&labels_str).unwrap_or_default();

            Ok(KanbanTask {
                id: row.get(0)?,
                project_id: row.get(1)?,
                episode_id: row.get(2)?,
                column_id: row.get(3)?,
                title: row.get(4)?,
                description: row.get(5)?,
                priority: row.get(6)?,
                due_date: row.get(7)?,
                assignee_id: row.get(8)?,
                assignee_name: row.get(9)?,
                tagged_character_ids,
                labels,
                created_at: row.get(12)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        // 9. Assets
        let mut stmt = conn.prepare("SELECT id, project_id, folder_path, filename, file_type, file_url, file_size_bytes, tags, version, uploaded_by, deep_links, created_at FROM assets")?;
        let assets = stmt.query_map([], |row| {
            let tags_str: String = row.get(7)?;
            let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
            let links_str: String = row.get(10)?;
            let deep_links: Vec<String> = serde_json::from_str(&links_str).unwrap_or_default();

            Ok(AssetVaultItem {
                id: row.get(0)?,
                project_id: row.get(1)?,
                folder_path: row.get(2)?,
                filename: row.get(3)?,
                file_type: row.get(4)?,
                file_url: row.get(5)?,
                file_size_bytes: row.get(6)?,
                tags,
                version: row.get(8)?,
                uploaded_by: row.get(9)?,
                deep_links,
                created_at: row.get(11)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        // 10. Soundboard Clips
        let mut stmt = conn.prepare("SELECT id, project_id, title, category, audio_url, duration_seconds, waveform_points, is_looping, volume, created_at FROM soundboard_clips")?;
        let soundboard_clips = stmt.query_map([], |row| {
            let wf_str: String = row.get(6)?;
            let waveform_points: Vec<f64> = serde_json::from_str(&wf_str).unwrap_or_default();

            Ok(SoundboardClip {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                category: row.get(3)?,
                audio_url: row.get(4)?,
                duration_seconds: row.get(5)?,
                waveform_points,
                is_looping: row.get(7)?,
                volume: row.get(8)?,
                created_at: row.get(9)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        // 11. Lore Articles
        let mut stmt = conn.prepare("SELECT id, project_id, title, category, emoji_icon, cover_image_url, summary, content_markdown, property_cards, tags, attached_asset_ids, updated_at FROM lore_articles")?;
        let lore_articles = stmt.query_map([], |row| {
            let props_str: String = row.get(8)?;
            let property_cards: Vec<LorePropertyCard> = serde_json::from_str(&props_str).unwrap_or_default();
            let tags_str: String = row.get(9)?;
            let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
            let assets_str: String = row.get(10)?;
            let attached_asset_ids: Vec<String> = serde_json::from_str(&assets_str).unwrap_or_default();

            Ok(LoreArticle {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                category: row.get(3)?,
                emoji_icon: row.get(4)?,
                cover_image_url: row.get(5)?,
                summary: row.get(6)?,
                content_markdown: row.get(7)?,
                property_cards,
                tags,
                attached_asset_ids,
                updated_at: row.get(11)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        // 12. Milestones
        let mut stmt = conn.prepare("SELECT id, project_id, phase, title, description, target_date, status, progress_pct FROM milestones")?;
        let milestones = stmt.query_map([], |row| {
            Ok(Milestone {
                id: row.get(0)?,
                project_id: row.get(1)?,
                phase: row.get(2)?,
                title: row.get(3)?,
                description: row.get(4)?,
                target_date: row.get(5)?,
                status: row.get(6)?,
                progress_pct: row.get(7)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        // 13. Team Members
        let mut stmt = conn.prepare("SELECT id, name, email, role_tier, studio_title, avatar_url, banner_url, bio, skill_tags, portfolio_url, timezone, working_hours, availability_status, availability_status_emoji, linked_character_id FROM team_members")?;
        let team_members = stmt.query_map([], |row| {
            let skills_str: String = row.get(8)?;
            let skill_tags: Vec<String> = serde_json::from_str(&skills_str).unwrap_or_default();

            Ok(TeamMember {
                id: row.get(0)?,
                name: row.get(1)?,
                email: row.get(2)?,
                role_tier: row.get(3)?,
                studio_title: row.get(4)?,
                avatar_url: row.get(5)?,
                banner_url: row.get(6)?,
                bio: row.get(7)?,
                skill_tags,
                portfolio_url: row.get(9)?,
                timezone: row.get(10)?,
                working_hours: row.get(11)?,
                availability_status: row.get(12)?,
                availability_status_emoji: row.get(13)?,
                linked_character_id: row.get(14)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        // 14. Audit Logs
        let mut stmt = conn.prepare("SELECT id, project_id, user_id, user_name, action_type, entity_type, entity_title, details, timestamp FROM audit_logs ORDER BY timestamp DESC LIMIT 100")?;
        let audit_logs = stmt.query_map([], |row| {
            Ok(AuditLog {
                id: row.get(0)?,
                project_id: row.get(1)?,
                user_id: row.get(2)?,
                user_name: row.get(3)?,
                action_type: row.get(4)?,
                entity_type: row.get(5)?,
                entity_title: row.get(6)?,
                details: row.get(7)?,
                timestamp: row.get(8)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        // 15. Invite Codes
        let mut stmt = conn.prepare("SELECT id, code, role_tier, created_by, max_uses, times_used, expires_at, created_at FROM invite_codes")?;
        let invite_codes = stmt.query_map([], |row| {
            Ok(InviteCode {
                id: row.get(0)?,
                code: row.get(1)?,
                role_tier: row.get(2)?,
                created_by: row.get(3)?,
                max_uses: row.get(4)?,
                times_used: row.get(5)?,
                expires_at: row.get(6)?,
                created_at: row.get(7)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        // 16. System Settings
        let mut stmt = conn.prepare("SELECT key, value FROM system_settings")?;
        let mut studio_name = "FatGoats Studios".to_string();
        let mut storage_path = "./vault_storage".to_string();
        let mut backup_frequency = "Every 6 Hours".to_string();
        let mut theme_mode = "dark".to_string();
        let mut is_setup_completed = true;

        let rows = stmt.query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))?;
        for row in rows.flatten() {
            match row.0.as_str() {
                "studio_name" => studio_name = row.1,
                "storage_path" => storage_path = row.1,
                "backup_frequency" => backup_frequency = row.1,
                "theme_mode" => theme_mode = row.1,
                "is_setup_completed" => is_setup_completed = row.1 == "true",
                _ => {}
            }
        }

        let system_settings = SystemSettings {
            studio_name,
            storage_path,
            backup_frequency,
            theme_mode,
            is_setup_completed,
        };

        Ok(FullStudioState {
            projects,
            episodes,
            scenes,
            characters,
            storyboard_frames,
            whiteboards,
            chat_messages,
            kanban_tasks,
            assets,
            soundboard_clips,
            lore_articles,
            milestones,
            team_members,
            audit_logs,
            invite_codes,
            system_settings,
        })
    }

    pub fn save_state(&self, state: &FullStudioState) -> Result<()> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        // Clean tables and restore from state
        tx.execute("DELETE FROM projects", [])?;
        for p in &state.projects {
            tx.execute(
                "INSERT INTO projects (id, title, description, logo_url, created_at, status, target_release, season_count, active)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![p.id, p.title, p.description, p.logo_url, p.created_at, p.status, p.target_release, p.season_count, p.active],
            )?;
        }

        tx.execute("DELETE FROM episodes", [])?;
        for ep in &state.episodes {
            tx.execute(
                "INSERT INTO episodes (id, project_id, season_number, episode_number, title, synopsis, runtime_mins, status, progress_pct)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![ep.id, ep.project_id, ep.season_number, ep.episode_number, ep.title, ep.synopsis, ep.runtime_mins, ep.status, ep.progress_pct],
            )?;
        }

        tx.execute("DELETE FROM scenes", [])?;
        for s in &state.scenes {
            tx.execute(
                "INSERT INTO scenes (id, project_id, episode_id, scene_number, slugline, content, synopsis, locked_until, is_spoiler, location, time_of_day, page_length, voice_memo_url, voice_memo_duration, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
                params![s.id, s.project_id, s.episode_id, s.scene_number, s.slugline, s.content, s.synopsis, s.locked_until, s.is_spoiler, s.location, s.time_of_day, s.page_length, s.voice_memo_url, s.voice_memo_duration, s.created_at],
            )?;
        }

        tx.execute("DELETE FROM characters", [])?;
        for c in &state.characters {
            let traits = serde_json::to_string(&c.personality_traits).unwrap_or_else(|_| "[]".to_string());
            let gallery = serde_json::to_string(&c.gallery_images).unwrap_or_else(|_| "[]".to_string());
            let voice = serde_json::to_string(&c.voice_clips).unwrap_or_else(|_| "[]".to_string());
            tx.execute(
                "INSERT INTO characters (id, project_id, name, role, age, actor_name, linked_user_id, backstory, personality_traits, avatar_url, gallery_images, voice_clips, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
                params![c.id, c.project_id, c.name, c.role, c.age, c.actor_name, c.linked_user_id, c.backstory, traits, c.avatar_url, gallery, voice, c.created_at],
            )?;
        }

        tx.execute("DELETE FROM storyboard_frames", [])?;
        for sb in &state.storyboard_frames {
            tx.execute(
                "INSERT INTO storyboard_frames (id, project_id, episode_id, scene_id, sequence_index, image_url, camera_framing, camera_movement, dialogue_text, director_notes, sound_effects, duration_seconds)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                params![sb.id, sb.project_id, sb.episode_id, sb.scene_id, sb.sequence_index, sb.image_url, sb.camera_framing, sb.camera_movement, sb.dialogue_text, sb.director_notes, sb.sound_effects, sb.duration_seconds],
            )?;
        }

        tx.execute("DELETE FROM whiteboards", [])?;
        for wb in &state.whiteboards {
            let nodes = serde_json::to_string(&wb.nodes).unwrap_or_else(|_| "[]".to_string());
            let edges = serde_json::to_string(&wb.edges).unwrap_or_else(|_| "[]".to_string());
            tx.execute(
                "INSERT INTO whiteboards (id, project_id, title, category, is_pinned, is_locked, nodes, edges, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![wb.id, wb.project_id, wb.title, wb.category, wb.is_pinned, wb.is_locked, nodes, edges, wb.created_at],
            )?;
        }

        tx.execute("DELETE FROM chat_messages", [])?;
        for msg in &state.chat_messages {
            let snippet = msg.script_snippet_data.as_ref().map(|v| serde_json::to_string(v).unwrap_or_default());
            let pin = msg.whiteboard_pin_data.as_ref().map(|v| serde_json::to_string(v).unwrap_or_default());
            let poll = msg.poll_data.as_ref().map(|v| serde_json::to_string(v).unwrap_or_default());
            let sound = msg.soundboard_clip_data.as_ref().map(|v| serde_json::to_string(v).unwrap_or_default());
            let read_by = serde_json::to_string(&msg.read_by).unwrap_or_else(|_| "[]".to_string());

            tx.execute(
                "INSERT INTO chat_messages (id, project_id, channel_id, sender_id, sender_name, sender_avatar, content, message_type, voice_note_url, voice_note_duration, script_snippet_data, whiteboard_pin_data, poll_data, soundboard_clip_data, scheduled_at, is_starred, read_by, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
                params![msg.id, msg.project_id, msg.channel_id, msg.sender_id, msg.sender_name, msg.sender_avatar, msg.content, msg.message_type, msg.voice_note_url, msg.voice_note_duration, snippet, pin, poll, sound, msg.scheduled_at, msg.is_starred, read_by, msg.created_at],
            )?;
        }

        tx.execute("DELETE FROM kanban_tasks", [])?;
        for task in &state.kanban_tasks {
            let chars = serde_json::to_string(&task.tagged_character_ids).unwrap_or_else(|_| "[]".to_string());
            let labels = serde_json::to_string(&task.labels).unwrap_or_else(|_| "[]".to_string());
            tx.execute(
                "INSERT INTO kanban_tasks (id, project_id, episode_id, column_id, title, description, priority, due_date, assignee_id, assignee_name, tagged_character_ids, labels, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
                params![task.id, task.project_id, task.episode_id, task.column_id, task.title, task.description, task.priority, task.due_date, task.assignee_id, task.assignee_name, chars, labels, task.created_at],
            )?;
        }

        tx.execute("DELETE FROM assets", [])?;
        for ast in &state.assets {
            let tags = serde_json::to_string(&ast.tags).unwrap_or_else(|_| "[]".to_string());
            let deep_links = serde_json::to_string(&ast.deep_links).unwrap_or_else(|_| "[]".to_string());
            tx.execute(
                "INSERT INTO assets (id, project_id, folder_path, filename, file_type, file_url, file_size_bytes, tags, version, uploaded_by, deep_links, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                params![ast.id, ast.project_id, ast.folder_path, ast.filename, ast.file_type, ast.file_url, ast.file_size_bytes, tags, ast.version, ast.uploaded_by, deep_links, ast.created_at],
            )?;
        }

        tx.execute("DELETE FROM soundboard_clips", [])?;
        for snd in &state.soundboard_clips {
            let wf = serde_json::to_string(&snd.waveform_points).unwrap_or_else(|_| "[]".to_string());
            tx.execute(
                "INSERT INTO soundboard_clips (id, project_id, title, category, audio_url, duration_seconds, waveform_points, is_looping, volume, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![snd.id, snd.project_id, snd.title, snd.category, snd.audio_url, snd.duration_seconds, wf, snd.is_looping, snd.volume, snd.created_at],
            )?;
        }

        tx.execute("DELETE FROM lore_articles", [])?;
        for lore in &state.lore_articles {
            let props = serde_json::to_string(&lore.property_cards).unwrap_or_else(|_| "[]".to_string());
            let tags = serde_json::to_string(&lore.tags).unwrap_or_else(|_| "[]".to_string());
            let assets = serde_json::to_string(&lore.attached_asset_ids).unwrap_or_else(|_| "[]".to_string());
            tx.execute(
                "INSERT INTO lore_articles (id, project_id, title, category, emoji_icon, cover_image_url, summary, content_markdown, property_cards, tags, attached_asset_ids, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                params![lore.id, lore.project_id, lore.title, lore.category, lore.emoji_icon, lore.cover_image_url, lore.summary, lore.content_markdown, props, tags, assets, lore.updated_at],
            )?;
        }

        tx.execute("DELETE FROM milestones", [])?;
        for ms in &state.milestones {
            tx.execute(
                "INSERT INTO milestones (id, project_id, phase, title, description, target_date, status, progress_pct)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![ms.id, ms.project_id, ms.phase, ms.title, ms.description, ms.target_date, ms.status, ms.progress_pct],
            )?;
        }

        tx.execute("DELETE FROM team_members", [])?;
        for tm in &state.team_members {
            let skills = serde_json::to_string(&tm.skill_tags).unwrap_or_else(|_| "[]".to_string());
            tx.execute(
                "INSERT INTO team_members (id, name, email, role_tier, studio_title, avatar_url, banner_url, bio, skill_tags, portfolio_url, timezone, working_hours, availability_status, availability_status_emoji, linked_character_id)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
                params![tm.id, tm.name, tm.email, tm.role_tier, tm.studio_title, tm.avatar_url, tm.banner_url, tm.bio, skills, tm.portfolio_url, tm.timezone, tm.working_hours, tm.availability_status, tm.availability_status_emoji, tm.linked_character_id],
            )?;
        }

        tx.execute("DELETE FROM invite_codes", [])?;
        for inv in &state.invite_codes {
            tx.execute(
                "INSERT INTO invite_codes (id, code, role_tier, created_by, max_uses, times_used, expires_at, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![inv.id, inv.code, inv.role_tier, inv.created_by, inv.max_uses, inv.times_used, inv.expires_at, inv.created_at],
            )?;
        }

        tx.execute("DELETE FROM system_settings", [])?;
        tx.execute("INSERT INTO system_settings (key, value) VALUES (?1, ?2)", params!["studio_name", state.system_settings.studio_name])?;
        tx.execute("INSERT INTO system_settings (key, value) VALUES (?1, ?2)", params!["storage_path", state.system_settings.storage_path])?;
        tx.execute("INSERT INTO system_settings (key, value) VALUES (?1, ?2)", params!["backup_frequency", state.system_settings.backup_frequency])?;
        tx.execute("INSERT INTO system_settings (key, value) VALUES (?1, ?2)", params!["theme_mode", state.system_settings.theme_mode])?;
        tx.execute("INSERT INTO system_settings (key, value) VALUES (?1, ?2)", params!["is_setup_completed", if state.system_settings.is_setup_completed { "true" } else { "false" }])?;

        tx.commit()?;
        Ok(())
    }

    pub fn insert_chat_message(&self, msg: &ChatMessage) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let snippet = msg.script_snippet_data.as_ref().map(|v| serde_json::to_string(v).unwrap_or_default());
        let pin = msg.whiteboard_pin_data.as_ref().map(|v| serde_json::to_string(v).unwrap_or_default());
        let poll = msg.poll_data.as_ref().map(|v| serde_json::to_string(v).unwrap_or_default());
        let sound = msg.soundboard_clip_data.as_ref().map(|v| serde_json::to_string(v).unwrap_or_default());
        let read_by = serde_json::to_string(&msg.read_by).unwrap_or_else(|_| "[]".to_string());

        conn.execute(
            "INSERT INTO chat_messages (id, project_id, channel_id, sender_id, sender_name, sender_avatar, content, message_type, voice_note_url, voice_note_duration, script_snippet_data, whiteboard_pin_data, poll_data, soundboard_clip_data, scheduled_at, is_starred, read_by, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
            params![msg.id, msg.project_id, msg.channel_id, msg.sender_id, msg.sender_name, msg.sender_avatar, msg.content, msg.message_type, msg.voice_note_url, msg.voice_note_duration, snippet, pin, poll, sound, msg.scheduled_at, msg.is_starred, read_by, msg.created_at],
        )?;

        Ok(())
    }

    pub fn insert_audit_log(&self, log: &AuditLog) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO audit_logs (id, project_id, user_id, user_name, action_type, entity_type, entity_title, details, timestamp)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![log.id, log.project_id, log.user_id, log.user_name, log.action_type, log.entity_type, log.entity_title, log.details, log.timestamp],
        )?;
        Ok(())
    }
}
