import React from 'react';
import {
  UserCheck,
  Clock,
  Globe,
  Briefcase,
  MessageSquare,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#101217] border border-white/5 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#151820] text-slate-400 border border-white/5">
            <UserCheck size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">Cast & team directory</h2>
            <p className="text-xs text-slate-400 mt-0.5">Cast and crew roster, studio titles, working hours, and messaging</p>
          </div>
        </div>
      </div>

      {/* Team Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.team_members.map((member) => {
          const linkedChar = state.characters.find((c) => c.id === member.linked_character_id);

          return (
            <div
              key={member.id}
              className="bg-[#101217] rounded-xl overflow-hidden border border-white/5 hover:border-white/15 transition-colors flex flex-col justify-between"
            >
              {/* Top Banner Artwork */}
              <div className="h-24 relative overflow-hidden bg-[#151820]">
                {member.banner_url && (
                  <img src={member.banner_url} alt="Banner" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#101217] to-transparent" />
                <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-mono text-slate-300 bg-black/75 border border-white/10 backdrop-blur-sm">
                  {member.role_tier}
                </span>
              </div>

              {/* Profile Body */}
              <div className="px-4 pb-4 -mt-7 relative z-10 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-end justify-between mb-2">
                    <img
                      src={member.avatar_url}
                      alt={member.name}
                      className="w-14 h-14 rounded-xl object-cover border border-white/15 shadow-md"
                    />
                    <div className="text-right">
                      <span className="text-sm" title="Availability status">
                        {member.availability_status_emoji}
                      </span>
                      <p className="text-[10px] text-emerald-400 font-mono mt-0.5">Active</p>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-white tracking-tight">{member.name}</h3>
                  <p className="text-xs text-slate-400 font-medium">{member.studio_title}</p>
                  <p className="text-[11px] text-slate-300 leading-relaxed mt-2 line-clamp-3">{member.bio}</p>

                  {/* Availability status line */}
                  <div className="p-2 rounded-lg bg-[#0a0b0e] border border-white/5 mt-3 flex items-center gap-2 text-[11px]">
                    <span>{member.availability_status_emoji}</span>
                    <span className="text-slate-300 truncate">{member.availability_status}</span>
                  </div>

                  {/* Skills tags */}
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {member.skill_tags.map((st, i) => (
                      <span
                        key={i}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5"
                      >
                        {st}
                      </span>
                    ))}
                  </div>

                  {/* Linked Character Dossier */}
                  {linkedChar && (
                    <div className="mt-3 p-2 rounded-lg bg-[#0a0b0e] border border-white/5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <img
                          src={linkedChar.avatar_url}
                          alt={linkedChar.name}
                          className="w-5 h-5 rounded-full object-cover border border-white/10"
                        />
                        <span className="text-[11px] text-slate-300">Portrays: <strong className="text-white">{linkedChar.name}</strong></span>
                      </div>
                      {onNavigateToCharacter && (
                        <button
                          onClick={() => onNavigateToCharacter(linkedChar.id)}
                          className="text-[10px] text-amber-400 hover:text-amber-300 transition-colors"
                        >
                          Dossier →
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Meta & 1-Click DM */}
                <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px]">
                  <div className="space-y-0.5 text-slate-500 font-mono text-[10px]">
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-medium text-xs transition-colors"
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
