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
  Sparkles,
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
    { id: 'writers-room', name: '#writers-room', desc: 'Screenplay drafting, dialogue polish & table reads' },
    { id: 'animation', name: '#animation-vfx', desc: '3D assets, lighting passes & visual animatics' },
    { id: 'sound', name: '#sound-foley', desc: 'Soundboard drops, music cues & voice takes' },
    { id: 'general', name: '#general-studio', desc: 'All-studio announcements & milestone updates' },
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f1117] border border-[#1e2330] p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <MessageSquare size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Team Communication Hub</h2>
            <p className="text-xs text-slate-400">Real-time studio chat, live WebSocket messaging, screenplay snippets & voice notes</p>
          </div>
        </div>

        <button
          onClick={() => setShowPollModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161922] hover:bg-[#202534] border border-[#2a3144] text-xs font-semibold text-slate-200"
        >
          <BarChart2 size={13} className="text-amber-400" />
          <span>Launch Team Poll</span>
        </button>
      </div>

      {/* Main Chat Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Column: Channels & Direct Messages */}
        <div className="studio-card p-4 lg:col-span-1 space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Department Channels</p>
            <div className="space-y-1">
              {channels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannel(ch.id)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold transition-colors flex flex-col ${
                    activeChannel === ch.id
                      ? 'bg-amber-500 text-black shadow-sm'
                      : 'text-slate-300 hover:bg-[#161922]'
                  }`}
                >
                  <span>{ch.name}</span>
                  <span className={`text-[10px] font-normal truncate mt-0.5 ${activeChannel === ch.id ? 'text-black/75' : 'text-slate-500'}`}>
                    {ch.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Crew Members</p>
            <div className="space-y-1.5">
              {state.team_members.map((member) => (
                <div key={member.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-[#161922] text-xs">
                  <span className="text-base">{member.availability_status_emoji}</span>
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
        <div className="studio-card p-5 lg:col-span-3 flex flex-col justify-between h-[650px]">
          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {channelMessages.map((msg) => {
              const isMe = msg.sender_id === currentUser.id;
              return (
                <div key={msg.id} className="flex items-start gap-3 group">
                  <img
                    src={msg.sender_avatar}
                    alt={msg.sender_name}
                    className="w-8 h-8 rounded-full object-cover border border-[#2a3144] mt-0.5"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{msg.sender_name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.is_starred && <Star size={11} className="text-amber-400 fill-amber-400" />}
                    </div>

                    {/* Standard Text Message */}
                    {msg.message_type === 'text' && (
                      <p className="text-xs text-slate-200 leading-relaxed bg-[#0b0d13] p-3 rounded-xl border border-[#1e2330] inline-block max-w-xl">
                        {msg.content}
                      </p>
                    )}

                    {/* Voice Note Message */}
                    {msg.message_type === 'voice_note' && msg.voice_note_url && (
                      <div className="p-3 rounded-xl bg-[#0b0d13] border border-amber-500/30 flex items-center gap-3 inline-flex">
                        <Volume2 size={16} className="text-amber-400" />
                        <audio src={msg.voice_note_url} controls className="h-7 w-52" />
                      </div>
                    )}

                    {/* Screenplay Snippet Message */}
                    {msg.message_type === 'script_snippet' && msg.script_snippet_data && (
                      <div className="p-4 rounded-xl bg-[#0b0d13] border border-amber-500/30 max-w-xl space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-mono text-amber-400 border-b border-[#1e2330] pb-1.5">
                          <span className="font-bold flex items-center gap-1.5">
                            <FileText size={13} />
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
                      <div className="p-4 rounded-xl bg-[#0b0d13] border border-[#2a3144] max-w-md space-y-3">
                        <div className="flex items-center gap-2">
                          <BarChart2 size={15} className="text-amber-400" />
                          <h4 className="text-xs font-bold text-white">{msg.poll_data.question}</h4>
                        </div>
                        <div className="space-y-2">
                          {msg.poll_data.options.map((opt) => {
                            const totalVotes = msg.poll_data!.options.reduce((acc, o) => acc + o.votes.length, 0);
                            const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                            const hasMyVote = opt.votes.includes(currentUser.id);

                            return (
                              <button
                                key={opt.id}
                                onClick={() => handleVotePoll(msg, opt.id)}
                                className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all relative overflow-hidden ${
                                  hasMyVote
                                    ? 'border-amber-500/50 bg-amber-500/10'
                                    : 'border-[#1e2330] bg-[#161922] hover:border-[#2a3144]'
                                }`}
                              >
                                <div
                                  className="absolute top-0 bottom-0 left-0 bg-amber-500/20 transition-all duration-300"
                                  style={{ width: `${pct}%` }}
                                />
                                <div className="relative flex items-center justify-between z-10">
                                  <span className="font-medium text-slate-200">{opt.text}</span>
                                  <span className="font-mono text-[11px] font-bold text-amber-400">
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
                      <div className="p-3 rounded-xl bg-[#0b0d13] border border-amber-500/30 flex items-center gap-3 inline-flex">
                        <Radio size={16} className="text-amber-400" />
                        <div>
                          <p className="text-xs font-bold text-white">{msg.soundboard_clip_data.title}</p>
                          <p className="text-[10px] text-amber-400 font-mono">{msg.soundboard_clip_data.category} Audio Drop</p>
                        </div>
                        <audio src={msg.soundboard_clip_data.audioUrl} controls className="h-7 w-48 ml-2" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chat Input Bar */}
          <div className="pt-3 border-t border-[#1e2330]">
            <div className="flex items-center gap-2 bg-[#0b0d13] border border-[#2a3144] focus-within:border-amber-500/60 rounded-xl px-3 py-2">
              <input
                type="text"
                placeholder={`Dispatch message to #${activeChannel}...`}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 outline-none"
              />

              {isRecordingVoice ? (
                <button
                  onClick={stopRecordingVoiceNote}
                  className="p-1.5 rounded-lg bg-red-500 text-white animate-pulse"
                  title="Stop and Send Voice Note"
                >
                  <Square size={14} />
                </button>
              ) : (
                <button
                  onClick={startRecordingVoiceNote}
                  className="p-1.5 text-slate-400 hover:text-amber-400"
                  title="Record Voice Note"
                >
                  <Mic size={15} />
                </button>
              )}

              <button
                onClick={handleSendMessage}
                disabled={!messageInput.trim()}
                className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-black font-semibold transition-colors"
                title="Send Message"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Launch Team Poll Modal */}
      {showPollModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0f1117] border border-[#2a3144] rounded-xl p-5 max-w-md w-full space-y-4">
            <h3 className="text-sm font-bold text-white">Create Interactive Team Decision Poll</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400">Poll Question:</label>
                <input
                  type="text"
                  placeholder="e.g. Should Vance sacrifice the relay array in Ep 3?"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  className="w-full bg-[#161922] border border-[#2a3144] rounded-lg p-2 text-xs text-white outline-none mt-1"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] text-slate-400">Voting Options:</label>
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
                    className="w-full bg-[#161922] border border-[#2a3144] rounded-lg p-2 text-xs text-white outline-none"
                  />
                ))}
                <button
                  onClick={() => setPollOptions([...pollOptions, ''])}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
                >
                  + Add Option
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPollModal(false)}
                className="px-3 py-1.5 rounded-lg bg-[#161922] text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePoll}
                className="px-4 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold"
              >
                Broadcast Poll
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
