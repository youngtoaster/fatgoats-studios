import React, { useState } from 'react';
import {
  BookMarked,
  Plus,
  Tag,
  Paperclip,
  FolderArchive,
  Trash2,
  Edit3,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { LoreArticle, LorePropertyCard, StudioDatabaseState } from '../types';

interface LoreWikiProps {
  state: StudioDatabaseState;
  onSaveArticle: (article: LoreArticle) => void;
  onDeleteArticle: (articleId: string) => void;
  onCreateArticle: () => void;
}

export const LoreWiki: React.FC<LoreWikiProps> = ({
  state,
  onSaveArticle,
  onDeleteArticle,
  onCreateArticle,
}) => {
  const [selectedArticleId, setSelectedArticleId] = useState<string>(state.lore_articles[0]?.id || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);

  // Property card addition state
  const [newPropKey, setNewPropKey] = useState('');
  const [newPropVal, setNewPropVal] = useState('');

  const categories = ['all', 'Faction', 'Location', 'Technology', 'Magic & Rules', 'History & Timeline', 'Cosmology'];

  const selectedArticle = state.lore_articles.find((a) => a.id === selectedArticleId) || state.lore_articles[0];

  const filteredArticles = state.lore_articles.filter((a) => {
    if (selectedCategory !== 'all' && a.category !== selectedCategory) return false;
    return true;
  });

  const addPropertyCard = () => {
    if (!newPropKey.trim() || !newPropVal.trim() || !selectedArticle) return;
    const newCard: LorePropertyCard = { key: newPropKey.trim(), value: newPropVal.trim() };
    const updated = {
      ...selectedArticle,
      property_cards: [...(selectedArticle.property_cards || []), newCard],
    };
    onSaveArticle(updated);
    setNewPropKey('');
    setNewPropVal('');
  };

  const removePropertyCard = (index: number) => {
    if (!selectedArticle) return;
    const updatedCards = [...selectedArticle.property_cards];
    updatedCards.splice(index, 1);
    onSaveArticle({ ...selectedArticle, property_cards: updatedCards });
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f1117] border border-[#1e2330] p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <BookMarked size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Lore & Worldbuilding Bible</h2>
            <p className="text-xs text-slate-400">Franchise encyclopedia, faction accords, technology cards & asset vault integrations</p>
          </div>
        </div>

        <button
          onClick={onCreateArticle}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs"
        >
          <Plus size={14} />
          <span>New Lore Article</span>
        </button>
      </div>

      {/* Main Grid: Lore Articles Navigator & Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Column: Category Filter & Article List */}
        <div className="studio-card p-4 lg:col-span-1 space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Lore Categories</p>
            <div className="space-y-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium capitalize flex items-center justify-between ${
                    selectedCategory === cat ? 'bg-amber-500 text-black font-semibold' : 'text-slate-300 hover:bg-[#161922]'
                  }`}
                >
                  <span>{cat === 'all' ? 'All Franchise Lore' : cat}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-[#1e2330] space-y-1 max-h-[450px] overflow-y-auto">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Wiki Articles</p>
            {filteredArticles.map((art) => (
              <button
                key={art.id}
                onClick={() => setSelectedArticleId(art.id)}
                className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center gap-2 border ${
                  art.id === selectedArticle?.id
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold'
                    : 'border-transparent text-slate-300 hover:bg-[#161922]'
                }`}
              >
                <span className="text-base">{art.emoji_icon}</span>
                <span className="truncate">{art.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Active Lore Article Viewer & Properties */}
        <div className="studio-card p-6 lg:col-span-3 space-y-5">
          {selectedArticle ? (
            <div>
              {/* Cover Banner if available */}
              {selectedArticle.cover_image_url && (
                <div className="h-40 rounded-xl overflow-hidden mb-5 border border-[#2a3144] relative">
                  <img src={selectedArticle.cover_image_url} alt={selectedArticle.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f1117] via-transparent to-transparent" />
                </div>
              )}

              {/* Title & Category Header */}
              <div className="flex items-start justify-between pb-4 border-b border-[#1e2330]">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedArticle.emoji_icon}</span>
                  <div>
                    <h3 className="text-xl font-extrabold text-white tracking-tight">{selectedArticle.title}</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase font-bold mt-1 inline-block">
                      {selectedArticle.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161922] hover:bg-[#202534] border border-[#2a3144] text-xs font-semibold text-slate-200"
                  >
                    <Edit3 size={13} className="text-amber-400" />
                    <span>{isEditing ? 'View Page' : 'Edit Lore'}</span>
                  </button>
                  <button
                    onClick={() => onDeleteArticle(selectedArticle.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400"
                    title="Delete Article"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Structured Key-Value Property Cards */}
              <div className="my-5 p-4 rounded-xl bg-[#0b0d13] border border-[#1e2330] space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#1e2330]">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Structured Dossier Properties
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Series Bible Metadata</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {selectedArticle.property_cards?.map((prop, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-[#161922] border border-[#2a3144] relative group">
                      <p className="text-[10px] uppercase font-bold text-slate-400">{prop.key}</p>
                      <p className="text-xs font-semibold text-amber-400 mt-0.5 truncate">{prop.value}</p>
                      {isEditing && (
                        <button
                          onClick={() => removePropertyCard(idx)}
                          className="absolute top-1 right-1 text-slate-500 hover:text-red-400"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {isEditing && (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Property Key (e.g. Origin)..."
                      value={newPropKey}
                      onChange={(e) => setNewPropKey(e.target.value)}
                      className="bg-[#161922] border border-[#2a3144] rounded px-2 py-1 text-xs text-white outline-none w-36"
                    />
                    <input
                      type="text"
                      placeholder="Property Value (e.g. Mars Colony)..."
                      value={newPropVal}
                      onChange={(e) => setNewPropVal(e.target.value)}
                      className="bg-[#161922] border border-[#2a3144] rounded px-2 py-1 text-xs text-white outline-none w-48"
                    />
                    <button
                      onClick={addPropertyCard}
                      className="px-2.5 py-1 rounded bg-amber-500 text-black font-bold text-xs"
                    >
                      Add Card
                    </button>
                  </div>
                )}
              </div>

              {/* Lore Body Markdown Content */}
              {isEditing ? (
                <textarea
                  value={selectedArticle.content_markdown}
                  onChange={(e) => onSaveArticle({ ...selectedArticle, content_markdown: e.target.value })}
                  className="w-full h-80 bg-[#0b0d13] border border-[#1e2330] rounded-xl p-4 font-mono text-xs text-slate-200 outline-none focus:border-amber-500/50 resize-y leading-relaxed"
                />
              ) : (
                <div className="p-6 bg-[#0b0d13] border border-[#1e2330] rounded-xl prose prose-invert max-w-none text-xs text-slate-200 leading-relaxed space-y-3">
                  <p className="font-semibold text-slate-300 text-sm border-l-2 border-amber-500 pl-3">
                    {selectedArticle.summary}
                  </p>
                  <div className="whitespace-pre-wrap">{selectedArticle.content_markdown}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500 text-xs">No lore article selected.</div>
          )}
        </div>
      </div>
    </div>
  );
};
