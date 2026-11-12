import React from 'react';
import {
  UserCheck,
  Clock,
  Globe,
  Briefcase,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { TeamMember, StudioDatabaseState } from '../types';

interface TeamProfilesProps {
  state: StudioDatabaseState;
  onNavigateToChat?: (memberId: string) => void;
  onNavigateToCharacter?: (charId: string) => void;
}

export const TeamProfiles: React.FC<TeamProfilesProps> = ({
  state,
  onNavigateToChat,
  onNavigateToCharacter,
}) => {
  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f1117] border border-[#1e2330] p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <UserCheck size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Team Directory & Cast Profiles</h2>
            <p className="text-xs text-slate-400">Cast and crew roster, studio titles, working hours, availability status & 1-click chat jumps</p>
          </div>
        </div>
      </div>

      {/* Team Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {state.team_members.map((member) => {
          const linkedChar = state.characters.find((c) => c.id === member.linked_character_id);

          return (
            <div
              key={member.id}
              className="studio-card overflow-hidden border border-[#1e2330] hover:border-[#2e374d] transition-all flex flex-col justify-between"
            >
              {/* Top Banner Artwork */}
              <div className="h-28 relative overflow-hidden bg-[#161922]">
                {member.banner_url && (
                  <img src={member.banner_url} alt="Banner" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f1117] to-transparent" />
                <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-black/80 text-amber-400 border border-amber-500/30 backdrop-blur-sm">
                  {member.role_tier}
                </span>
              </div>

              {/* Profile Body */}
              <div className="px-5 pb-5 -mt-8 relative z-10 space-y-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-end justify-between mb-2">
                    <img
                      src={member.avatar_url}
                      alt={member.name}
                      className="w-16 h-16 rounded-xl object-cover border-2 border-amber-500/40 shadow-lg"
                    />
                    <div className="text-right">
                      <span className="text-base" title="Availability Status">
                        {member.availability_status_emoji}
                      </span>
                      <p className="text-[10px] text-emerald-400 font-medium">Active Studio</p>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white tracking-tight">{member.name}</h3>
                  <p className="text-xs font-semibold text-amber-400">{member.studio_title}</p>
                  <p className="text-[11px] text-slate-300 leading-relaxed mt-2 line-clamp-3">{member.bio}</p>

                  {/* Availability status line */}
                  <div className="p-2 rounded-lg bg-[#0b0d13] border border-[#1e2330] mt-3 flex items-center gap-2 text-[11px]">
                    <span>{member.availability_status_emoji}</span>
                    <span className="text-slate-300 truncate">{member.availability_status}</span>
                  </div>

                  {/* Skills tags */}
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {member.skill_tags.map((st, i) => (
                      <span
                        key={i}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-[#161922] text-slate-400 border border-[#2a3144]"
                      >
                        {st}
                      </span>
                    ))}
                  </div>

                  {/* Linked Character Dossier */}
                  {linkedChar && (
                    <div className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <img
                          src={linkedChar.avatar_url}
                          alt={linkedChar.name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                        <span className="text-[11px] text-amber-300">Portrays: <strong>{linkedChar.name}</strong></span>
                      </div>
                      {onNavigateToCharacter && (
                        <button
                          onClick={() => onNavigateToCharacter(linkedChar.id)}
                          className="text-[10px] text-amber-400 hover:underline"
                        >
                          Dossier →
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Meta & 1-Click DM */}
                <div className="pt-3 border-t border-[#1e2330] flex items-center justify-between text-[11px]">
                  <div className="space-y-0.5 text-slate-500">
                    <p className="flex items-center gap-1">
                      <Clock size={11} />
                      <span>{member.working_hours}</span>
                    </p>
                    <p className="flex items-center gap-1">
                      <Globe size={11} />
                      <span>{member.timezone.split(' ')[0]}</span>
                    </p>
                  </div>

                  {onNavigateToChat && (
                    <button
                      onClick={() => onNavigateToChat(member.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs transition-colors"
                    >
                      <MessageSquare size={13} />
                      <span>Message</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
