import React, { useState, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Mic,
  Square,
  FileText,
  MapPin,
  BarChart2,
  Radio,
  Star,
  CheckCheck,
  Plus,
  Play,
  Volume2,
  Clock,
} from 'lucide-react';
import { ChatMessage, PollOption, StudioDatabaseState, TeamMember } from '../types';
import { ApiService } from '../services/api';

interface CommunicationHubProps {
  state: StudioDatabaseState;
  currentUser: TeamMember;
  onNavigateToWhiteboard?: (boardId: string, x: number, y: number) => void;
  onNavigateToScene?: (sceneSlug: string) => void;
}

export const CommunicationHub: React.FC<CommunicationHubProps> = ({
  state,
  currentUser,
  onNavigateToWhiteboard,
  onNavigateToScene,
}) => {
  const [activeChannel, setActiveChannel] = useState('writers-room');
  const [messageInput, setMessageInput] = useState('');
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  // Voice note recording in chat
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const channels = [
    { id: 'writers-room', name: '#writers-room', desc: 'Screenplay drafting, dialogue polish, and table reads' },
    { id: 'animation', name: '#animation-vfx', desc: '3D assets, lighting passes, and visual animatics' },
    { id: 'sound', name: '#sound-foley', desc: 'Soundboard drops, music cues, and voice takes' },
    { id: 'general', name: '#general-studio', desc: 'All-studio announcements and milestones' },
  ];

  const channelMessages = state.chat_messages
    .filter((m) => m.channel_id === activeChannel)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  // Post standard text message
  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      project_id: state.projects[0]?.id || 'proj_nebula_01',
      channel_id: activeChannel,
      sender_id: currentUser.id,
      sender_name: currentUser.name,
      sender_avatar: currentUser.avatar_url,
      content: messageInput.trim(),
      message_type: 'text',
      is_starred: false,
      read_by: [currentUser.id],
      created_at: new Date().toISOString(),
    };

    setMessageInput('');
    await ApiService.postChatMessage(newMsg);
  };

  // Voice note recording
  const startRecordingVoiceNote = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);

        const newMsg: ChatMessage = {
          id: `msg_${Date.now()}`,
          project_id: state.projects[0]?.id || 'proj_nebula_01',
          channel_id: activeChannel,
          sender_id: currentUser.id,
          sender_name: currentUser.name,
          sender_avatar: currentUser.avatar_url,
          content: 'Voice Note Dispatch',
          message_type: 'voice_note',
          voice_note_url: url,
          voice_note_duration: 6.0,
          is_starred: false,
          read_by: [currentUser.id],
          created_at: new Date().toISOString(),
        };

        await ApiService.postChatMessage(newMsg);
      };

      recorder.start();
      setIsRecordingVoice(true);
    } catch {
      alert('Microphone access is not supported or was denied in this environment.');
    }
  };

  const stopRecordingVoiceNote = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
    }
  };

  // Create team poll
  const handleCreatePoll = async () => {
    if (!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2) return;

    const options: PollOption[] = pollOptions
      .filter((o) => o.trim())
      .map((text, idx) => ({
        id: `opt_${idx}`,
        text: text.trim(),
        votes: [],
      }));

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      project_id: state.projects[0]?.id || 'proj_nebula_01',
      channel_id: activeChannel,
      sender_id: currentUser.id,
      sender_name: currentUser.name,
      sender_avatar: currentUser.avatar_url,
      content: pollQuestion.trim(),
      message_type: 'poll',
      poll_data: {
        question: pollQuestion.trim(),
        options,
      },
      is_starred: false,
      read_by: [currentUser.id],
      created_at: new Date().toISOString(),
    };

    setShowPollModal(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    await ApiService.postChatMessage(newMsg);
  };

  // Vote on interactive poll
  const handleVotePoll = async (msg: ChatMessage, optionId: string) => {
    if (!msg.poll_data) return;

    const updatedOptions = msg.poll_data.options.map((opt) => {
      const hasVoted = opt.votes.includes(currentUser.id);
      if (opt.id === optionId) {
        return {
          ...opt,
          votes: hasVoted ? opt.votes.filter((uid) => uid !== currentUser.id) : [...opt.votes, currentUser.id],
        };
      } else {
        return {
          ...opt,
          votes: opt.votes.filter((uid) => uid !== currentUser.id),
        };
      }
    });

    const updatedMsg: ChatMessage = {
      ...msg,
      poll_data: {
        ...msg.poll_data,
        options: updatedOptions,
      },
    };

    await ApiService.postChatMessage(updatedMsg);
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#101217] border border-white/5 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#151820] text-slate-400 border border-white/5">
            <MessageSquare size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">Studio communication</h2>
            <p className="text-xs text-slate-400 mt-0.5">Real-time studio chat, screenplay snippets, and voice notes</p>
          </div>
        </div>

        <button
          onClick={() => setShowPollModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151820] hover:bg-[#1a1e28] border border-white/10 text-xs font-medium text-slate-200 transition-colors"
        >
          <BarChart2 size={13} className="text-amber-400" />
          <span>Launch poll</span>
        </button>
      </div>

      {/* Main Chat Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Column: Channels & Direct Messages */}
        <div className="bg-[#101217] border border-white/5 rounded-xl p-3.5 lg:col-span-1 space-y-4">
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2 px-1">Department channels</p>
            <div className="space-y-1">
              {channels.map((ch) => {
                const isSel = activeChannel === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChannel(ch.id)}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex flex-col border ${
                      isSel
                        ? 'bg-[#1a1e28] border-l-2 border-l-amber-500 border-white/10 text-white font-medium'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent'
                    }`}
                  >
                    <span>{ch.name}</span>
                    <span className="text-[10px] text-slate-500 truncate mt-0.5 font-normal">
                      {ch.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-white/5">
            <p className="text-xs font-medium text-slate-400 mb-2 px-1">Crew members</p>
            <div className="space-y-1">
              {state.team_members.map((member) => (
                <div key={member.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 text-xs transition-colors">
                  <span className="text-sm">{member.availability_status_emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-200 truncate">{member.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{member.studio_title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center & Right: Active Channel Chat Stream */}
        <div className="bg-[#101217] border border-white/5 rounded-xl p-4 lg:col-span-3 flex flex-col justify-between h-[650px]">
          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-2">
            {channelMessages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-2.5 group">
                <img
                  src={msg.sender_avatar}
                  alt={msg.sender_name}
                  className="w-7 h-7 rounded-full object-cover border border-white/10 mt-0.5 shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-white">{msg.sender_name}</span>
                    <span className="text-[10px] text-slate-500 font-mono tabular-nums">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.is_starred && <Star size={11} className="text-amber-400 fill-amber-400" />}
                  </div>

                  {/* Standard Text Message */}
                  {msg.message_type === 'text' && (
                    <p className="text-xs text-slate-200 leading-relaxed bg-[#0a0b0e] p-2.5 rounded-lg border border-white/5 inline-block max-w-xl">
                      {msg.content}
                    </p>
                  )}

                  {/* Voice Note Message */}
                  {msg.message_type === 'voice_note' && msg.voice_note_url && (
                    <div className="p-2.5 rounded-lg bg-[#0a0b0e] border border-white/10 flex items-center gap-2.5 inline-flex">
                      <Volume2 size={15} className="text-amber-400 shrink-0" />
                      <audio src={msg.voice_note_url} controls className="h-7 w-52" />
                    </div>
                  )}

                  {/* Screenplay Snippet Message */}
                  {msg.message_type === 'script_snippet' && msg.script_snippet_data && (
                    <div className="p-3.5 rounded-lg bg-[#0a0b0e] border border-white/10 max-w-xl space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 border-b border-white/5 pb-1.5">
                        <span className="font-medium flex items-center gap-1.5">
                          <FileText size={13} className="text-amber-400" />
                          <span>{msg.script_snippet_data.sceneSlug}</span>
                        </span>
                      </div>
                      <p className="font-screenplay text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {msg.script_snippet_data.scriptText}
                      </p>
                    </div>
                  )}

                  {/* Interactive Poll Message */}
                  {msg.message_type === 'poll' && msg.poll_data && (
                    <div className="p-3.5 rounded-lg bg-[#0a0b0e] border border-white/10 max-w-md space-y-2.5">
                      <div className="flex items-center gap-2">
                        <BarChart2 size={14} className="text-amber-400" />
                        <h4 className="text-xs font-medium text-white">{msg.poll_data.question}</h4>
                      </div>
                      <div className="space-y-1.5">
                        {msg.poll_data.options.map((opt) => {
                          const totalVotes = msg.poll_data!.options.reduce((acc, o) => acc + o.votes.length, 0);
                          const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                          const hasMyVote = opt.votes.includes(currentUser.id);

                          return (
                            <button
                              key={opt.id}
                              onClick={() => handleVotePoll(msg, opt.id)}
                              className={`w-full text-left p-2 rounded-lg border text-xs transition-colors relative overflow-hidden ${
                                hasMyVote
                                  ? 'border-amber-500/40 bg-amber-500/10'
                                  : 'border-white/5 bg-[#151820] hover:border-white/15'
                              }`}
                            >
                              <div
                                className="absolute top-0 bottom-0 left-0 bg-amber-500/15 transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                              <div className="relative flex items-center justify-between z-10">
                                <span className="font-medium text-slate-200">{opt.text}</span>
                                <span className="font-mono text-[10px] text-amber-400 tabular-nums">
                                  {pct}% ({opt.votes.length})
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Soundboard Audio Drop */}
                  {msg.message_type === 'soundboard_clip' && msg.soundboard_clip_data && (
                    <div className="p-2.5 rounded-lg bg-[#0a0b0e] border border-white/10 flex items-center gap-2.5 inline-flex">
                      <Radio size={15} className="text-amber-400 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-white">{msg.soundboard_clip_data.title}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{msg.soundboard_clip_data.category} audio drop</p>
                      </div>
                      <audio src={msg.soundboard_clip_data.audioUrl} controls className="h-7 w-48 ml-2" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Chat Input Bar */}
          <div className="pt-3 border-t border-white/5">
            <div className="flex items-center gap-2 bg-[#0a0b0e] border border-white/10 focus-within:border-white/20 rounded-xl px-3 py-2 transition-colors">
              <input
                type="text"
                placeholder={`Message #${activeChannel}...`}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 outline-none"
              />

              {isRecordingVoice ? (
                <button
                  onClick={stopRecordingVoiceNote}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors"
                  title="Stop and send voice note"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  <Square size={12} />
                  <span>Send</span>
                </button>
              ) : (
                <button
                  onClick={startRecordingVoiceNote}
                  className="p-1.5 text-slate-400 hover:text-white transition-colors"
                  title="Record voice note"
                >
                  <Mic size={15} />
                </button>
              )}

              <button
                onClick={handleSendMessage}
                disabled={!messageInput.trim()}
                className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-medium transition-colors"
                title="Send message"
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Launch Team Poll Modal */}
      {showPollModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#101217] border border-white/10 rounded-xl p-5 max-w-md w-full space-y-4">
            <h3 className="text-sm font-semibold text-white">Create team decision poll</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400">Poll question:</label>
                <input
                  type="text"
                  placeholder="e.g. Should Vance sacrifice the relay array in Ep 3?"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  className="w-full bg-[#151820] border border-white/10 rounded-lg p-2 text-xs text-white outline-none mt-1 focus:border-white/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] text-slate-400">Voting options:</label>
                {pollOptions.map((opt, i) => (
                  <input
                    key={i}
                    type="text"
                    placeholder={`Option #${i + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const copy = [...pollOptions];
                      copy[i] = e.target.value;
                      setPollOptions(copy);
                    }}
                    className="w-full bg-[#151820] border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-white/20"
                  />
                ))}
                <button
                  onClick={() => setPollOptions([...pollOptions, ''])}
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                >
                  + Add option
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPollModal(false)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePoll}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-medium transition-colors"
              >
                Broadcast poll
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
